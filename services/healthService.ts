import {
  initialize,
  requestPermission,
  readRecords,
  aggregateRecord,
  getSdkStatus,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';
import { Platform } from 'react-native';

const PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

export interface HealthData {
  steps: number;
  calories: number;
  distance: number;
  sleepHours: number;
  avgHeartRate: number;
  stepSource?: string | null;
}

const APP_PACKAGE_MAP: Record<string, string> = {
  'com.google.android.apps.fitness': 'Google Fit',
  'com.samsung.android.app.shealth': 'Samsung Health',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.ouraring.oura': 'Oura',
  'com.fitbit.watch': 'Fitbit Watch',
};

let initPromise: Promise<boolean> | null = null;
let isInitialized = false;

/**
 * Ensures Health Connect is initialized using a singleton pattern
 * to prevent parallel IPC calls which can cause "Binding died" errors.
 */
export const ensureInitialized = async (): Promise<boolean> => {
  if (isInitialized) return true;
  
  if (initPromise) {
    console.log('[HealthService] Waiting for existing initialization...');
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log('[HealthService] Starting initialization...');
      isInitialized = await initialize();
      if (!isInitialized) {
        initPromise = null; // Allow retry if it returned false
      }
      return isInitialized;
    } catch (error: any) {
      console.error('[HealthService] Initialization failed:', error);
      initPromise = null;
      isInitialized = false;
      return false;
    }
  })();

  return initPromise;
};

/**
 * Diagnostic helper to detect and recover from "Binding died" errors.
 */
const handleHealthError = (error: any, metricName: string) => {
  const msg = error?.message || '';
  console.warn(`[HealthService] Failed to fetch ${metricName}:`, msg);
  
  if (msg.includes('Binding') || msg.includes('RemoteException')) {
    console.log('[HealthService] Detecting IPC failure, resetting connection state...');
    isInitialized = false;
    initPromise = null;
  }
};

/**
 * Checks if Health Connect is available on the device.
 */
export const isHealthConnectAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    // Check if getSdkStatus is actually a function in case of linking issues
    if (typeof getSdkStatus !== 'function') return false;
    
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch (error: any) {
    // Silently handle linking errors in Expo Go or non-dev builds
    if (error?.message?.includes('linked') || error?.message?.includes('hook')) {
      return false;
    }
    console.error('[HealthService] Availability check failed:', error);
    return false;
  }
};

/**
 * Initializes and requests permissions.
 */
export const requestHealthPermissions = async (): Promise<boolean> => {
  try {
    const initialized = await ensureInitialized();
    if (!initialized) return false;

    const granted = await requestPermission(PERMISSIONS);
    return granted.length > 0;
  } catch (error) {
    console.error('[HealthService] Permission request failed:', error);
    return false;
  }
};

/**
 * Common time range helper.
 */
const getTimeRange = (daysAgo: number = 0, baseDate: Date = new Date()) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysAgo);
  
  const end = new Date(start);
  if (daysAgo === 0 && baseDate.toDateString() === new Date().toDateString()) {
    // For today, end is 'now'
    const actualNow = new Date();
    end.setHours(actualNow.getHours(), actualNow.getMinutes(), actualNow.getSeconds(), actualNow.getMilliseconds());
  } else {
    // For other days or specific bases, end is end of that day
    end.setHours(23, 59, 59, 999);
  }

  return {
    operator: 'between' as const,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
};

export const getTodaySteps = async (date: Date = new Date()): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: getTimeRange(0, date),
    });
    return result.COUNT_TOTAL || 0;
  } catch (error) {
    handleHealthError(error, 'steps');
    return 0;
  }
};

export const getCaloriesBurned = async (date: Date = new Date()): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'TotalCaloriesBurned',
      timeRangeFilter: getTimeRange(0, date),
    });
    return Math.round(result.ENERGY_TOTAL?.inKilocalories || 0);
  } catch (error) {
    console.warn('[HealthService] Failed to fetch calories:', error);
    return 0;
  }
};

