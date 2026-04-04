import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subDays, startOfWeek, addDays } from 'date-fns';

export interface StreakData {
  count: number;
  activeDays: Set<string>;
}

/**
 * Calculates the current streak given a set of active days.
 */
export function calculateStreak(activeDays: Set<string>): number {
  const today = new Date();
  let count = 0;
  let checkDate = today;
  
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Check today first
  if (activeDays.has(todayStr)) {
    count++;
    checkDate = subDays(today, 1);
  } else {
    // If no activity today, check yesterday to see if streak is still alive
    checkDate = subDays(today, 1);
    const yesterdayStr = format(checkDate, 'yyyy-MM-dd');
    if (!activeDays.has(yesterdayStr)) {
      return 0; // Streak broken
    }
  }

  // Iterate backward through all active days
  while (true) {
    const checkDateStr = format(checkDate, 'yyyy-MM-dd');
    if (activeDays.has(checkDateStr)) {
      count++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }
  return count;
}

/**
 * Subscribes to user logs and provides a Set of active dates.
 */
export function subscribeToActiveDays(
  userId: string,
  callback: (data: StreakData) => void
): () => void {
  // Query all logs for the user to determine active days
  // We could optimize this to only query the last 30 days if needed
  const logsQuery = query(
    collection(db, 'logs'),
    where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
    const activeDays = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.date) {
        activeDays.add(data.date);
      }
    });

    const count = calculateStreak(activeDays);
    callback({ count, activeDays });
  }, (error) => {
    console.error("Streak Subscription Error:", error);
  });

  return unsubscribe;
}

/**
 * Gets the week days (Sunday to Saturday) relative to today.
 */
export function getWeekDays(today: Date = new Date()): Date[] {
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
