import { calculateUserPlan } from './services/macroEngine';
import { adjustPlan } from './services/adjustmentEngine';

const testUser = {
  gender: 'male',
  birthdate: '1995-01-01', // 31 years old approx
  weight: 80,
  height: 180,
  activityLevel: 'moderate',
  goal: 'gain'
};

console.log('--- MacroEngine Test ---');
const basePlan = calculateUserPlan(testUser);
console.log('Base Plan (80kg Male, Moderate, Gain):', basePlan);

console.log('\n--- AdjustmentEngine Test ---');
const bumpedPlan = adjustPlan(basePlan, { type: 'weight_stalled' });
console.log('Adjusted Plan (+200 kcal for stall):', bumpedPlan);

if (bumpedPlan.dailyCalories === basePlan.dailyCalories + 200) {
  console.log('\n✅ TEST PASSED: Calorie adjustment is correct.');
} else {
  console.log('\n❌ TEST FAILED: Calorie adjustment mismatch.');
}

if (bumpedPlan.carbsGrams > basePlan.carbsGrams) {
  console.log('✅ TEST PASSED: Carbs correctly redistributed.');
}
