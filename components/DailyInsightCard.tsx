import { SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  AppState,
} from 'react-native';
import Reanimated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate
} from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';
import { getDailyInsight } from '../services/aiService';

interface DailyInsightCardProps {
  consumedCalories: number;
  targetCalories: number;
  protein: number;
  date: Date;
  userId: string;
}

export const DailyInsightCard = React.memo(({ consumedCalories, targetCalories, protein, date, userId }: DailyInsightCardProps) => {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [insight, setInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastAnalyzed, setLastAnalyzed] = useState({ kcal: 0, protein: 0, target: 0 });
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const currentInsight = useRef<string>('');
  const debounceTimer = useRef<any>(null);
  const isInitialMount = useRef(true);
  const pulse = useSharedValue(1);
  const shimmerPosition = useSharedValue(-1);

  // Sync currentInsight ref so loadInsight doesn't need to depend on it
  useEffect(() => {
    currentInsight.current = insight;
  }, [insight]);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Start shimmer loop
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );

    // Midnight Awareness / Background Sync
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadInsight(false);
      }
    });

    return () => subscription.remove();
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: withTiming(isLoading ? 1 : 0.8),
  }));

  const glimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerPosition.value, [0, 1], [-300, 300]) }],
  }));

  // Derive storage key from the passed date and user
  const storageKey = `ai_insight_${userId}_${format(date, 'yyyy-MM-dd')}`;

  const loadInsight = useCallback(async (forceRefresh = false) => {
    // 0. Goal Guard: Don't think if the user hasn't set up targets yet
    if (targetCalories <= 0) {
      setInsight("Set your daily calorie goal in settings to get custom AI coaching!");
      setIsLoading(false);
      return;
    }

    // 1. If not forcing a refresh, check cache first WITHOUT shimmering
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached) {
        setInsight(cached);
        setIsLoading(false);
        setLastAnalyzed({ kcal: consumedCalories, protein, target: targetCalories });
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        return;
      }
    }

    // 2. No cache or force refresh -> Show shimmer only if we have no existing insight
    if (!currentInsight.current) {
      setIsLoading(true);
      fadeAnim.setValue(0);
    }
    
    // Background fetch
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    try {
      const result = await getDailyInsight(consumedCalories, targetCalories, protein);

      if (result) {
        // Cross-Fade if we already had a message
        if (currentInsight.current) {
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            setInsight(result);
            setLastAnalyzed({ kcal: consumedCalories, protein, target: targetCalories });
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
          });
        } else {
          setInsight(result);
          setLastAnalyzed({ kcal: consumedCalories, protein, target: targetCalories });
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }
        await AsyncStorage.setItem(storageKey, result);
      } else if (!currentInsight.current) {
        setInsight("Keep pushing! I'm here to track your progress.");
      }
    } catch (e) {
      console.warn("Failed to load AI Insight:", e);
      if (!currentInsight.current) setInsight("Keep pushing! I'm here to track your progress.");
    } finally {
      clearTimeout(safetyTimeout);
      setIsLoading(false);
    }
  }, [consumedCalories, targetCalories, protein, storageKey, fadeAnim]);

  useEffect(() => {
    // 1. On Mount or Date Change: ONLY act if Today is the target
    if (!isToday(date)) return;

    // 2. Memory-Lock: Only load from cache if we don't already have it in memory
    // This removes the flicker when returning to 'Today' from another date
    if (isInitialMount.current || !insight) {
      isInitialMount.current = false;
      loadInsight(false);
    }
    
    // Always sync our baseline for autonomous tracking when on Today's date
    setLastAnalyzed({ kcal: consumedCalories, protein, target: targetCalories });
  }, [storageKey, date]);

  useEffect(() => {
    // 2. Autonomous Refresh with Debounce (Today ONLY)
    if (!isToday(date)) return;

    const kcalDiff = Math.abs(consumedCalories - lastAnalyzed.kcal);
    const proteinDiff = Math.abs(protein - lastAnalyzed.protein);
    const targetDiff = Math.abs(targetCalories - lastAnalyzed.target);

    if (kcalDiff > 50 || proteinDiff > 5 || targetDiff > 50) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(() => {
        loadInsight(true);
      }, 1500);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [consumedCalories, protein, targetCalories, lastAnalyzed, date, storageKey]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadInsight(true);
  };

  const handleTap = () => {
    Haptics.selectionAsync();
    router.push('/ai-coach');
  };

  // ONLY show for today. By staying mounted but returning null for other days,
  // we preserve the 'insight' state so it appears instantly when you come back.
  if (!isToday(date)) return null;

  if (!insight && !isLoading) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleTap}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : '#F8FBFF',
          borderColor: isDark ? colors.border : '#E2E8F0',
        },
      ]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Reanimated.View style={[styles.iconBox, { backgroundColor: colors.accentLight }, pulseStyle]}>
            <HugeiconsIcon icon={SparklesIcon} size={14} color={colors.accent} />
          </Reanimated.View>
          <Text style={[styles.title, { color: colors.textSecondary }]}>
            AI Insight
          </Text>
        </View>

        <View>
          <Text style={[styles.statusText, { color: colors.textTertiary }]}>
            Analysis Active
          </Text>
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim, minHeight: 24, justifyContent: 'center' }}>
        {isLoading && !insight ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Analyzing macros...
            </Text>
          </View>
        ) : (
          <Text style={[styles.insightText, { color: colors.text }]}>
            {insight}
          </Text>
        )}
      </Animated.View>

      {/* Glimmer Overlay - Only show if truly loading AND no insight */}
      {isLoading && !insight && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Reanimated.View style={[styles.glimmerWrapper, glimmerStyle]}>
            <LinearGradient
              colors={['transparent', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(49,130,206,0.1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glimmer}
            />
          </Reanimated.View>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  glimmerWrapper: {
    width: 200,
    height: '100%',
    position: 'absolute',
  },
  glimmer: {
    flex: 1,
    width: '100%',
  },
  insightText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
