import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  isHealthConnectAvailable,
  requestHealthPermissions,
  getTodaySteps,
  getCaloriesBurned,
  getDistance,
  getSleepData,
  getHeartRate,
} from '../services/healthService';

export interface HealthState {
  steps: number;
  calories: number;
  distance: number;
  sleepHours: number;
  avgHeartRate: number;
}

export const useHealthData = (userId?: string) => {
  const [data, setData] = useState<HealthState>({
    steps: 0,
    calories: 0,
    distance: 0,
    sleepHours: 0,
    avgHeartRate: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check availability
      const available = await isHealthConnectAvailable();
      setIsAvailable(available);
      if (!available) {
        setError('Health Connect is not available on this device');
        return;
      }

      // 2. Request permissions (initialization included)
      const granted = await requestHealthPermissions();
      setPermissionGranted(granted);
      if (!granted) {
        setError('Health Connect permissions denied');
        return;
      }

      // 3. Fetch data parallelly
      const [steps, calories, distance, sleep, heartRate] = await Promise.all([
        getTodaySteps(),
        getCaloriesBurned(),
        getDistance(),
        getSleepData(),
        getHeartRate(),
      ]);

      setData({
        steps,
        calories,
        distance,
        sleepHours: sleep,
        avgHeartRate: heartRate,
      });

      // Persist sync status for the onboarding checklist
      if (userId) {
        const userRef = doc(db, 'users', userId);
        updateDoc(userRef, { healthConnectSynced: true }).catch(err => 
          console.error('[useHealthData] Failed to persist sync status:', err)
        );
      }
    } catch (err: any) {
      console.error('[useHealthData] Init/Fetch failed:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Use useMemo to prevent unnecessary re-renders of consuming components
  const value = useMemo(() => ({
    data,
    loading,
    error,
    permissionGranted,
    isAvailable,
    refresh: fetchAllData
  }), [data, loading, error, permissionGranted, isAvailable, fetchAllData]);

  return value;
};
