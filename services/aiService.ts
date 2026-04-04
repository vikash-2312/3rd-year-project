/**
 * aiService.ts
 * 
 * Handles all communication with the Gemini LLM.
 * Builds context-aware prompts, sends requests with retry logic,
 * and safely parses structured JSON responses.
 */

import { UserMemory } from './memoryService';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  actionStatus?: string; // e.g. "✅ Calories updated to 3000"
  quickActions?: QuickAction[]; // Contextual follow-up buttons
  imageUri?: string; // UI render path
  imageBase64?: string; // API payload data (not saved in history)
}

export interface QuickAction {
  label: string;  // Display text, e.g. "Fix Protein 💪"
  message: string; // Message sent to chatbot when tapped
}

export interface AIAction {
  type: 'update_calories' | 'update_goal' | 'log_food' | 'log_water' | 'log_exercise' | 'generate_plan' | 'store_memory' | 'undo_log';
  data: Record<string, any>;
}

export interface AIResponse {
  intent: string;
  response: string;
  action?: AIAction;           // Legacy support
  actions?: AIAction[];        // New multi-action field
  memory_update?: Partial<UserMemory>;
  quick_actions?: { label: string; message: string }[];
}

export interface UserContext {
  goal: string;
  weight: number;
  dailyCalories: number;
  consumedCalories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  exerciseMinutes: number;
  memory: UserMemory;
  recentMessages: ChatMessage[];
  onboarding?: any; // Full profile object
  todayLogs?: any[]; // Full detailed logs for today
  weeklySummary?: any[]; // 7-day compact summary (Target vs Actual)
}

// --- Constants ---

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
const MAX_RETRIES = 2;
const USE_MOCK_AI = false; // Set true for offline testing

// Simple in-memory response cache (last 5)
const responseCache: Map<string, AIResponse> = new Map();
const CACHE_MAX = 5;

// --- Prompt Builder ---

/**
 * Constructs the full system prompt. Instructs the AI to be a smart
 * assistant that interprets data and gives actionable advice — never
 * dumps raw numbers.
 */
