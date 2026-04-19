/**
 * Unified Health Score Engine
 * 
 * Centralized logic for calculating the daily health score (0-100).
 * This prevents inconsistencies between the Home tab header and the Profile share cards.
 */

export interface HealthScoreBreakdown {
  protein: number;
  macros: number;
  calories: number;
  exercise: number; // Renamed from movement
  water: number;
  sleep: number;
  total: number;
}

export interface HealthScoreParams {
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
    exerciseMinutes: number;
  };
  targets: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    dailySteps: number;
    waterIntakeLiters: number;
    exerciseMinutes: number;
    sleepHours: number;
  };
  todaySteps: number;
  todaySleep: number;
}

export const calculateUnifiedHealthScore = (params: HealthScoreParams): HealthScoreBreakdown => {
  const { consumed, targets, todaySteps, todaySleep } = params;

  // 1. Protein Score (20 pts)
  const proteinScore = Math.min((consumed.protein / (targets.proteinGrams || 1)) * 20, 20);

  // 2. Secondary Macros Score (15 pts)
  // Balanced carb/fat intake reward
  const macroScore = Math.min(((consumed.carbs + consumed.fat * 2) / (targets.carbsGrams + targets.fatsGrams * 2 || 1)) * 15, 15);

  // 3. Calorie Accuracy Score (20 pts)
  // Reward being close to target (within a healthy range)
  const calorieRatio = consumed.calories / (targets.dailyCalories || 2000);
  let calorieScore = 0;
  if (calorieRatio > 0.8 && calorieRatio < 1.1) {
    calorieScore = 20;
  } else if (calorieRatio > 0.5) {
    calorieScore = 10;
  }

  // 4. Movement Score (20 pts) - Best of steps or exercise
  const workoutProgress = consumed.exerciseMinutes / (targets.exerciseMinutes || 30);
  const stepProgress = todaySteps / (targets.dailySteps || 10000 || 1);
  const movementScore = Math.min(Math.max(workoutProgress, stepProgress) * 20, 20);

  // 5. Hydration Score (15 pts)
  const waterScore = Math.min((consumed.water / (targets.waterIntakeLiters || 2.5 || 1)) * 15, 15);

  // 6. Recovery/Sleep Score (10 pts)
  const sleepScore = Math.min((todaySleep / (targets.sleepHours || 8 || 1)) * 10, 10);

  const total = Math.round(proteinScore + macroScore + calorieScore + movementScore + waterScore + sleepScore);

  return {
    protein: Math.max(0, Math.round(proteinScore)),
    macros: Math.max(0, Math.round(macroScore)),
    calories: Math.max(0, Math.round(calorieScore)),
    exercise: Math.max(0, Math.round(movementScore)),
    water: Math.max(0, Math.round(waterScore)),
    sleep: Math.max(0, Math.round(sleepScore)),
    total: Math.min(100, total)
  };
};
