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

  const streakInsight = getStreakInsight();
  const journeyInsight = getJourneyInsight();

  const insights = [
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