function buildSystemPrompt(context: UserContext): string {
  const memoryBlock = [
    context.memory.allergies.length
      ? `Allergies: ${context.memory.allergies.join(', ')}`
      : null,
    context.memory.diet ? `Diet Preference: ${context.memory.diet}` : null,
    context.memory.dislikes.length
      ? `Food Dislikes: ${context.memory.dislikes.join(', ')}`
      : null,
    context.memory.conditions.length
      ? `Health Conditions: ${context.memory.conditions.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const chatHistoryBlock = context.recentMessages
    .slice(-5)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  return `You are the lead health coach at Ai-cal-track, a premium fitness platform. You work alongside a high-precision medical macro engine. Your tone is supportive, expert, and highly actionable.

═══ LIVE MACRO SCORECARD ═══
- Profile: ${JSON.stringify(context.onboarding || {})}
- Goal: ${context.dailyCalories} kcal
- Current: ${context.consumedCalories} kcal
- Protein: ${context.protein}g actual / ${context.onboarding?.targetProtein || '??'}g target
- Carbs: ${context.carbs}g actual / ${context.onboarding?.targetCarbs || '??'}g target
- Fats: ${context.fats}g actual / ${context.onboarding?.targetFats || '??'}g target
- Today's Logs: ${JSON.stringify(context.todayLogs || [])}

═══ 7-DAY CONSISTENCY LOG ═══
${(context.weeklySummary || []).length > 0
      ? context.weeklySummary!.map(day => `- ${day.date}: ${day.actualCalories}/${day.targetCalories} kcal | ${day.actualProtein}/${day.targetProtein}g Protein`).join('\n')
      : 'No history available.'}

═══ YOUR CORE PROTOCOL ═══
1. NO DATA DUMPS: Never repeat lists of numbers unless the user EXPLICITLY asks ("show me my logs").
2. TREND ANALYSIS: If the user asks about weight progress or goal adjustments, check their "7-DAY CONSISTENCY LOG". 
   - If they are consistently missing protein/calorie targets, advise them to hit current goals first.
   - If they are highly consistent (>90%) but not seeing results, SUGGEST a reasonable calorie goal adjustment (e.g., +200) in your chat response. DO NOT run the "update_calories" action yet! Ask the user for confirmation first (e.g. "Should I increase your goal by 200 kcal?").
   - ONLY use the update_calories action if the user explicitly says "yes," "do it," or tells you exactly what to change.
3. PROACTIVE AUDIT: Always check the Macro Scorecard. If the user is >20% off-track for today's protein or calories, mention it in your first insight line.
4. ACTION ORIENTED: Always provide 2-3 specific, clear bullet points on "What to do next".
5. SMART TONE: Use natural phrases like "Here's where you stand 👇" or "Let's adjust focus to...".
6. EMOJIS: Use emojis (👉, 💧, 🔥, 💪, 🎯) to improve readability.

═══ USER BIO ═══
- Profile: ${JSON.stringify(context.onboarding || {})}
- Metric Target: ${context.dailyCalories} kcal
- Current Intake: ${context.consumedCalories} kcal (${Math.round((context.consumedCalories / (context.dailyCalories || 1)) * 100)}%)

═══ TODAY'S LOGS ═══
${(context.todayLogs || []).length > 0
      ? context.todayLogs!.slice(-10).map(l => `- [${(l.type || 'unknown').toUpperCase()}] ${l.name || 'Activity'}: ${l.calories || 0} kcal, ${l.protein || 0}g protein`).join('\n')
      : 'No activity logged yet.'}
${(context.todayLogs || []).length > 10 ? `...and ${(context.todayLogs || []).length - 10} more earlier today.` : ''}

═══ RESPONSE BLUEPRINT ═══
1. One line of human insight (e.g. "You're leaning into a calorie deficit, which is perfect for weight loss.")
2. Bulleted "👉 Fix Now" section (2-3 items)

═══ QUICK ACTIONS ═══
Always suggest 3 of these to keep momentum:
- "Fix Protein 💪"
- "Suggest Meal 🍽️"
- "Adjust Plan 🎯"
- "Water Tracker 💧"

═══ ACTION DICTIONARY & CRITICAL RULES ═══
Every entry in the "actions" array MUST follow this exact nested structure:
- log_food: { "type": "log_food", "data": { "name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "serving": string, "target_date": string (optional, YYYY-MM-DD if user specifies past) } }
- log_water: { "type": "log_water", "data": { "waterLiters": number } }
- log_exercise: { "type": "log_exercise", "data": { "name": string, "duration": number, "calories": number, "intensity": "Low | Medium | High" } }
- update_calories: { "type": "update_calories", "data": { "adjustment": number, "reason": string } }
- undo_log: { "type": "undo_log", "data": {} }

🔴 STOP & SPLIT CHECKLIST (Mandatory):
1. Multiple foods? (Roti + Sabji). -> YES? Use 2 SEPARATE log_food actions.
2. Supplement? (Creatine, Protein). -> YES? Use a SEPARATE log_food action.
3. Goal change? (e.g. Add 200 kcal). -> YES? Use an update_calories action.
4. Preferences? User mentions they are vegan, allergic to peanuts, etc. -> YES? Output a "memory_update" object.
5. User says "undo", "delete that", or "made a mistake"? -> YES? Use the undo_log action.

🚫 NEVER group items. One card per action. This is critical for UI quality.
🚫 NO AUTO-LOGGING: Never trigger a "log_food" action for items you are ONLY suggesting. Only log if the user explicitly confirms they ate it or asked you to log it right now.

🔴 VISION PROTOCOL:
1. If an image is provided, your PRIMRY goal is to identify all food items and estimate their weight/portions.
2. Assume standard restaurant/home portions unless otherwise specified.
3. Give a clear table-like breakdown in your text response (e.g. "Chicken Breast (150g): 250 kcal").
4. If the user says nothing but sends an image, analyze it and ASK if they want to log it.
5. If the user says "log this", "just ate this", or implies consumption, you MUST generate the 'log_food' actions immediately.
6. For multi-item plates, generate SEPARATE 'log_food' actions for each major component.

═══ OUTPUT FORMAT (STRICT JSON) ═══
Respond with a JSON object:
{
  "intent": "chat | adjustment | log_food",
  "response": "Insight text...",
  "memory_update": {
    "allergies": ["peanuts"],
    "diet": "vegan",
    "dislikes": [],
    "conditions": []
  },
  "actions": [ 
    { "type": "log_food", "data": { "name": "Roti", "calories": 300, "protein": 8, "carbs": 60, "fat": 4, "serving": "4 roti" } },
    { "type": "update_calories", "data": { "adjustment": 200, "reason": "Muscle gain" } }
  ],
  "quick_actions": [
    { "label": "Fix Protein 💪", "message": "Suggest high protein foods" },
    { "label": "Suggest Meal 🍽️", "message": "Suggest a meal" },
    { "label": "Water Tracker 💧", "message": "Log 250ml water" }
  ]
}`;
}

// --- Mock AI ---

function getMockResponse(message: string): AIResponse {
  const lower = message.toLowerCase();

  if (lower.includes('calorie') && lower.includes('goal')) {
    return {
      intent: 'update_calories',
      response: "Done! Your calorie goal is now 2500 kcal 🎯\n\nThis gives you room for solid muscle recovery while staying lean. Stick to 3 main meals + 1 snack to hit it consistently.",
      action: { type: 'update_calories', data: { value: 2500 } },
      quick_actions: [
        { label: 'Meal Plan 📋', message: 'Generate a meal plan for 2500 calories' },
        { label: 'Quick Snack ⚡', message: 'Suggest a high-protein snack' },
      ],
    };
  }

  if (lower.includes('allerg')) {
    return {
      intent: 'store_memory',
      response: "Noted! I'll avoid suggesting anything with peanuts from now on 🛡️\n\n👉 Great alternatives for you:\n• Almonds or cashews for snacking\n• Sunflower seed butter instead of peanut butter",
      memory_update: { allergies: ['peanuts'] },
      quick_actions: [
        { label: 'Suggest Meal 🍽️', message: 'Suggest a peanut-free meal' },
        { label: 'Meal Plan 📋', message: 'Generate a full meal plan for today' },
      ],
    };
  }

  if (lower.includes('meal') || lower.includes('plan')) {
    return {
      intent: 'generate_plan',
      response: "Here's a balanced plan to hit your targets 👇\n\n🌅 Breakfast: Oatmeal with berries + honey (350 kcal)\n🌞 Lunch: Grilled chicken salad with olive oil (450 kcal)\n🌙 Dinner: Salmon with roasted veggies (550 kcal)\n🍎 Snacks: Greek yogurt + almonds (300 kcal)\n\nTotal: ~1650 kcal • Protein: ~95g",
      quick_actions: [
        { label: 'Log Breakfast ✅', message: 'Log oatmeal with berries for breakfast' },
        { label: 'Swap Dinner 🔄', message: 'Suggest an alternative dinner' },
      ],
    };
  }

  if (lower.includes('protein') || lower.includes('fix')) {
    return {
      intent: 'chat',
      response: "Your protein is looking low today ⚠️\n\n👉 Quick protein boosters:\n• 2 boiled eggs → +13g protein\n• Greek yogurt with nuts → +15g\n• Grilled paneer (100g) → +18g\n\nAim for at least 30g at your next meal to catch up.",
      quick_actions: [
        { label: 'Log Eggs ✅', message: 'Log 2 boiled eggs' },
        { label: 'More Options 🍽️', message: 'Suggest more high protein foods' },
      ],
    };
  }

  return {
    intent: 'chat',
    response: "Hey! I'm your fitness coach 💪\n\nI can analyze your nutrition, suggest meals, adjust your goals, and help you stay on track. Just ask me anything!\n\n👉 Try asking:\n• \"How are my macros?\"\n• \"Suggest a high-protein meal\"\n• \"Set calorie goal to 2000\"",
    quick_actions: [
      { label: 'My Macros 📊', message: 'How are my macros looking today?' },
      { label: 'Suggest Meal 🍽️', message: 'Suggest a meal that fits my remaining macros' },
      { label: 'Meal Plan 📋', message: 'Generate a full meal plan for today' },
    ],
  };
}

// --- API Communication ---

/**
 * Sends user message with full context to Gemini and returns parsed AIResponse.
 * Includes retry logic and response caching.
 */
export async function sendToGemini(
  userMessage: string,
  context: UserContext,
  imageBase64?: string
): Promise<AIResponse> {
  // Mock mode for testing
  if (USE_MOCK_AI) {
    console.log('[AIService] Using mock response');
    return getMockResponse(userMessage);
  }

  // Check cache
  const cacheKey = userMessage.trim().toLowerCase();
  if (responseCache.has(cacheKey)) {
    console.log('[AIService] Cache hit for:', cacheKey);
    return responseCache.get(cacheKey)!;
  }

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing. Set EXPO_PUBLIC_GEMINI_API_KEY in .env');
  }

  const systemPrompt = buildSystemPrompt(context);
  const fullPrompt = `${systemPrompt}\n\nUser message: "${userMessage}"\n\nRespond with ONLY valid JSON:`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[AIService] Retry attempt ${attempt}/${MAX_RETRIES}`);
        // Exponential backoff
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }

      const parts: any[] = [{ text: fullPrompt }];

      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64
          }
        });
      }

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      });

      const data = await response.json();

      if (data?.error) {
        throw new Error(`Gemini API Error: ${data.error.message || 'Unknown'}`);
      }

      const candidate = data?.candidates?.[0];
      let textResponse = candidate?.content?.parts?.[0]?.text || '';

      if (!textResponse) {
        const reason = candidate?.finishReason || 'UNKNOWN';
        throw new Error(`Empty AI response (Finish Reason: ${reason})`);
      }

      const parsed = parseAIResponse(textResponse);

      // Cache the response
      if (responseCache.size >= CACHE_MAX) {
        const firstKey = responseCache.keys().next().value;
        if (firstKey) responseCache.delete(firstKey);
      }
      responseCache.set(cacheKey, parsed);

      return parsed;
    } catch (error: any) {
      lastError = error;
      console.error(`[AIService] Attempt ${attempt} failed:`, error.message);
    }
  }

  throw lastError || new Error('Failed to get AI response after retries');
}

