import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ExercisePR {
  weight: number;
  reps: number;
  date: string;
}

/**
 * Fetches the Personal Record (Max Weight) for a specific user and exercise.
 * Optimized to fetch the most recent relevant logs and find the max weight.
 */
export async function getExercisePR(userId: string, exerciseName: string): Promise<ExercisePR | null> {
  if (!userId || !exerciseName) return null;

  try {
    const logsRef = collection(db, 'logs');
    const q = query(
      logsRef,
      where('userId', '==', userId),
      where('type', '==', 'exercise'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    let bestWeight = 0;
    let bestReps = 0;
    let bestDate = '';

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const detailedLogs = data.metadata?.detailedLogs || [];
      
      detailedLogs.forEach((log: any) => {
        // Match by name (case-insensitive) or partial name
        if (log.name.toLowerCase().includes(exerciseName.toLowerCase()) || 
            exerciseName.toLowerCase().includes(log.name.toLowerCase())) {
          
          const weight = parseFloat(log.maxWeight) || 0;
          if (weight > bestWeight) {
            bestWeight = weight;
            bestReps = log.repsAtMax || 0;
            bestDate = data.date;
          }
        }
      });
    });

    return bestWeight > 0 ? { weight: bestWeight, reps: bestReps, date: bestDate } : null;
  } catch (error) {
    console.error('[WorkoutService] PR Error:', error);
    return null;
  }
}

/**
 * Maps common exercise keywords to muscle groups for the heatmap.
 */
export function getMusclesFromExercise(name: string): string[] {
  const n = name.toLowerCase();
  const muscles: string[] = [];

  if (n.includes('chest') || n.includes('bench') || n.includes('fly') || n.includes('pushup')) muscles.push('chest');
  if (n.includes('back') || n.includes('row') || n.includes('pull') || n.includes('deadlift') || n.includes('lat')) muscles.push('back');
  if (n.includes('shoulder') || n.includes('press') || n.includes('lateral') || n.includes('deltoid')) muscles.push('shoulders');
  if (n.includes('bicep') || n.includes('curl')) muscles.push('biceps');
  if (n.includes('tricep') || n.includes('extension') || n.includes('dip')) muscles.push('triceps');
  if (n.includes('leg') || n.includes('squat') || n.includes('quad') || n.includes('lunges')) muscles.push('legs');
  if (n.includes('calf')) muscles.push('calves');
  if (n.includes('abs') || n.includes('core') || n.includes('plank') || n.includes('crunch')) muscles.push('abs');
  if (n.includes('glute') || n.includes('hip')) muscles.push('glutes');

  return [...new Set(muscles)];
}
