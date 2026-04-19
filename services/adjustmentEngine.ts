import { MacroPlan } from './macroEngine';

export interface AdjustmentFeedback {
  type: 'weight_stalled' | 'gaining_too_fast' | 'maintaining_well' | 'manual';
  value?: number; // Optional custom adjustment
}

export const adjustPlan = (currentPlan: MacroPlan, feedback: AdjustmentFeedback): MacroPlan => {
  let calorieAdjustment = 0;

  switch (feedback.type) {
    case 'weight_stalled':
      calorieAdjustment = 200;
      break;
    case 'gaining_too_fast':
      calorieAdjustment = -100;
      break;
    case 'maintaining_well':
      calorieAdjustment = 0;
      break;
    case 'manual':
      calorieAdjustment = feedback.value || 0;
      break;
    default:
      calorieAdjustment = 0;
  }

  const newCalories = currentPlan.dailyCalories + calorieAdjustment;

  // Re-calculate macros based on new calories keeping same protein grams
  // We distribute the adjustment across carbs and fats (75/25 split)
  // to maintain a healthy macro balance instead of only moving carbs.
  const calorieDiff = newCalories - currentPlan.dailyCalories;
  
  const fatsCalorieAdj = calorieDiff * 0.25;
  const carbsCalorieAdj = calorieDiff * 0.75;

  const fatsGramsAdj = Math.round(fatsCalorieAdj / 9);
  const carbsGramsAdj = Math.round(carbsCalorieAdj / 4);

  return {
    ...currentPlan,
    dailyCalories: newCalories,
    fatsGrams: Math.max(currentPlan.fatsGrams + fatsGramsAdj, 0),
    carbsGrams: Math.max(currentPlan.carbsGrams + carbsGramsAdj, 0),
  };
};
