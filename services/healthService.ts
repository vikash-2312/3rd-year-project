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
}

/**
 * Checks if Health Connect is available on the device.
 */
export const isHealthConnectAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch (error) {
    console.error('[HealthService] Availability check failed:', error);
    return false;
  }
};

/**
 * Initializes and requests permissions.
 */
export const requestHealthPermissions = async (): Promise<boolean> => {
  try {
    const isInitialized = await initialize();
    if (!isInitialized) return false;

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
const getTimeRange = (daysAgo: number = 0) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysAgo);
  
  const end = daysAgo === 0 ? now : new Date(start);
  if (daysAgo !== 0) end.setHours(23, 59, 59, 999);

  return {
    operator: 'between' as const,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
};

export const getTodaySteps = async (): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: getTimeRange(0),
    });
    return result.COUNT_TOTAL || 0;
  } catch (error) {
    console.warn('[HealthService] Failed to fetch steps:', error);
    return 0;
  }
};

export const getCaloriesBurned = async (): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'TotalCaloriesBurned',
      timeRangeFilter: getTimeRange(0),
    });
    return Math.round(result.ENERGY_TOTAL?.inKilocalories || 0);
  } catch (error) {
    console.warn('[HealthService] Failed to fetch calories:', error);
    return 0;
  }
};

export const getDistance = async (): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'Distance',
      timeRangeFilter: getTimeRange(0),
    });
    const distanceResult = result as any;
    const distance = distanceResult.DISTANCE?.inKilometers || 0;
    return parseFloat(distance.toFixed(2));
  } catch (error) {
    console.warn('[HealthService] Failed to fetch distance:', error);
    return 0;
  }
};

export const getSleepData = async (): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'SleepSession',
      timeRangeFilter: getTimeRange(0),
    });
    const durationSeconds = (result as any).SLEEP_DURATION_TOTAL || 0;
    return parseFloat((durationSeconds / 3600).toFixed(1));
  } catch (error) {
    console.warn('[HealthService] Failed to fetch sleep:', error);
    return 0;
  }
};

export const getHeartRate = async (): Promise<number> => {
  try {
    const result = await aggregateRecord({
      recordType: 'HeartRate',
      timeRangeFilter: getTimeRange(0),
    });
    return Math.round(result.BPM_AVG || 0);
  } catch (error) {
    console.warn('[HealthService] Failed to fetch heart rate:', error);
    return 0;
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
