/**
 * chatService.ts
 * 
 * Orchestration layer that ties AI, Memory, and the Action Engine together.
 * This is the single entry point called by the useChat hook.
 */

import { format } from 'date-fns';
import { addDoc, collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendToGemini, sendToGeminiStreaming, AIResponse, AIAction, ChatMessage, UserContext } from './aiService';
import { getMemory, updateMemory } from './memoryService';
import { adjustPlan } from './adjustmentEngine';

// --- Types ---

export interface ProcessedResult {
  aiMessage: ChatMessage;
  actionStatus?: string; 
  actionMetadata?: {
    id?: string;
    type?: string;
    status: string;
    data?: any;
  }[];
}

interface ActionExecutionResult {
  status: string;
  id?: string;
  type?: string;
  data?: any;
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
  imageBase64?: string,
  intelligenceMode: 'lightning' | 'pro' = 'lightning'
): Promise<ProcessedResult> {
  // 1. Load user memory
  const memory = await getMemory(userData.userId);

  // 2. Build context object
  const context: UserContext = {
    userId: userData.userId,
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
    recentMessages: (chatHistory || []).slice(-5),
    onboarding: userData.onboarding,
    todayLogs: userData.todayLogs,
    weeklySummary: userData.weeklySummary,
  };

  // 3. Call Gemini
  let aiResponse = await sendToGemini(userMessage, context, imageBase64, intelligenceMode);

  // 3b. Agentic Search Hook (Non-Streaming Sync)
  const searchAction = aiResponse.actions?.find(a => a.type === 'search_food');
  if (searchAction) {
    try {
      const { searchFoods } = await import('../lib/fatsecret');
      const results = await searchFoods(searchAction.data.query);
      const searchContext = results.length > 0 
        ? `SEARCH RESULTS: ${JSON.stringify(results)}`
        : `No exact matches found for "${searchAction.data.query}".`;

      aiResponse = await sendToGemini(
        `${userMessage}\n\n[SYSTEM DATA]: ${searchContext}`, 
        context, 
        imageBase64, 
        intelligenceMode
      );
    } catch (err) {
      console.error('[ChatService] Sync search failed:', err);
    }
  }

  // 4. Execute actions if present
  let actionStatus: string | undefined;
  const actionMetadata: any[] = [];
  if (aiResponse.actions && aiResponse.actions.length > 0) {
    const visibleActions = aiResponse.actions.filter(a => a.type !== 'search_food');
    const results = await Promise.all(
      visibleActions.map((action) => executeAction(action, userData.userId))
    );
    actionStatus = results.map(r => r.status).filter(Boolean).join(' | ');
    results.forEach(r => {
      if (r.id) actionMetadata.push({ id: r.id, type: r.type, status: r.status, data: r.data });
    });
  }

  // 5. Save memory update if present
  if (aiResponse.memory_update) {
    await updateMemory(userData.userId, aiResponse.memory_update);
    if (!actionStatus) actionStatus = '🧠 Preferences saved';
  }

  // 6. Build and return the AI message
  const aiMessage: ChatMessage = {
    id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'ai',
    content: aiResponse.response,
    timestamp: Date.now(),
    actionStatus: actionStatus || null,
    actionMetadata: actionMetadata.length > 0 ? actionMetadata : null,
    quickActions: aiResponse.quick_actions?.map((qa) => ({
      label: qa.label,
      message: qa.message,
    })) || null,
  };

  return { aiMessage, actionStatus, actionMetadata };
}

/**
 * Streaming version of processMessage.
 * yieldText is called with partial response text as it arrives.
 */
