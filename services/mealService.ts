import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../lib/firebase';

export interface FrequentMeal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  brand: string;
  serving: string;
  count: number;
}

/**
 * analyzes user logs (last 150) to find the top 5 most frequently eaten meals.
 */
export const getFrequentMeals = async (userId: string): Promise<FrequentMeal[]> => {
  try {
    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', userId),
      where('type', '==', 'food'),
      orderBy('timestamp', 'desc'),
      limit(150)
    );

    const snapshot = await getDocs(logsQuery);
    const mealMap: Record<string, any> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = data.name.toLowerCase().trim();
      
      if (!mealMap[key]) {
        mealMap[key] = {
          name: data.name,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          brand: data.brand || '',
          serving: data.serving || '1 serving',
          count: 1
        };
      } else {
        mealMap[key].count += 1;
      }
    });

    // Convert map to array, filter for meals with at least 2 occurrences, and sort
    const frequentMeals = Object.values(mealMap)
      .filter((m: any) => m.count >= 2)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5) as FrequentMeal[];

    return frequentMeals;
  } catch (error) {
    console.error('[MealService] getFrequentMeals error:', error);
    return [];
  }
};

/**
 * instantly logs a meal for today based on its historical macro data.
 */
export const quickLogMeal = async (userId: string, meal: FrequentMeal): Promise<boolean> => {
  try {
    const logData = {
      userId,
      type: 'food',
      name: meal.name,
      brand: meal.brand,
      serving: meal.serving,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      timestamp: serverTimestamp(),
      date: format(new Date(), 'yyyy-MM-dd'),
    };

    await addDoc(collection(db, 'logs'), logData);
    return true;
  } catch (error) {
    console.error('[MealService] quickLogMeal error:', error);
    return false;
  }
};

/**
 * returns a static list of common healthy meals for new users ("Starter Pack").
 */
export const getStarterMeals = (): FrequentMeal[] => {
  return [
    {
      name: '2 Large Eggs',
      calories: 143,
      protein: 12.6,
      carbs: 0.7,
      fat: 9.5,
      brand: 'Standard',
      serving: '2 units',
      count: 0
    },
    {
      name: 'Greek Yogurt',
      calories: 120,
      protein: 15,
      carbs: 6,
      fat: 2,
      brand: 'Generic',
      serving: '150g',
      count: 0
    },
    {
      name: 'Whey Protein Shake',
      calories: 130,
      protein: 25,
      carbs: 3,
      fat: 1.5,
      brand: 'Supplement',
      serving: '1 scoop',
      count: 0
    },
    {
      name: 'Chicken Breast',
      calories: 280,
      protein: 45,
      carbs: 0,
      fat: 6,
      brand: 'Cooked',
      serving: '150g',
      count: 0
    },
    {
      name: 'Peanut Butter Toast',
      calories: 190,
      protein: 7,
      carbs: 22,
      fat: 9,
      brand: 'Standard',
      serving: '1 slice',
      count: 0
    }
  ];
};
