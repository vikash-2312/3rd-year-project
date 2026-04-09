import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
  Footprints, 
  FireIcon, 
  RulerIcon, 
  Moon02Icon, 
  RefreshIcon, 
  AlertCircleIcon,
  SmartWatch01Icon,
  Pulse01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useUser } from '@clerk/expo';
import { useHealthData } from '../hooks/useHealthData';
import { useTheme } from '../lib/ThemeContext';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { format } from 'date-fns';

export const HealthDashboard: React.FC = () => {
  const { user } = useUser();
  const { data, loading, error, isAvailable, refresh } = useHealthData(user?.id);
  const { colors, isDark } = useTheme();
  const [lastSynced, setLastSynced] = React.useState<Date>(new Date());

  const dotOpacity = useSharedValue(1);

  React.useEffect(() => {
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  React.useEffect(() => {
    if (!loading && !error) {
      setLastSynced(new Date());
    }
  }, [loading, error]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const theme = {
    background: colors.background,
    card: colors.card,
    text: colors.text,
    subtext: colors.textSecondary,
    border: colors.border,
    accent: colors.accent,
    error: colors.danger,
  };

  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <HugeiconsIcon icon={AlertCircleIcon} color={theme.subtext} size={24} />
        <Text style={[styles.errorText, { color: theme.subtext, marginTop: 8 }]}>Health Connect not available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <HugeiconsIcon icon={SmartWatch01Icon} color={theme.accent} size={24} />
            <Text style={[styles.title, { color: theme.text }]}>Health Activity</Text>
          </View>
          <View style={styles.syncStatus}>
            <Animated.View style={[styles.statusDot, dotStyle]} />
            <Text style={[styles.syncText, { color: colors.textTertiary }]}>
              Synced {format(lastSynced, 'HH:mm')}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={refresh} disabled={loading} style={styles.refreshBtn}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <HugeiconsIcon icon={RefreshIcon} color={theme.accent} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {/* Steps */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <HugeiconsIcon icon={Footprints} color="#4ADE80" size={24} />
            <Text style={[styles.cardValue, { color: theme.text }]}>{data.steps}</Text>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>Steps Today</Text>
          </View>

          {/* Calories */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <HugeiconsIcon icon={FireIcon} color="#FB923C" size={24} />
            <Text style={[styles.cardValue, { color: theme.text }]}>{data.calories} kcal</Text>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>Burned</Text>
          </View>

          {/* Distance */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <HugeiconsIcon icon={RulerIcon} color="#60A5FA" size={24} />
            <Text style={[styles.cardValue, { color: theme.text }]}>{data.distance} km</Text>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>Distance</Text>
          </View>

        {/* Sleep */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <HugeiconsIcon icon={Moon02Icon} color="#A78BFA" size={24} />
          <Text style={[styles.cardValue, { color: theme.text }]}>{data.sleepHours} hrs</Text>
          <Text style={[styles.cardLabel, { color: theme.subtext }]}>Last Night</Text>
        </View>

        {/* Heart Rate */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <HugeiconsIcon icon={Pulse01Icon} color="#F43F5E" size={24} />
          <Text style={[styles.cardValue, { color: theme.text }]}>{data.avgHeartRate} bpm</Text>
          <Text style={[styles.cardLabel, { color: theme.subtext }]}>Avg Heart Rate</Text>
        </View>
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    marginTop: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    gap: 4,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 34,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  card: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