export async function processMessageStreaming(
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
  yieldText: (text: string) => void,
  imageBase64?: string,
  intelligenceMode: 'lightning' | 'pro' = 'lightning'
): Promise<ProcessedResult> {
  const memory = await getMemory(userData.userId);

  const context: UserContext = {
    userId: userData.userId,
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
    recentMessages: (chatHistory || []).slice(-15),
    onboarding: userData.onboarding,
    todayLogs: userData.todayLogs,
    weeklySummary: userData.weeklySummary,
    historicalLogs: (userData as any).historicalLogs,
  };

  // 1. Initial AI Call
  let aiResponse = await sendToGeminiStreaming(
    userMessage, 
    context, 
    yieldText, 
    imageBase64, 
    intelligenceMode
  );

  // 2. Check for Agentic Search Action
  const searchAction = aiResponse.actions?.find(a => a.type === 'search_food');
  const isSearchLoop = userMessage.includes('[SYSTEM DATA]: SEARCH RESULTS');

  if (searchAction && !isSearchLoop) {
    const queryStr = searchAction.data.query;
    yieldText('\n\n*Searching nutrition database...* 🔍');
    
    try {
      const { searchFoods } = await import('../lib/fatsecret');
      const results = await searchFoods(queryStr);
      
      const searchContext = results.length > 0 
        ? `SEARCH RESULTS for "${queryStr}":\n${results.map(r => 
            `- ${r.food_name} (${r.brand_name || 'Generic'}): ${r.calories} kcal, ${r.protein}g P, ${r.carbs}g C, ${r.fat}g F (${r.serving})`
          ).join('\n')}\n\nINSTRUCTION: Now give the user a helpful response based on these real facts. Format as a table if appropriate.`
        : `SEARCH RESULTS for "${queryStr}": No exact matches found. Inform the user and provide your best estimate based on generic data.`;

      // Recursive call with search data injected as a system correction
      aiResponse = await sendToGeminiStreaming(
        `${userMessage}\n\n[SYSTEM DATA]: ${searchContext}`, 
        context, 
        yieldText, 
        imageBase64, 
        intelligenceMode
      );
    } catch (err) {
      console.error('[ChatService] Search failed:', err);
    }
  }

  // 3. Execute actions (same as standard)
  let actionStatus: string | undefined;
  const actionMetadata: any[] = [];
  
  if (aiResponse.actions && aiResponse.actions.length > 0) {
    // Filter out the internal 'search_food' from final metadata display
    const visibleActions = aiResponse.actions.filter(a => a.type !== 'search_food');
    
    const results = await Promise.all(
      visibleActions.map((action) => executeAction(action, userData.userId))
    );
    
    actionStatus = results.map(r => r.status).filter(Boolean).join(' | ');
    results.forEach(r => {
      if (r.id) actionMetadata.push({ id: r.id, type: r.type, status: r.status, data: r.data });
    });
  }

  if (aiResponse.memory_update) {
    await updateMemory(userData.userId, aiResponse.memory_update);
    if (!actionStatus) actionStatus = '🧠 Preferences saved';
  }

  const aiMessage: ChatMessage = {
    id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'ai',
    content: aiResponse.response,
    timestamp: Date.now(),
    actionStatus: actionStatus || null,
    actionMetadata: actionMetadata && actionMetadata.length > 0 ? actionMetadata : null,
    quickActions: aiResponse.quick_actions?.map((qa) => ({
      label: qa.label,
      message: qa.message,
    })) || null,
  };

  return { aiMessage, actionStatus, actionMetadata };
}

// --- Action Engine ---

/**
 * Executes an AI-returned action against the app's data layer.
 * Returns a human-readable status string for the UI.
 */
