import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { ProgressPhoto, getDayNumber } from '../../services/progressPhotoService';
import { AchievementCard } from './AchievementCard';

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

  const achievements = [];

  // 1. Streak Achievement
  if (streakCount >= 7) {
    achievements.push({
      title: 'Consistency King',
      subtitle: `${streakCount} day streak`,
      emoji: '🏆',
      color: colors.warning,
      bg: isDark ? '#2D2914' : '#FFFFF0',
    });
  } else if (streakCount >= 3) {
    achievements.push({
      title: 'Heat Streak',
      subtitle: `${streakCount} days active`,
      emoji: '🔥',
      color: colors.danger,
      bg: isDark ? '#3B1A1A' : '#FFF5F5',
    });
  }

  // 2. Photos Achievement
  if (photos.length >= 10) {
    achievements.push({
      title: 'Archive Master',
      subtitle: '10+ photos logged',
      emoji: '📸',
      color: colors.accent,
      bg: isDark ? '#1C3829' : '#F0FFF4',
    });
  } else if (photos.length >= 1) {
    achievements.push({
      title: 'Journey Hero',
      subtitle: 'First step taken',
      emoji: '🚀',
      color: colors.blue,
      bg: isDark ? '#1A2A3B' : '#EBF8FF',
    });
  }

  // 3. Time Achievement
  if (dayDiff >= 30) {
    achievements.push({
      title: 'Month Strong',
      subtitle: '30+ days tracked',
      emoji: '💎',
      color: colors.purple,
      bg: isDark ? '#2D2140' : '#F8F4FF',
    });
  } else if (dayDiff >= 7) {
    achievements.push({
      title: 'Week 1 Done',
      subtitle: '7 days of progress',
      emoji: '📈',
      color: colors.blue,
      bg: isDark ? '#14292F' : '#F0FBFF',
    });
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Achievements</Text>
      <View style={styles.badgeGrid}>
        {achievements.map((item, index) => (
          <AchievementCard
            key={index}
            index={index}
            title={item.title}
            subtitle={item.subtitle}
            emoji={item.emoji}
            color={item.color}
            bgColor={item.bg}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
