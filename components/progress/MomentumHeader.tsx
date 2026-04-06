import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  withSpring,
  Layout
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ChampionIcon, FireIcon, TrendingDown, TrendingUp } from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MomentumHeaderProps {
  currentWeight: number | string;
  targetWeight: number | null;
  initialWeight: number | null;
  streakCount: number;
  weightChange: number;
}

export function MomentumHeader({ 
  currentWeight, 
  targetWeight, 
  initialWeight, 
  streakCount, 
  weightChange 
}: MomentumHeaderProps) {
  const { colors, isDark } = useTheme();

  const progress = useMemo(() => {
    if (!targetWeight || !initialWeight || typeof currentWeight !== 'number') return 0;
    
    const totalDiff = Math.abs(initialWeight - targetWeight);
    const completedDiff = Math.abs(initialWeight - currentWeight);
    
    if (totalDiff === 0) return 0;
    return Math.min(Math.max(completedDiff / totalDiff, 0), 1);
  }, [currentWeight, targetWeight, initialWeight]);

  const progressStyle = useAnimatedStyle(() => ({
    width: withSpring(`${progress * 100}%`, { damping: 20, stiffness: 80 }),
  }));

  const isLossGoal = initialWeight && targetWeight ? targetWeight < initialWeight : true;
  const isProgressing = weightChange !== 0 && (isLossGoal ? weightChange < 0 : weightChange > 0);
  const statusColor = isProgressing ? colors.accent : (weightChange === 0 ? colors.textMuted : colors.danger);

  return (
    <Animated.View 
      entering={FadeInDown.duration(600).springify()}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Your Momentum</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {targetWeight ? `Heading towards ${targetWeight}kg` : 'Keep tracking your progress'}
          </Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: isDark ? '#3B2A1A' : '#FFF5F0' }]}>
          <HugeiconsIcon icon={FireIcon} size={16} color="#FF6B00" />
          <Text style={styles.streakText}>{streakCount}</Text>
        </View>
      </View>

      {/* Progress Bar Section */}
      <View style={styles.progressSection}>
        <View style={styles.weightLabels}>
          <Text style={[styles.weightLabelText, { color: colors.textSecondary }]}>
            {initialWeight ? `${initialWeight}kg` : '--'}
          </Text>
          <Text style={[styles.weightLabelText, { color: colors.textSecondary }]}>
            {targetWeight ? `${targetWeight}kg` : 'Goal'}
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#2D3748' : '#E2E8F0' }]}>
          <Animated.View style={[styles.progressFill, progressStyle]}>
            <LinearGradient
              colors={[colors.accent, isDark ? '#00F5D4' : '#319795']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={styles.currentPosition}>
          <Text style={[styles.progressPercent, { color: colors.accent }]}>
             {Math.round(progress * 100)}% of goal reached
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={[styles.statsGrid, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Current</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{currentWeight}kg</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Change</Text>
          <View style={styles.changeRow}>
            <HugeiconsIcon 
              icon={weightChange <= 0 ? TrendingDown : TrendingUp} 
              size={14} 
              color={statusColor} 
            />
            <Text style={[styles.statValue, { color: statusColor, marginLeft: 4 }]}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}kg
            </Text>
          </View>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Active</Text>
          <Text style={[styles.statValue, { color: colors.blue }]}>{streakCount} days</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B00',
  },
  progressSection: {
    marginBottom: 20,
  },
  weightLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weightLabelText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  currentPosition: {
    marginTop: 8,
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    opacity: 0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
