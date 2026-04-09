/**
 * healthAnalyzer.ts
 * 
 * Shared business logic for aggregating user performance data
 * across multiple days. Used by the Decision Engine and AI Coach.
 */

import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { format, subDays, startOfDay } from 'date-fns';
import { db } from '../lib/firebase';
import { UserContext } from './aiService';

interface HealthLog {
  id: string;
  userId: string;
  type: 'food' | 'water' | 'exercise';
  date: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  waterLiters?: number;
  duration?: number;
}

/**
 * Fetches and aggregates the last 7 days of logs for a user.
 * Returns a format compatible with UserContext.
 */
export async function getUserAnalysisContext(
  userId: string, 
  profile: any, 
  days: number = 7,
  currentSteps?: number,
  targetSteps?: number
): Promise<UserContext | null> {
  try {
    const today = startOfDay(new Date());
    const targetDateAgo = subDays(today, days - 1);
    const dateStrings = [];
    for (let i = 0; i < days; i++) {
      dateStrings.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }

    const logsRef = collection(db, 'logs');
    const q = query(
      logsRef,
      where('userId', '==', userId),
      where('date', '>=', format(targetDateAgo, 'yyyy-MM-dd')),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const allLogs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthLog));

    // Group by date
    const weeklySummary = [];
    const macros = profile?.macros || { dailyCalories: 2000, proteinGrams: 150 };

    for (const dStr of dateStrings) {
      const dayLogs = allLogs.filter(log => log.date === dStr);
      const dayTotal = dayLogs.reduce((acc, log) => ({
        calories: acc.calories + (log.type === 'food' ? (log.calories || 0) : 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fats: acc.fats + (log.fat || 0),
        water: acc.water + (log.type === 'water' ? (log.waterLiters || 0) : 0),
        exercise: acc.exercise + (log.type === 'exercise' ? (log.duration || 0) : 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exercise: 0 });

      weeklySummary.push({
        date: dStr,
        actualCalories: dayTotal.calories,
        targetCalories: macros.dailyCalories,
        actualProtein: dayTotal.protein,
        targetProtein: (macros as any).targetProtein || macros.proteinGrams || Math.round((profile?.weight || 70) * 2),
        hasLogs: dayLogs.length > 0
      });
    }

    const todayStr = format(today, 'yyyy-MM-dd');
    const todayLogs = allLogs.filter(log => (log as any).date === todayStr);
    const todayData = todayLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.type === 'food' ? (log.calories || 0) : 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fat || 0),
      water: acc.water + (log.type === 'water' ? (log.waterLiters || 0) : 0),
      exercise: acc.exercise + (log.type === 'exercise' ? (log.duration || 0) : 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exercise: 0 });

    return {
      userId,
      goal: profile?.goal || 'General Health',
      weight: profile?.weight || 70,
      dailyCalories: macros.dailyCalories || 2000,
      consumedCalories: todayData.calories,
      protein: todayData.protein,
      carbs: todayData.carbs, 
      fats: todayData.fats,
      water: todayData.water,
      exerciseMinutes: todayData.exercise,
      steps: currentSteps,
      targetSteps: targetSteps,
      memory: { 
        allergies: [], 
        diet_preference: '', 
        disliked_foods: [], 
        habits: [], 
        weak_points: [], 
        conditions: [],
        personality_pref: 'Supportive',
        complexity_pref: 'Quick/Easy',
        meal_timing: '',
        unstructured_bio: ''
      }, // Placeholder, will be filled by caller
      recentMessages: [],
      onboarding: profile,
      todayLogs: todayLogs,
      weeklySummary: weeklySummary.reverse(),
      historicalLogs: allLogs,
    };
  } catch (error) {
    console.error('[HealthAnalyzer] Error fetching summary:', error);
    return null;
  }
}