async function executeAction(action: AIAction, userId: string): Promise<ActionExecutionResult> {
  console.log('[ChatService] Executing action:', action.type, action.data);

  try {
    switch (action.type) {
      case 'update_calories': {
        const { value, adjustment, reason } = action.data;

        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        const profile = userData?.profile;

        if (!userData || !profile || !profile.macros) {
          return { status: '⚠️ Adjustment failed: Baseline plan not found.' };
        }
        
        const oldCalories = userData.dailyCalories || 2000;
        const oldMacros = { ...profile.macros };

        let calorieChange = 0;
        let deltaStr = '';
        let nextMacros;

        if (typeof adjustment === 'number') {
          calorieChange = adjustment;
          deltaStr = `${adjustment > 0 ? '+' : ''}${adjustment} kcal`;
          nextMacros = adjustPlan(profile.macros, { type: 'manual', value: adjustment });
        } else if (typeof value === 'number') {
          calorieChange = value - oldCalories;
          deltaStr = `Set to ${value} kcal`;
          nextMacros = { ...profile.macros, dailyCalories: value };
        } else {
          return { status: '⚠️ Invalid calorie adjustment value' };
        }

        const newTargetCalories = typeof value === 'number' ? value : oldCalories + calorieChange;

        if (newTargetCalories < 1200) {
          return { status: '⚠️ Cannot lower daily calories below 1200 kcal for health safety.' };
        }

        await updateDoc(userRef, {
          dailyCalories: newTargetCalories,
          'profile.macros': nextMacros
        });

        // Log for UNDO
        const logRef = await addDoc(collection(db, 'logs'), {
          userId,
          type: 'profile_change',
          changeType: 'calories',
          oldValue: oldCalories,
          newValue: newTargetCalories,
          oldMacros,
          newMacros: nextMacros,
          timestamp: new Date(),
          date: format(new Date(), 'yyyy-MM-dd'),
          name: `Goal changed: ${deltaStr}`
        });

        const reasonStr = reason ? ` (${reason})` : '';
        return { 
          status: `✅ Target ${deltaStr}${reasonStr}`, 
          id: logRef.id, 
          type: 'profile_change' 
        };
      }

      case 'update_goal': {
        const goal = action.data.goal;
        if (!goal || typeof goal !== 'string') return { status: '⚠️ Invalid goal' };

        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const oldGoal = userSnap.data()?.profile?.goal || 'maintain';

        await setDoc(userRef, { profile: { goal } }, { merge: true });

        const logRef = await addDoc(collection(db, 'logs'), {
          userId,
          type: 'profile_change',
          changeType: 'goal',
          oldValue: oldGoal,
          newValue: goal,
          timestamp: new Date(),
          date: format(new Date(), 'yyyy-MM-dd'),
          name: `Goal updated to ${goal}`
        });

        return { status: `✅ Goal: ${goal}`, id: logRef.id, type: 'profile_change' };
      }

      case 'log_food': {
        const { name, serving } = action.data;
        const calories = Number(action.data.calories);
        if (!name || isNaN(calories)) return { status: '⚠️ Invalid food' };

        const logData = {
          userId,
          type: 'food',
          name,
          serving: serving || '1 serving',
          calories: calories || 0,
          protein: Number(action.data.protein || 0),
          carbs: Number(action.data.carbs || 0),
          fat: Number(action.data.fat || 0),
          timestamp: new Date(),
          date: action.data.target_date || format(new Date(), 'yyyy-MM-dd'),
        };

        const docRef = await addDoc(collection(db, 'logs'), logData);
        return { status: `✅ Logged: ${name}`, id: docRef.id, type: 'food', data: logData };
      }

      case 'log_water': {
        const waterLiters = Number(action.data.waterLiters);
        if (isNaN(waterLiters) || waterLiters <= 0) return { status: '⚠️ Invalid water' };

        const logData = {
          userId,
          type: 'water',
          waterLiters,
          timestamp: new Date(),
          date: action.data.target_date || format(new Date(), 'yyyy-MM-dd'),
        };

        const docRef = await addDoc(collection(db, 'logs'), logData);
        return { status: `💧 ${Math.round(waterLiters * 1000)}ml`, id: docRef.id, type: 'water' };
      }

      case 'log_exercise': {
        const { name } = action.data;
        const duration = Number(action.data.duration);
        if (!name || isNaN(duration)) return { status: '⚠️ Invalid exercise' };

        const logData = {
          userId,
          type: 'exercise',
          name,
          duration,
          intensity: action.data.intensity || 'Medium',
          calories: Number(action.data.calories || 0),
          timestamp: new Date(),
          date: action.data.target_date || format(new Date(), 'yyyy-MM-dd'),
        };

        const docRef = await addDoc(collection(db, 'logs'), logData);
        return { status: `✅ Logged: ${name}`, id: docRef.id, type: 'exercise' };
      }

      case 'generate_plan': {
        return { status: '📋 Plan generated' };
      }

      case 'store_memory': {
        return { status: '🧠 Preferences saved' };
      }

      case 'undo_log': {
        const { type: filterType, name: filterName } = action.data;
        
        // Fetch recent logs to find the best match
        let q = query(
          collection(db, 'logs'), 
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(30)
        );

        if (filterType) {
          q = query(q, where('type', '==', filterType));
        }

        const snap = await getDocs(q);
        if (snap.empty) {
          return { status: `⚠️ No recent ${filterType || 'activity'} logs found to undo.` };
        }
        
        // Sort securely in memory
        const docs = snap.docs.sort((a, b) => {
          const tA = a.data().timestamp?.toMillis?.() || 0;
          const tB = b.data().timestamp?.toMillis?.() || 0;
          return tB - tA;
        });

        let targetDoc = docs[0]; // Default to latest

        // If a name is provided, try to find the best match
        if (filterName) {
          const normalizedFilter = filterName.toLowerCase().trim();
          const match = docs.find(doc => {
            const name = (doc.data().name || '').toLowerCase();
            return name.includes(normalizedFilter) || normalizedFilter.includes(name);
          });
          
          if (match) {
            targetDoc = match;
          } else {
            console.warn(`[ChatService] Could not find specific log matching "${filterName}". Defaulting to latest log.`);
          }
        }
        
        const data = targetDoc.data();
        
        // Handle special case: Reverting a Profile Change
        if (data.type === 'profile_change') {
          const userRef = doc(db, 'users', userId);
          if (data.changeType === 'calories') {
            await updateDoc(userRef, {
              dailyCalories: data.oldValue,
              'profile.macros': data.oldMacros
            });
          } else if (data.changeType === 'goal') {
            await setDoc(userRef, { profile: { goal: data.oldValue } }, { merge: true });
          }
        }

        await deleteDoc(doc(db, 'logs', targetDoc.id));
        
        const itemName = data.name || (data.type === 'water' ? `${data.waterLiters}L water` : 'Activity');
        return { status: `⏪ Undid: ${itemName}` };
      }

      case 'search_food': {
        // Internal action, no status needed as it triggers agentic re-prompt
        return { status: '' };
      }

      default:
        console.warn('[ChatService] Unknown action type:', action.type);
        return { status: '' };
    }
  } catch (error) {
    console.error('[ChatService] Action execution failed:', error);
    return { status: `⚠️ Action failed: ${action.type}` };
  }
}
