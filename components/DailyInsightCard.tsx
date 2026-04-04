import { SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { getDailyInsight } from '../services/aiService';

interface DailyInsightCardProps {
  consumedCalories: number;
  targetCalories: number;
  protein: number;
}

export function DailyInsightCard({ consumedCalories, targetCalories, protein }: DailyInsightCardProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [insight, setInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Derive today's storage key
  const todayKey = `ai_insight_${format(new Date(), 'yyyy-MM-dd')}`;

  const loadInsight = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    fadeAnim.setValue(0);

    try {
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(todayKey);
        if (cached) {
          setInsight(cached);
          setIsLoading(false);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
          return;
        }
      }

      // If no valid cache or force refresh, fetch from LLM
      const result = await getDailyInsight(consumedCalories, targetCalories, protein);

      if (result) {
        setInsight(result);
        await AsyncStorage.setItem(todayKey, result);
      } else {
        setInsight("Keep pushing! I'm here to track your progress.");

      }
    } catch (e) {
      console.warn("Failed to load AI Insight:", e);
      setInsight("Keep pushing! I'm here to track your progress.");
    }

    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [consumedCalories, targetCalories, protein, todayKey, fadeAnim]);

  useEffect(() => {
    // Only attempt to load if targets exist to prevent dummy calls on initial render
    if (targetCalories > 0) {
      loadInsight(false);
    }
  }, [targetCalories]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadInsight(true);
  };

  const handleTap = () => {
    Haptics.selectionAsync();
    router.push('/ai-coach');
  };

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
          <View style={[styles.iconBox, { backgroundColor: colors.accentLight }]}>
            <HugeiconsIcon icon={SparklesIcon} size={14} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.textSecondary }]}>
            AI Insight
          </Text>
        </View>

        <TouchableOpacity onPress={handleRefresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.refreshText, { color: colors.textTertiary }]}>Reload</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ opacity: fadeAnim, minHeight: 24, justifyContent: 'center' }}>
        {isLoading ? (
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
    </TouchableOpacity>
  );
}

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
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
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
