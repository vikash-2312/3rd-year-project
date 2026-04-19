import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { 
  isHealthConnectAvailable,
  requestHealthPermissions,
  getTodaySteps,
  getCaloriesBurned,
  getDistance,
  getSleepData, 
  getHeartRate,
  getStepSourceInfo,
  ensureInitialized,
  HealthData
} from '../services/healthService';
import { isToday as isDateToday } from 'date-fns';

interface HealthContextType {
  data: HealthData;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
  isAvailable: boolean;
  lastFetch: number;
  refresh: (force?: boolean) => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<HealthData>({
    steps: 0,
    calories: 0,
    distance: 0,
    sleepHours: 0,
    avgHeartRate: 0,
    stepSource: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const lastFetchRef = useRef<number>(0);
  const fetchInProgressRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchAllData = useCallback(async (force = false) => {
    if (fetchInProgressRef.current) return;
    
    const now = Date.now();
    if (!force && now - lastFetchRef.current < COOLDOWN_MS) {
      console.log('[HealthContext] Skipping fetch (cooldown active)');
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const available = await isHealthConnectAvailable();
      setIsAvailable(available);

      if (available) {
        const granted = await requestHealthPermissions();
        setPermissionGranted(granted);

        if (granted) {
          // 1. Ensure initialization first (Singleton handling)
          const initialized = await ensureInitialized();
          if (!initialized) return;

          // 2. Fetch data sequentially to avoid overloading the Android IPC channel
          // This prevents "Binding died" RemoteExceptions
          const steps = await getTodaySteps();
          const calories = await getCaloriesBurned();
          const distance = await getDistance();
          const sleep = await getSleepData();
          const heartRate = await getHeartRate();
          const source = await getStepSourceInfo();

          if (!isMountedRef.current) return;

          setData({
            steps,
            calories,
            distance,
            sleepHours: sleep,
            avgHeartRate: heartRate,
            stepSource: source
          });
          
          const timestamp = Date.now();
          lastFetchRef.current = timestamp;
          setLastFetch(timestamp);
        }
      }
    } catch (err: any) {
      console.error('[HealthContext] Fetch failed:', err);
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return (
    <HealthContext.Provider value={{
      data,
      loading,
      error,
      permissionGranted,
      isAvailable,
      lastFetch,
      refresh: (force) => fetchAllData(force)
    }}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};
