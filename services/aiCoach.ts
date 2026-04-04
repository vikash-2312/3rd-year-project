import { sendToGemini, UserContext, AIResponse } from './aiService';
import { AdjustmentFeedback } from './adjustmentEngine';

export interface CoachingInsight {
  insight: string;
  adjustment?: AdjustmentFeedback;
  recommendations: string[];
}

/**
 * AI Coach Service
 * 
 * Specialized layer that uses AI to analyze user progress and 
 * suggest deterministic adjustments to the baseline macro plan.
 */
export const getCoachingAdvice = async (context: UserContext): Promise<CoachingInsight> => {
  const prompt = `
    You are a high-level AI Fitness Coach. Your job is to analyze the user's current progress and suggest SMALL, DETERMINISTIC adjustments to their nutrition plan.
    
    ═══ RULES ═══
    1. NEVER calculate or propose a completely new base plan.
    2. ONLY suggest relative adjustments (e.g., +200 kcal, -100 kcal).
    3. Be specific about the REASON for the adjustment.
    4. Focus on consistency and sustainability.
    
    ═══ DATA ═══
    - Current Goal: ${context.goal}
    - Current Weight: ${context.weight}kg
    - Daily Target: ${context.dailyCalories} kcal
    - Consumed Today: ${context.consumedCalories} kcal
    
    ═══ OUTPUT FORMAT (STRICT JSON) ═══
    {
      "insight": "1-2 sentence analysis of current progress",
      "adjustment_type": "weight_stalled | gaining_too_fast | maintaining_well | manual",
      "adjustment_value": number (optional, only for manual),
      "recommendations": ["list", "of", "high-level", "tips"]
    }
  `;

  try {
    const aiResponse: AIResponse = await sendToGemini(prompt, context);
    
    // Parse the sub-JSON within the response or treat the whole thing as coached logic
    // For now, we'll assume the AI followed the instruction
    const parsed = JSON.parse(aiResponse.response);

    return {
      insight: parsed.insight,
      adjustment: {
        type: parsed.adjustment_type,
        value: parsed.adjustment_value,
      },
      recommendations: parsed.recommendations,
    };
  } catch (error) {
    console.error('[AiCoach] Failed to get coaching advice:', error);
    return {
      insight: "You're doing great! Keep sticking to your daily targets and tracking consistently.",
      recommendations: ["Ensure you're hitting your protein goal", "Stay hydrated with 2-3L of water", "Keep logging every meal"],
    };
  }
};
