/**
 * chatService.ts
 * 
 * Orchestration layer that ties AI, Memory, and the Action Engine together.
 * This is the single entry point called by the useChat hook.
 */

import { format } from 'date-fns';
import { addDoc, collection, doc, setDoc, getDoc, serverTimestamp, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendToGemini, AIResponse, AIAction, ChatMessage, UserContext } from './aiService';
import { getMemory, updateMemory } from './memoryService';
import { adjustPlan } from './adjustmentEngine';

// --- Types ---

export interface ProcessedResult {
  aiMessage: ChatMessage;
  actionStatus?: string; // Human-readable confirmation string
}

// --- Main Entry Point ---

/**
 * Processes a user message end-to-end:
 * 1. Loads user memory
 * 2. Builds context
 * 3. Calls Gemini AI
 * 4. Executes any returned action
 * 5. Saves any memory updates
 * 6. Returns the AI message for display
 */
export async function processMessage(
  userMessage: string,
  userData: {
    userId: string;
    goal: string;
    weight: number;
    dailyCalories: number;
    consumedCalories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
    exerciseMinutes: number;
    onboarding?: any;
    todayLogs?: any[];
    weeklySummary?: any[];
  },
  chatHistory: ChatMessage[],
  imageBase64?: string
): Promise<ProcessedResult> {
  // 1. Load user memory
  const memory = await getMemory();

  // 2. Build context object
  const context: UserContext = {
    goal: userData.goal,
    weight: userData.weight,
    dailyCalories: userData.dailyCalories,
    consumedCalories: userData.consumedCalories,
    protein: userData.protein,
    carbs: userData.carbs,
    fats: userData.fats,
    water: userData.water,
    exerciseMinutes: userData.exerciseMinutes,
    memory,
    recentMessages: chatHistory.slice(-5),
    onboarding: userData.onboarding,
    todayLogs: userData.todayLogs,
    weeklySummary: userData.weeklySummary,
  };

  // 3. Call Gemini
  const aiResponse = await sendToGemini(userMessage, context, imageBase64);

  // 4. Execute actions if present
  let actionStatus: string | undefined;
  if (aiResponse.actions && aiResponse.actions.length > 0) {
    const statusResults = await Promise.all(
      aiResponse.actions.map((action) => executeAction(action, userData.userId))
    );
    // Filter out empty strings and join with a clear separator
    actionStatus = statusResults.filter(Boolean).join(' | ');
  }

  // 5. Save memory update if present
  if (aiResponse.memory_update) {
    await updateMemory(aiResponse.memory_update);
    if (!actionStatus) {
      actionStatus = '🧠 Preferences saved';
    }
  }

  // 6. Build and return the AI chat message
  const aiMessage: ChatMessage = {
    role: 'ai',
    content: aiResponse.response,
    timestamp: Date.now(),
    actionStatus,
    quickActions: aiResponse.quick_actions?.map((qa) => ({
      label: qa.label,
      message: qa.message,
    })),
  };

  return { aiMessage, actionStatus };
}

// --- Action Engine ---

/**
 * Executes an AI-returned action against the app's data layer.
 * Returns a human-readable status string for the UI.
 */
