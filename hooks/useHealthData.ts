import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useHealth } from '../context/HealthContext';
import { 
  getTodaySteps, 
  getCaloriesBurned, 
  getDistance, 
  getSleepData, 
  getHeartRate, 
  getStepSourceInfo,
  ensureInitialized,
  HealthData
} from '../services/healthService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { format, isToday } from 'date-fns';

export interface HealthState {
  steps: number;
  calories: number;
  distance: number;
  sleepHours: number;
  avgHeartRate: number;
}

export const useHealthData = (userId?: string, selectedDate: Date = new Date()) => {
  const isTodayDate = isToday(selectedDate);
  
  // Real-time context for "Today" (handles global state + cooldown)
  const { 
    data: sensorDataToday, 
    loading: loadingToday, 
    error: sensorErrorToday, 
    permissionGranted, 
    isAvailable, 
    refresh 
  } = useHealth();

  // Local state for historical data (or fallback)
  const [historicalData, setHistoricalData] = useState<HealthData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [manualData, setManualData] = useState<{ steps: number; sleep: number }>({ steps: 0, sleep: 0 });
  const [error, setError] = useState<string | null>(null);
  const isSyncedRef = useRef(false);

  // Determine active sensor data
  const activeSensorData = isTodayDate ? sensorDataToday : historicalData;
  const loading = isTodayDate ? loadingToday : loadingHistory;

  // Sync sensor errors
  useEffect(() => {
    if (isTodayDate && sensorErrorToday) setError(sensorErrorToday);
  }, [isTodayDate, sensorErrorToday]);

  // Fetch historical data when date changes and isn't today
  useEffect(() => {
    if (isTodayDate) {
      setHistoricalData(null);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        // Ensure initialized singleton
        const initialized = await ensureInitialized();
        if (!initialized && isMounted) {
          setError('Health Connect initialization failed');
          setLoadingHistory(false);
          return;
        }

        // Fetch metrics one by one to prevent "Binding died" IPC crashes
        const steps = await getTodaySteps(selectedDate);
        const calories = await getCaloriesBurned(selectedDate);
        const distance = await getDistance(selectedDate);
        const sleep = await getSleepData(selectedDate);
        const heartRate = await getHeartRate(selectedDate);
        const source = await getStepSourceInfo(selectedDate);

        if (isMounted) {
          setHistoricalData({
            steps,
            calories,
            distance,
            sleepHours: sleep,
            avgHeartRate: heartRate,
            stepSource: source
          });
        }
      } catch (err: any) {
        console.error('[useHealthData] History fetch failed:', err);
        if (isMounted) setError(err.message || 'Failed to fetch historical health data');
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [selectedDate, isTodayDate]);

  // Derived state: Sensor data now takes priority over manual logs
  const data = useMemo(() => {
    const sData = activeSensorData || {
      steps: 0,
      calories: 0,
      distance: 0,
      sleepHours: 0,
      avgHeartRate: 0,
      stepSource: null
    };

    const hasSensorSteps = sData.steps > 0;
    const hasSensorSleep = sData.sleepHours > 0;

    return {
      ...sData,
      steps: hasSensorSteps ? sData.steps : (manualData.steps > 0 ? manualData.steps : sData.steps),
      sleepHours: hasSensorSleep ? sData.sleepHours : (manualData.sleep > 0 ? manualData.sleep : sData.sleepHours),
      stepSource: hasSensorSteps ? sData.stepSource : (manualData.steps > 0 ? 'Manual Entry' : sData.stepSource),
    };
  }, [activeSensorData, manualData]);

  // Handle Firebase sync only once per session
  useEffect(() => {
    if (userId && isAvailable && permissionGranted && !isSyncedRef.current) {
      const userRef = doc(db, 'users', userId);
      updateDoc(userRef, { healthConnectSynced: true }).then(() => {
        isSyncedRef.current = true;
      }).catch(err => 
        console.error('[useHealthData] Failed to persist sync status:', err)
      );
    }
  }, [userId, isAvailable, permissionGranted]);

  // Real-time listener for manual logs - Date specific
  useEffect(() => {
    if (!userId) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const q = query(
      collection(db, 'logs'),
      where('userId', '==', userId),
      where('date', '==', dateStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let mSteps = 0;
      let mSleep = 0;
      let sTime = 0;
      let slTime = 0;

      snapshot.forEach((docSnap) => {
        const logData = docSnap.data();
        const timestamp = logData.timestamp?.toMillis() || 0;

        if (logData.type === 'steps') {
          if (mSteps === 0 || timestamp === 0 || timestamp > sTime) {
            mSteps = logData.steps || 0;
            sTime = timestamp;
          }
        }
        if (logData.type === 'sleep') {
          if (mSleep === 0 || timestamp === 0 || timestamp > slTime) {
            mSleep = logData.sleepHours || 0;
            slTime = timestamp;
          }
        }
      });

      setManualData(prev => {
        if (prev.steps === mSteps && prev.sleep === mSleep) return prev;
        return { steps: mSteps, sleep: mSleep };
      });
    });

    return () => unsubscribe();
  }, [userId, selectedDate]);

  return useMemo(() => ({
    data,
    loading,
    error,
    permissionGranted,
    isAvailable,
    lastFetch: (sensorDataToday as any)?.lastFetch || 0,
    refresh
  }), [data, loading, error, permissionGranted, isAvailable, sensorDataToday, refresh]);
};