export const getDistance = async (date: Date = new Date()): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'Distance',
      timeRangeFilter: getTimeRange(0, date),
    });
    const distanceResult = result as any;
    const distance = distanceResult.DISTANCE?.inKilometers || 0;
    return parseFloat(distance.toFixed(2));
  } catch (error) {
    console.warn('[HealthService] Failed to fetch distance:', error);
    return 0;
  }
};

export const getSleepData = async (date: Date = new Date()): Promise<number> => {
  try {
    // To accurately capture sleep (which often starts before midnight), 
    // we look for any session that ENDED during the selected day.
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Look back 24 hours from the start of the day to find sessions that might have started yesterday
    const lookbackStart = new Date(startOfDay);
    lookbackStart.setDate(lookbackStart.getDate() - 1);

    const result = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: lookbackStart.toISOString(),
        endTime: endOfDay.toISOString(),
      },
    });

    // result is ReadRecordsResult, and its records property contains the data
    const records = (result as any).records || result;

    // Filter for sessions that ended within our target day window
    const sessionsToday = (Array.isArray(records) ? records : []).filter((session: any) => {
      const endTime = new Date(session.endTime);
      return endTime >= startOfDay && endTime <= endOfDay;
    });

    const totalSeconds = sessionsToday.reduce((acc, session) => {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      return acc + (end - start) / 1000;
    }, 0);

    return parseFloat((totalSeconds / 3600).toFixed(1));
  } catch (error) {
    console.warn('[HealthService] Failed to fetch sleep:', error);
    return 0;
  }
};

export const getHeartRate = async (date: Date = new Date()): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'HeartRate',
      timeRangeFilter: getTimeRange(0, date),
    });
    return Math.round(result.BPM_AVG || 0);
  } catch (error) {
    console.warn('[HealthService] Failed to fetch heart rate:', error);
    return 0;
  }
};

/**
 * Detects the source of a specific day's steps.
 */
export const getStepSourceInfo = async (date: Date = new Date()): Promise<string | null> => {
  try {
    const result = await readRecords('Steps', {
      timeRangeFilter: getTimeRange(0, date),
      ascendingOrder: false,
      pageSize: 5
    });

    if (result.records.length === 0) return null;

    // Check the most recent record
    const latest = result.records[0];
    const packageName = latest.metadata?.dataOrigin;
    const device = (latest.metadata as any)?.device;

    let source = 'Phone';

    // 1. Check device type if explicitly available
    if (device?.type === 'watch' || device?.type === 2) {
      source = 'Watch';
    }

    // 2. Map package names to friendly names
    if (packageName && APP_PACKAGE_MAP[packageName]) {
      const appName = APP_PACKAGE_MAP[packageName];
      // Combine if it's a known watch app
      if (source === 'Watch') {
        return `${appName} Watch`;
      }
      return appName;
    }

    return source;
  } catch (error) {
    console.warn('[HealthService] Failed to detect source:', error);
    return null;
  }
};


/**
 * Fetches data for the last 7 days.
 */
export const getWeeklyHealthSummary = async () => {
  const summary = [];
  for (let i = 0; i < 7; i++) {
    const timeRange = getTimeRange(i);
    try {
      const [steps, calories, distance] = await Promise.all([
        aggregateRecord({ recordType: 'Steps', timeRangeFilter: timeRange }),
        aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter: timeRange }),
        aggregateRecord({ recordType: 'Distance', timeRangeFilter: timeRange }),
      ]);
      
      summary.push({
        date: new Date(timeRange.startTime).toLocaleDateString(),
        steps: steps.COUNT_TOTAL || 0,
        calories: Math.round(calories.ENERGY_TOTAL?.inKilocalories || 0),
        distance: parseFloat(((distance as any).DISTANCE?.inKilometers || 0).toFixed(2)),
      });
    } catch (e) {
      console.warn(`[HealthService] Failed for day -${i}:`, e);
    }
  }
  return summary;
};
