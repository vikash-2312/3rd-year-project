/**
 * decisionEngine.ts
 * 
 * The hardcoded "Brain" of the Proactive AI Coach.
 * Analyzes multi-day trends and today's stats to identify problems
 * BEFORE the user asks. This follows the IF/THEN rules specified
 * in the system architecture.
 */

import { UserContext } from './aiService';

export interface AIInsight {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  suggestion?: string;
  actionLabel?: string;
  actionMessage?: string; // Message to send to AI Coach when tapped
}

/**
 * Main analyzer function.
 * Evaluates the user context against a set of fitness "Elite" heuristics.
 */
export function analyzeUserPerformance(context: UserContext): AIInsight[] {
  const insights: AIInsight[] = [];
  const { weeklySummary, todayLogs, onboarding, consumedCalories, dailyCalories, protein, steps, targetSteps, water } = context;

  if (!weeklySummary || weeklySummary.length === 0) {
    insights.push({
      id: 'welcome_day_1',
      title: 'Welcome to Elite Growth! 🚀',
      message: "I'm your AI Coach. I'll be watching your trends and giving you proactive advice to hit your goals faster.",
      type: 'info',
      suggestion: "To start, try logging your first meal using the camera or search button.",
      actionLabel: "How it Works?",
      actionMessage: "I'm new here. Can you explain how you'll help me reach my goals?"
    });
    return insights;
  }

  const activeDays = weeklySummary.filter(day => (day as any).hasLogs);

  // --- 0. Welcome Insight (New/Inactive User) ---
  if (activeDays.length === 0) {
    insights.push({
      id: 'welcome_day_1',
      title: 'Welcome to Elite Growth! 🚀',
      message: "I'm your AI Coach. I'll be watching your trends and giving you proactive advice. Just logged your first meal? I'll analyze it soon.",
      type: 'info',
      suggestion: "You can also set a bio-memory to tell me about your preferences.",
      actionLabel: "Set Bio-Memory",
      actionMessage: "I want to set my coaching preferences and bio-memory."
    });
    return insights;
  }

  // --- 1. Weekend Surge Monitor (Elite Rule) ---
  const today = new Date();
  const isWeekendStart = today.getDay() === 5 || today.getDay() === 6; // Fri or Sat
  if (isWeekendStart && activeDays.length >= 4) {
    const weekdays = activeDays.filter(d => {
      const dayNum = new Date(d.date).getDay();
      return dayNum >= 1 && dayNum <= 4; // Mon-Thu
    });
    const weekendDays = activeDays.filter(d => {
      const dayNum = new Date(d.date).getDay();
      return dayNum === 0 || dayNum === 5 || dayNum === 6; // Sun, Fri, Sat
    });

    if (weekdays.length > 0 && weekendDays.length > 0) {
      const weekdayAvg = weekdays.reduce((acc, d) => acc + d.actualCalories, 0) / weekdays.length;
      const weekendAvg = weekendDays.reduce((acc, d) => acc + d.actualCalories, 0) / weekendDays.length;
      
      if (weekendAvg > weekdayAvg * 1.25) {
        insights.push({
          id: 'weekend_surge_alert',
          title: 'The Weekend Surge 🍕',
          message: "Your weekend calories are significantly higher than your work week (+25%). Consistency is key to elite progress.",
          type: 'warning',
          suggestion: "Try prepping your Saturday meals today to avoid reactive eating.",
          actionLabel: "Weekend Plan",
          actionMessage: "I always overeat on weekends. Can you help me make a high-protein weekend meal plan?"
        });
      }
    }
  }

  // --- 2. Meal Density Audit (Elite Rule) ---
  if (todayLogs && todayLogs.length > 0) {
    const foodLogs = todayLogs.filter(l => l.type === 'food');
    const outliers = foodLogs.filter(l => (l.calories || 0) > (dailyCalories * 0.6));
    if (outliers.length > 0) {
      insights.push({
        id: 'meal_density_outlier',
        title: 'Large Meal Detected 🍽️',
        message: `Your ${outliers[0].name} accounted for over 60% of your daily goal. Huge calorie spikes can cause lethargy.`,
        type: 'warning',
        suggestion: "Aim for more balanced partitioning across 3-4 meals tomorrow.",
        actionLabel: "Meal Timing Advice",
        actionMessage: "I tend to eat one huge meal. Is it better to split my calories throughout the day?"
      });
    }
  }

  // --- 3. Sedentary Trap Alert (Elite Rule) ---
  const currentSteps = steps || 0;
  const tSteps = targetSteps || onboarding?.macros?.dailySteps || 8000;
  if (currentSteps < 3000 && (consumedCalories / dailyCalories) > 0.8) {
    insights.push({
      id: 'sedentary_trap_alert',
      title: 'The Sedentary Trap 👣',
      message: "You've hit your calorie ceiling but your movement is critically low today (<3k steps).",
      type: 'critical',
      suggestion: "A 15-minute walk now will improve your glucose response to today's food.",
      actionLabel: "Why Walk Now?",
      actionMessage: "My steps are low but my calories are full. Why is a short walk important right now?"
    });
  }

  // --- 4. Protein Distribution Audit (Elite Rule) ---
  if (todayLogs && todayLogs.length >= 3) {
    const foodLogs = todayLogs.filter(l => l.type === 'food');
    const proteinTargetPerMeal = (onboarding?.macros?.proteinGrams || 150) / 4;
    const missingProteinMeals = foodLogs.filter(l => (l.protein || 0) < proteinTargetPerMeal * 0.5);
    
    if (missingProteinMeals.length >= 2) {
      insights.push({
        id: 'protein_distribution_check',
        title: 'Protein Distribution 🥩',
        message: "You've had multiple meals today with very low protein. Muscle synthesis is best with spread-out intake.",
        type: 'info',
        suggestion: "Try to add a protein source to your next snack.",
        actionLabel: "Quick Protein Ideas",
        actionMessage: "Suggested easy-to-add protein sources for my next meal?"
      });
    }
  }

  // --- 5. Goal Alignment Check (Existing + Refined) ---
  const targetGoal = onboarding?.goal || '';
  if (targetGoal.toLowerCase().includes('gain') || targetGoal.toLowerCase().includes('muscle')) {
    const totalAdherence = activeDays.reduce((acc, day) => {
      const target = Math.max(day.targetCalories, 1000);
      return acc + (day.actualCalories / target);
    }, 0);
    const averageAdherence = totalAdherence / activeDays.length;
    
    if (averageAdherence > 0.9 && activeDays.length >= 5) {
      insights.push({
        id: 'weight_stall_gain',
        title: 'Growth Stall Detected 📈',
        message: "Consistency is perfect, but if weight is steady, your metabolic rate might have adapted.",
        type: 'info',
        suggestion: "I suggest a +150 kcal adjustment to keep pushing growth.",
        actionLabel: "Adjust +150kcal",
        actionMessage: "Please increase my daily calorie goal by 150 kcal for muscle growth."
      });
    }
  }

  // --- 6. Hydration Check (Existing) ---
  const waterLiters = water || 0;
  const hour = new Date().getHours();
  if (hour >= 15 && waterLiters < 1.0) {
    insights.push({
      id: 'low_hydration',
      title: 'Hydration Gap 💧',
      message: "You're at less than 1L of water and it's mid-afternoon. Focus might begin to dip.",
      type: 'warning',
      suggestion: "Reach for a glass before your next task.",
      actionLabel: "Log 500ml",
      actionMessage: "Log 500ml of water for me please."
    });
  }

  return insights;
}