async function executeAction(action: AIAction, userId: string): Promise<string> {
  console.log('[ChatService] Executing action:', action.type, action.data);

  try {
    switch (action.type) {
      case 'update_calories': {
        const { value, adjustment, reason } = action.data;

        // Fetch current baseline macros
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const profile = userSnap.exists() ? userSnap.data()?.profile : null;

        if (!profile || !profile.macros) {
          return '⚠️ Adjustment failed: Baseline plan not found.';
        }

        let nextMacros;
        let deltaStr = '';

        if (typeof adjustment === 'number') {
          // Perform relative adjustment via engine
          nextMacros = adjustPlan(profile.macros, {
            type: 'manual',
            value: adjustment,
          });
          deltaStr = `${adjustment > 0 ? '+' : ''}${adjustment} kcal`;
        } else if (typeof value === 'number') {
          // Direct absolute update (legacy fallback)
          nextMacros = { ...profile.macros, dailyCalories: value };
          deltaStr = `set to ${value} kcal`;
        }

        if (!nextMacros) return '⚠️ Invalid update parameters';

        // Persist the full updated macro object
        await setDoc(
          userRef,
          { profile: { macros: nextMacros } },
          { merge: true },
        );

        const reasonStr = reason ? ` (${reason})` : '';
        return `✅ Target ${deltaStr}${reasonStr}. New goal: ${nextMacros.dailyCalories} kcal`;
      }

      case 'update_goal': {
        const goal = action.data.goal;
        if (!goal || typeof goal !== 'string') {
          return '⚠️ Invalid goal value';
        }

        const userRef = doc(db, 'users', userId);
        await setDoc(
          userRef,
          { profile: { goal } },
          { merge: true },
        );

        return `✅ Goal updated to "${goal}"`;
      }

      case 'log_food': {
        const { name, serving } = action.data;
        const calories = Number(action.data.calories);
        const protein = Number(action.data.protein || 0);
        const carbs = Number(action.data.carbs || 0);
        const fat = Number(action.data.fat || 0);

        if (!name || isNaN(calories)) {
          return '⚠️ Invalid food data';
        }

        const logData = {
          userId,
          type: 'food',
          name: name || 'AI Logged Food',
          brand: '',
          serving: serving || '1 serving',
          calories: calories || 0,
          protein: protein || 0,
          carbs: carbs || 0,
          fat: fat || 0,
          timestamp: serverTimestamp(),
          date: action.data.target_date || format(new Date(), 'yyyy-MM-dd'),
        };

        await addDoc(collection(db, 'logs'), logData);
        return `✅ "${name}" logged (${calories} kcal)${action.data.target_date ? ` for ${action.data.target_date}` : ''}`;
      }

      case 'log_water': {
        const waterLiters = Number(action.data.waterLiters);
        if (isNaN(waterLiters) || waterLiters <= 0) {
          return '⚠️ Invalid water amount';
        }

        const logData = {
          userId,
          type: 'water',
          waterLiters,
          timestamp: serverTimestamp(),
          date: action.data.target_date || format(new Date(), 'yyyy-MM-dd'),
        };

        await addDoc(collection(db, 'logs'), logData);
        return `💧 ${Math.round(waterLiters * 1000)}ml water logged`;
      }

      case 'log_exercise': {
        const { name } = action.data;
        const duration = Number(action.data.duration);
        const calories = Number(action.data.calories || 0);
        const intensity = action.data.intensity || 'Medium';

        if (!name || isNaN(duration)) {
          return '⚠️ Invalid exercise data';
        }

        const logData = {
          userId,
          type: 'exercise',
          name,
          duration,
          intensity,
          calories: calories || 0,
          timestamp: serverTimestamp(),
          date: action.data.target_date || format(new Date(), 'yyyy-MM-dd'),
        };

        await addDoc(collection(db, 'logs'), logData);
        return `✅ ${name} logged (${duration} mins)`;
      }

      case 'generate_plan': {
        // Plan generation is informational — the response text IS the plan
        // No Firestore write needed
        return '📋 Plan generated';
      }

      case 'store_memory': {
        // Memory storage is handled separately via memory_update field
        return '🧠 Preferences saved';
      }

      case 'undo_log': {
        const q = query(collection(db, 'logs'), where('userId', '==', userId));
        const snap = await getDocs(q);
        if (snap.empty) {
          return '⚠️ No recent logs found to undo.';
        }
        
        // Sort securely in memory to avoid composite index requirements
        // timestamp might be a Firestore ServerTimestamp, so we check if it exists safely
        const docs = snap.docs.sort((a, b) => {
          const tA = a.data().timestamp?.toMillis?.() || 0;
          const tB = b.data().timestamp?.toMillis?.() || 0;
          return tB - tA;
        });
        
        const latestDoc = docs[0];
        const data = latestDoc.data();
        
        await deleteDoc(doc(db, 'logs', latestDoc.id));
        
        const itemName = data.name || (data.type === 'water' ? `${data.waterLiters}L water` : 'Activity');
        return `⏪ Undid log: ${itemName}`;
      }

      default:
        console.warn('[ChatService] Unknown action type:', action.type);
        return '';
    }
  } catch (error) {
    console.error('[ChatService] Action execution failed:', error);
    return `⚠️ Action failed: ${action.type}`;
  }
}
