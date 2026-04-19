import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { format } from 'date-fns';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width;
const CARD_HEIGHT = (width * 16) / 9;

interface MinimalStoryCardProps {
  stats: {
    calories: number;
    targetCalories: number;
    protein: number;
    targetProtein: number;
    steps: number;
    targetSteps: number;
    water: number;
    targetWater: number;
    exerciseMinutes: number;
    targetExercise: number;
    sleepHours: number;
    targetSleep: number;
    healthScore: number;
  };
}

export const MinimalStoryCard: React.FC<MinimalStoryCardProps> = ({ stats }) => {
  const dateStr = format(new Date(), 'EEEE, MMM do');
  const score = stats.healthScore;

  const getMessage = () => {
    if (score >= 85) return 'Absolutely dominated today.';
    if (score >= 70) return 'Dialed in and consistent.';
    if (score >= 50) return 'Progress over perfection.';
    return 'Every day is a new chance.';
  };

  const scoreColor = score >= 70 ? '#10B981' : score >= 40 ? '#FBBF24' : '#EF4444';

  // Ring constants
  const ringSize = 180;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#FAFAF9', '#F5F5F4', '#E7E5E4']}
        style={styles.background}
      >
        {/* Date */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        {/* Central Score Ring */}
        <View style={styles.scoreSection}>
          <View style={styles.ringWrapper}>
            <Svg width={ringSize} height={ringSize}>
              {/* Background ring */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke="#D6D3D1"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress ring */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke={scoreColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${ringSize / 2}, ${ringSize / 2}`}
              />
            </Svg>
            <View style={styles.scoreInner}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}</Text>
              <Text style={styles.scoreLabel}>HEALTH SCORE</Text>
            </View>
          </View>
          <Text style={styles.messageText}>{getMessage()}</Text>
        </View>

        {/* Minimal Stat Pills */}
        <View style={styles.pillsSection}>
          <View style={styles.pillRow}>
            <StatPill label="Calories" value={`${stats.calories}`} unit="kcal" />
            <StatPill label="Protein" value={`${stats.protein}`} unit="g" />
            <StatPill label="Steps" value={stats.steps >= 1000 ? `${(stats.steps / 1000).toFixed(1)}k` : `${stats.steps}`} unit="" />
          </View>
          <View style={styles.pillRow}>
            <StatPill label="Water" value={`${stats.water.toFixed(1)}`} unit="L" />
            <StatPill label="Active" value={`${stats.exerciseMinutes}`} unit="min" />
            <StatPill label="Sleep" value={`${stats.sleepHours.toFixed(1)}`} unit="hrs" />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.logoRow}>
            <HugeiconsIcon icon={SparklesIcon} size={14} color="#78716C" />
            <Text style={styles.logoText}>AI CAL TRACK</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const StatPill = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
  <View style={styles.pill}>
    <Text style={styles.pillLabel}>{label}</Text>
    <View style={styles.pillValueRow}>
      <Text style={styles.pillValue}>{value}</Text>
      {unit ? <Text style={styles.pillUnit}>{unit}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFF',
  },
  background: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  dateSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  dateText: {
    color: '#78716C',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scoreSection: {
    alignItems: 'center',
  },
  ringWrapper: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
  },
  scoreLabel: {
    color: '#A8A29E',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: -4,
  },
  messageText: {
    color: '#44403C',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  pillsSection: {
    gap: 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    alignItems: 'center',
  },
  pillLabel: {
    color: '#A8A29E',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pillValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  pillValue: {
    color: '#1C1917',
    fontSize: 18,
    fontWeight: '900',
  },
  pillUnit: {
    color: '#A8A29E',
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    color: '#78716C',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
