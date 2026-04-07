import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { ProgressPhoto, getDayNumber } from '../../services/progressPhotoService';

interface TransformationInsightProps {
  photos: ProgressPhoto[];
  streakCount: number;
}

export function TransformationInsight({ photos, streakCount }: TransformationInsightProps) {
  const { colors, isDark } = useTheme();

  if (photos.length === 0) return null;

  const firstPhoto = photos[0];
  const lastPhoto = photos[photos.length - 1];
  const dayDiff = getDayNumber(lastPhoto, firstPhoto);

  // Weight insight
  const getWeightInsight = (): { text: string; emoji: string } | null => {
    const photosWithWeight = photos.filter(p => p.weight !== undefined && p.weight !== null);
    if (photosWithWeight.length < 2) return null;

    const firstW = photosWithWeight[0].weight!;
    const lastW = photosWithWeight[photosWithWeight.length - 1].weight!;
    const diff = lastW - firstW;
    const absStr = Math.abs(diff).toFixed(1);

    const timeDiff = getDayNumber(photosWithWeight[photosWithWeight.length - 1], photosWithWeight[0]);
    let timeLabel = '';
    if (timeDiff <= 7) timeLabel = 'this week';
    else if (timeDiff <= 14) timeLabel = 'in 2 weeks';
    else if (timeDiff <= 30) timeLabel = 'this month';
    else timeLabel = `in ${Math.ceil(timeDiff / 30)} months`;

    if (diff < 0) {
      return { text: `−${absStr} kg ${timeLabel}`, emoji: '💪' };
    } else if (diff > 0) {
      return { text: `+${absStr} kg ${timeLabel}`, emoji: '🔥' };
    }
    return { text: `Maintaining weight`, emoji: '⚖️' };
  };

  // Streak insight
  const getStreakInsight = (): { text: string; emoji: string } => {
    if (streakCount >= 7) return { text: `${streakCount} day streak`, emoji: '🏆' };
    if (streakCount >= 3) return { text: `${streakCount} day streak`, emoji: '🔥' };
    if (streakCount >= 1) return { text: `${streakCount} day streak`, emoji: '⭐' };
    return { text: 'Log today!', emoji: '💫' };
  };

  // Journey insight
  const getJourneyInsight = (): { text: string; emoji: string } => {
    if (photos.length === 1) return { text: 'Journey started!', emoji: '🚀' };
    if (dayDiff <= 7) return { text: `${dayDiff} days of progress`, emoji: '📈' };
    if (dayDiff <= 30) return { text: `${Math.ceil(dayDiff / 7)} weeks tracked`, emoji: '📊' };
    return { text: `${Math.ceil(dayDiff / 30)} months strong`, emoji: '💎' };
  };

  const weightInsight = getWeightInsight();
  const streakInsight = getStreakInsight();
  const journeyInsight = getJourneyInsight();

  const insights = [
    ...(weightInsight ? [{ ...weightInsight, color: isDark ? '#68D391' : '#009050', bg: isDark ? '#1C3829' : '#F0FFF4' }] : []),
    { ...streakInsight, color: isDark ? '#FC8181' : '#E53E3E', bg: isDark ? '#3B1A1A' : '#FFF5F5' },
    { ...journeyInsight, color: isDark ? '#63B3ED' : '#3182CE', bg: isDark ? '#1A2A3B' : '#EBF8FF' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Transformation Insights</Text>
      <View style={styles.pillsRow}>
        {insights.map((insight, index) => (
          <Animated.View
            key={index}
            entering={FadeInDown.delay(index * 100).duration(400)}
            style={[styles.pill, { backgroundColor: insight.bg }]}
          >
            <Text style={styles.pillEmoji}>{insight.emoji}</Text>
            <Text style={[styles.pillText, { color: insight.color }]} numberOfLines={1}>
              {insight.text}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    gap: 6,
  },
  pillEmoji: {
    fontSize: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
