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
  // (Assuming protein is usually fixed by weight, and we adjust carbs/fats)
  // We'll adjust carbs for the calorie difference
  const calorieDiff = newCalories - currentPlan.dailyCalories;
  const carbsAdjustment = Math.round(calorieDiff / 4);

  return {
    ...currentPlan,
    dailyCalories: newCalories,
    carbsGrams: Math.max(currentPlan.carbsGrams + carbsAdjustment, 0),
  };
};
