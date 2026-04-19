import * as Clipboard from 'expo-clipboard';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export type CaptionTone = 'motivational' | 'humble' | 'data';

interface CaptionStats {
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
  steps: number;
  targetSteps: number;
  water: number;
  targetWater: number;
  exerciseMinutes: number;
  targetExercise: number;
  sleepHours: number;
  targetSleep: number;
  healthScore: number;
}

const TONE_PROMPTS: Record<CaptionTone, string> = {
  motivational: `You are a hype fitness copywriter. Write in an energetic, confident, motivational tone. Use power words like "crushed", "dominated", "unstoppable". Include 2-3 relevant emojis naturally in the text.`,
  humble: `You are writing a genuine, down-to-earth fitness post. Be real, relatable, and authentic. Acknowledge the grind without bragging. Use 1-2 subtle emojis. Sound like a real person sharing their honest journey.`,
  data: `You are a data-driven fitness analyst sharing results. Be precise and analytical. Reference specific numbers and percentages. Use a clean, professional tone. Minimal emojis (0-1). Think "quantified self" community.`,
};

export async function generateCaption(
  stats: CaptionStats,
  tone: CaptionTone
): Promise<{ caption: string; hashtags: string[] }> {
  if (!GEMINI_API_KEY) {
    return getFallbackCaption(stats, tone);
  }

  const caloriePercent = Math.round((stats.calories / stats.targetCalories) * 100);
  const proteinPercent = Math.round((stats.protein / stats.targetProtein) * 100);
  const stepsPercent = Math.round((stats.steps / stats.targetSteps) * 100);
  const waterPercent = Math.round((stats.water / stats.targetWater) * 100);

  const prompt = `${TONE_PROMPTS[tone]}

Generate a social media caption (2-3 sentences max, under 200 characters total) for someone sharing their daily fitness stats from their AI-powered health tracking app.

Their stats today:
- Health Score: ${stats.healthScore}/100
- Calories: ${stats.calories}/${stats.targetCalories} kcal (${caloriePercent}%)
- Protein: ${stats.protein}/${stats.targetProtein}g (${proteinPercent}%)
- Steps: ${stats.steps.toLocaleString()}/${stats.targetSteps.toLocaleString()} (${stepsPercent}%)
- Water: ${stats.water.toFixed(1)}/${stats.targetWater}L (${waterPercent}%)
- Exercise: ${stats.exerciseMinutes}/${stats.targetExercise} min
- Sleep: ${stats.sleepHours.toFixed(1)}/${stats.targetSleep} hrs

Also generate exactly 5 relevant trending fitness hashtags.

Reply ONLY in this exact JSON format, no markdown, no backticks:
{"caption": "your caption here", "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]}`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 256,
        },
      }),
    });

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean and parse JSON
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    if (!cleaned) {
      console.warn('[CaptionService] Empty response from AI');
      return getFallbackCaption(stats, tone);
    }

    try {
      const parsed = JSON.parse(cleaned);
      return {
        caption: parsed.caption || getFallbackCaption(stats, tone).caption,
        hashtags: parsed.hashtags || getFallbackCaption(stats, tone).hashtags,
      };
    } catch (parseError) {
      console.error('[CaptionService] JSON Parse Error:', parseError, 'Raw Text:', rawText);
      return getFallbackCaption(stats, tone);
    }
  } catch (error) {
    console.error('[CaptionService] Generation failed:', error);
    return getFallbackCaption(stats, tone);
  }
}

function getFallbackCaption(
  stats: CaptionStats,
  tone: CaptionTone
): { caption: string; hashtags: string[] } {
  const score = stats.healthScore;

  const captions: Record<CaptionTone, string> = {
    motivational:
      score >= 70
        ? `Health Score: ${score}. Another day of showing up and crushing it 🔥💪`
        : `Health Score: ${score}. Still building. Every rep counts, every step matters 🚀`,
    humble:
      score >= 70
        ? `Scored a ${score} today. Not perfect, but showing up is 90% of the battle.`
        : `${score}/100 today. Some days are about survival, and that's okay.`,
    data:
      score >= 70
        ? `Daily Performance Index: ${score}/100. ${stats.calories}kcal consumed, ${stats.steps.toLocaleString()} steps tracked, ${stats.protein}g protein.`
        : `DPI: ${score}/100. Caloric intake ${stats.calories}/${stats.targetCalories}kcal. Protein adherence at ${Math.round((stats.protein / stats.targetProtein) * 100)}%.`,
  };

  return {
    caption: captions[tone],
    hashtags: ['#FitnessJourney', '#HealthScore', '#TrackingProgress', '#AIFitness', '#ConsistencyWins'],
  };
}

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