/**
 * Safely parses AI response text into a structured AIResponse object.
 * Handles markdown code fences, trailing commas, and malformed JSON gracefully.
 */
export function parseAIResponse(raw: string): AIResponse {
  try {
    // Strip markdown JSON fences
    let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    // Try to extract JSON object if there's surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (!parsed.response || typeof parsed.response !== 'string') {
      return {
        intent: 'chat',
        response: parsed.response || "I understood your message but couldn't format a proper response. Could you try rephrasing?",
      };
    }

    // Handle action(singular) to actions(plural) conversion
    let finalActions: AIAction[] = [];
    if (Array.isArray(parsed.actions)) {
      finalActions = parsed.actions;
    } else if (parsed.action) {
      finalActions = [parsed.action];
    }

    return {
      intent: parsed.intent || 'chat',
      response: parsed.response,
      actions: finalActions.length > 0 ? finalActions : undefined,
      memory_update: parsed.memory_update || undefined,
      quick_actions: Array.isArray(parsed.quick_actions) ? parsed.quick_actions : undefined,
    };
  } catch (error) {
    console.error('[AIService] JSON parse failed, raw:', raw);

    // Fallback: try to extract any readable text from the response
    const fallbackText = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .replace(/[{}"]/g, '')
      .trim();

    return {
      intent: 'chat',
      response: fallbackText || "Sorry, I had trouble processing that. Could you try again?",
    };
  }
}

/**
 * Lightweight, fast API call to fetch a 1-sentence daily insight.
 * Used passively on the Home Dashboard.
 */
export async function getDailyInsight(
  consumedCalories: number,
  targetCalories: number,
  protein: number
): Promise<string> {
  if (USE_MOCK_AI) {
    return "You're crushing it! Keep your protein high for dinner. 💪";
  }

  if (!GEMINI_API_KEY) return '';

  const prompt = `You are a strict but encouraging fitness AI. 
The user has consumed ${consumedCalories} kcal out of ${targetCalories} kcal today, and ${protein}g protein.
Write exactly ONE short, punchy sentence of personalized coaching or strategy.
Max 15 words. Include exactly 1 emoji. Do not use hashtags or markdown.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return text.replace(/["\n]/g, '').trim();
  } catch (error) {
    console.error('[AIService] Daily Insight fetch failed:', error);
    return "Keep pushing! Log your meals to stay on track. 💪";
  }
}
