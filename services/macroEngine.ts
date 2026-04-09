import { differenceInYears, parse } from 'date-fns';

export interface UserProfile {
  gender: string;
  birthdate: string;
  weight: number; // kg
  height: number; // cm
  activityLevel: string; // light, moderate, active
  goal: string; // lose, maintain, gain
}

export interface MacroPlan {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterIntakeLiters: number;
}

export const calculateUserPlan = (user: UserProfile): MacroPlan => {
  const { gender, birthdate, weight, height, activityLevel, goal } = user;

  // 1. Calculate Age with Safety Fallback
  let age = 30; // Default fallback age
  try {
    const birthDateObj = parse(birthdate, 'yyyy-MM-dd', new Date());
    age = differenceInYears(new Date(), birthDateObj);
    if (isNaN(age)) age = 30; // Fallback for 'Invalid Date' result
  } catch (e) {
    console.error('[MacroEngine] Invalid birthdate format:', birthdate);
  }

  // 2. BMR (Mifflin-St Jeor)
  const lowerGender = gender?.toLowerCase() || 'male';
  let bmr: number;
  if (lowerGender === 'male' || lowerGender === 'man') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // 3. TDEE
  const lowerActivity = activityLevel?.toLowerCase() || 'light';
  const multipliers: Record<string, number> = {
    light: 1.2,
    moderate: 1.55,
    active: 1.725,
  };
  const multiplier = multipliers[lowerActivity] || 1.2;
  let tdee = bmr * multiplier;

  // 4. Goal Adjustment
  const lowerGoal = goal?.toLowerCase() || 'maintain';
  if (lowerGoal === 'lose') {
    tdee -= 400;
  } else if (lowerGoal === 'gain') {
    tdee += 400;
  }

  // Safety Clamp
  const finalCalories = Math.max(Math.round(tdee), lowerGender === 'male' ? 1500 : 1200);

  // 5. Macros
  // Protein: 2g/kg (gain), 1.6g/kg (others)
  const proteinMultiplier = lowerGoal === 'gain' ? 2 : 1.6;
  const proteinGrams = Math.round(weight * proteinMultiplier);
  const proteinCalories = proteinGrams * 4;

  // Fats: 25% of calories
  const fatsCalories = finalCalories * 0.25;
  const fatsGrams = Math.round(fatsCalories / 9);

  // Carbs: Remaining calories
  const remainingCalories = finalCalories - proteinCalories - (fatsGrams * 9);
  const carbsGrams = Math.round(remainingCalories / 4);

  // 6. Water intake
  // Base: 35ml per kg
  let waterMl = weight * 35;

  // Activity Adjustment
  if (lowerActivity === 'light') {
    waterMl += 400; // Average of +300-500
  } else if (lowerActivity === 'moderate') {
    waterMl += 650; // Average of +500-800
  } else if (lowerActivity === 'active') {
    waterMl += 1000; // Average of +800-1200
  }

  // Weather Adjustment (+400ml for hot climate)
  waterMl += 400;

  const waterIntakeLiters = parseFloat((waterMl / 1000).toFixed(1));

  return {
    dailyCalories: finalCalories,
    proteinGrams,
    fatsGrams,
    carbsGrams: Math.max(carbsGrams, 0), // Ensure no negative carbs
    waterIntakeLiters,
  };
};
