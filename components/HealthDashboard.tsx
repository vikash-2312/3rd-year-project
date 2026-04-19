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
  Pulse01Icon,
  PulseIcon,
  Edit01Icon,
  MobileIcon
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
  withSpring,
  FadeInDown
} from 'react-native-reanimated';
import { format, differenceInSeconds } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface HealthDashboardProps {
  onManualEntry?: () => void;
  selectedDate?: Date;
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ onManualEntry, selectedDate }) => {
  const { user } = useUser();
  const { data, loading, error, isAvailable, lastFetch, refresh } = useHealthData(user?.id, selectedDate);
  const { colors, isDark } = useTheme();
  const [lastSynced, setLastSynced] = React.useState<Date>(new Date());
  const [showCooldownMsg, setShowCooldownMsg] = React.useState(false);

  const dotOpacity = useSharedValue(1);
  const heartScale = useSharedValue(1);

  React.useEffect(() => {
    // Status Dot Pulse
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    // Heartbeat Pulse Animation
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 150 }),
        withTiming(1, { duration: 100 }),
        withTiming(1.1, { duration: 150 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, []);

  const lastLoading = React.useRef(loading);
  React.useEffect(() => {
    // Only update sync timestamp when loading transitions from true to false
    if (lastLoading.current && !loading && !error) {
      setLastSynced(new Date());
    }
    lastLoading.current = loading;
  }, [loading, error]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
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
              Synced {format(lastSynced, 'HH:mm')} {data.stepSource ? `via ${data.stepSource}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => {
            const now = Date.now();
            const diff = (now - lastFetch) / 1000;
            
            if (diff < 60 && !loading) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setShowCooldownMsg(true);
              setTimeout(() => setShowCooldownMsg(false), 2000);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refresh();
            }
          }} 
          disabled={loading} 
          style={styles.refreshBtn}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <HugeiconsIcon icon={RefreshIcon} color={showCooldownMsg ? colors.warning : theme.accent} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {showCooldownMsg && (
        <Animated.View entering={FadeInDown} style={styles.cooldownMsg}>
          <Text style={[styles.cooldownText, { color: colors.warning }]}>Sync is up to date (Wait 60s)</Text>
        </Animated.View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={() => refresh()} style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {/* Steps */}
          <Animated.View entering={FadeInDown.delay(100)} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBg, { backgroundColor: '#4ADE8015' }]}>
                <HugeiconsIcon icon={Footprints} color="#4ADE80" size={20} />
              </View>
              <View style={styles.liveBadge}>
                <View style={[styles.liveDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={styles.liveText}>TRACKING</Text>
              </View>
            </View>
            <View style={styles.valueContainer}>
               <Text style={[styles.cardValue, { color: theme.text }]}>{data.steps.toLocaleString()}</Text>
               <Text style={[styles.cardUnit, { color: theme.subtext }]}>steps</Text>
            </View>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>MOVEMENT</Text>
          </Animated.View>

          {/* Calories */}
          <Animated.View entering={FadeInDown.delay(200)} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBg, { backgroundColor: '#FB923C15' }]}>
                <HugeiconsIcon icon={FireIcon} color="#FB923C" size={20} />
              </View>
            </View>
            <View style={styles.valueContainer}>
              <Text style={[styles.cardValue, { color: theme.text }]}>{data.calories}</Text>
              <Text style={[styles.cardUnit, { color: theme.subtext }]}>kcal</Text>
            </View>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>ACTIVE BURN</Text>
          </Animated.View>

          {/* Distance */}
          <Animated.View entering={FadeInDown.delay(300)} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBg, { backgroundColor: '#60A5FA15' }]}>
                <HugeiconsIcon icon={RulerIcon} color="#60A5FA" size={20} />
              </View>
            </View>
            <View style={styles.valueContainer}>
              <Text style={[styles.cardValue, { color: theme.text }]}>{data.distance}</Text>
              <Text style={[styles.cardUnit, { color: theme.subtext }]}>km</Text>
            </View>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>DISTANCE</Text>
          </Animated.View>

        {/* Sleep */}
        <Animated.View entering={FadeInDown.delay(400)} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBg, { backgroundColor: '#A78BFA15' }]}>
              <HugeiconsIcon icon={Moon02Icon} color="#A78BFA" size={20} />
            </View>
          </View>
          <View style={styles.valueContainer}>
            <Text style={[styles.cardValue, { color: theme.text }]}>{data.sleepHours}</Text>
            <Text style={[styles.cardUnit, { color: theme.subtext }]}>hrs</Text>
          </View>
          <Text style={[styles.cardLabel, { color: theme.subtext }]}>RECOVERY</Text>
        </Animated.View>

        {/* Heart Rate */}
        <Animated.View entering={FadeInDown.delay(500)} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Animated.View style={[styles.cardIconBg, { backgroundColor: '#F43F5E15' }, heartStyle]}>
              <HugeiconsIcon icon={Pulse01Icon} color="#F43F5E" size={20} />
            </Animated.View>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: '#F43F5E' }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.valueContainer}>
            <Text style={[styles.cardValue, { color: theme.text }]}>{data.avgHeartRate}</Text>
            <Text style={[styles.cardUnit, { color: theme.subtext }]}>bpm</Text>
          </View>
          <Text style={[styles.cardLabel, { color: theme.subtext }]}>AVG PULSE</Text>
        </Animated.View>
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
    width: '48.5%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  liveText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#666',
    letterSpacing: 0.5,
  },
  valueContainer: {
    gap: 2,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardUnit: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.5,
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
  cooldownMsg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    alignSelf: 'flex-end',
    marginBottom: 12,
    marginTop: -8,
  },
  cooldownText: {
    fontSize: 11,
    fontWeight: '700',
  }
});
