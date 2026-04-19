import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  SparklesIcon,
  FlashIcon,
  ChampionIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon as MissIcon,
} from '@hugeicons/core-free-icons';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width;
const CARD_HEIGHT = (width * 16) / 9;

interface VsAiChallengeCardProps {
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

interface ChallengeRowProps {
  label: string;
  aiTarget: string;
  userActual: string;
  won: boolean;
}

const ChallengeRow: React.FC<ChallengeRowProps> = ({ label, aiTarget, userActual, won }) => (
  <View style={styles.challengeRow}>
    <View style={styles.challengeLabel}>
      <Text style={styles.challengeLabelText}>{label}</Text>
    </View>
    <View style={styles.challengeValues}>
      <View style={styles.aiSide}>
        <Text style={styles.aiValue}>{aiTarget}</Text>
      </View>
      <View style={[styles.resultBadge, { backgroundColor: won ? '#065F4620' : '#7F1D1D20' }]}>
        <HugeiconsIcon
          icon={won ? CheckmarkCircle02Icon : MissIcon}
          size={16}
          color={won ? '#10B981' : '#EF4444'}
        />
      </View>
      <View style={styles.userSide}>
        <Text style={[styles.userValue, { color: won ? '#10B981' : '#F87171' }]}>{userActual}</Text>
      </View>
    </View>
  </View>
);

export const VsAiChallengeCard: React.FC<VsAiChallengeCardProps> = ({ stats }) => {
  const dateStr = format(new Date(), 'MMMM do');
  const wins = [
    stats.calories >= stats.targetCalories * 0.8,
    stats.protein >= stats.targetProtein * 0.8,
    stats.steps >= stats.targetSteps * 0.8,
    stats.water >= stats.targetWater * 0.8,
    stats.exerciseMinutes >= stats.targetExercise * 0.5,
    stats.sleepHours >= stats.targetSleep * 0.8,
  ].filter(Boolean).length;

  const totalChallenges = 6;
  const userWon = wins >= 4;

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#0C0A1D', '#1A1145', '#0F0D2E']}
        style={styles.background}
      >
        {/* Epic Header */}
        <View style={styles.header}>
          <View style={styles.versusChip}>
            <HugeiconsIcon icon={SparklesIcon} size={12} color="#A78BFA" />
            <Text style={styles.versusChipText}>{dateStr.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroTitle}>
            {userWon ? 'YOU BEAT THE' : 'ALMOST BEAT THE'}
          </Text>
          <Text style={styles.heroTitleAccent}>ALGORITHM</Text>
          <View style={styles.scoreSummary}>
            <Text style={styles.winsText}>{wins}</Text>
            <Text style={styles.vsText}>of</Text>
            <Text style={styles.winsText}>{totalChallenges}</Text>
            <Text style={styles.wonLabel}>TARGETS HIT</Text>
          </View>
        </View>

        {/* VS Split */}
        <View style={styles.splitHeader}>
          <View style={styles.splitSide}>
            <HugeiconsIcon icon={SparklesIcon} size={16} color="#A78BFA" />
            <Text style={styles.splitLabel}>AI TARGET</Text>
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitSide}>
            <HugeiconsIcon icon={ChampionIcon} size={16} color="#FBBF24" />
            <Text style={styles.splitLabel}>YOUR RESULT</Text>
          </View>
        </View>

        {/* Challenge Rows */}
        <View style={styles.challengesList}>
          <ChallengeRow
            label="⚡ Calories"
            aiTarget={`${stats.targetCalories} kcal`}
            userActual={`${stats.calories} kcal`}
            won={stats.calories >= stats.targetCalories * 0.8}
          />
          <ChallengeRow
            label="🥩 Protein"
            aiTarget={`${stats.targetProtein}g`}
            userActual={`${stats.protein}g`}
            won={stats.protein >= stats.targetProtein * 0.8}
          />
          <ChallengeRow
            label="🚶 Steps"
            aiTarget={`${(stats.targetSteps / 1000).toFixed(1)}k`}
            userActual={`${(stats.steps / 1000).toFixed(1)}k`}
            won={stats.steps >= stats.targetSteps * 0.8}
          />
          <ChallengeRow
            label="💧 Water"
            aiTarget={`${stats.targetWater}L`}
            userActual={`${stats.water.toFixed(1)}L`}
            won={stats.water >= stats.targetWater * 0.8}
          />
          <ChallengeRow
            label="🏋️ Active"
            aiTarget={`${stats.targetExercise} min`}
            userActual={`${stats.exerciseMinutes} min`}
            won={stats.exerciseMinutes >= stats.targetExercise * 0.5}
          />
          <ChallengeRow
            label="😴 Sleep"
            aiTarget={`${stats.targetSleep} hrs`}
            userActual={`${stats.sleepHours.toFixed(1)} hrs`}
            won={stats.sleepHours >= stats.targetSleep * 0.8}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.logoRow}>
            <HugeiconsIcon icon={SparklesIcon} size={16} color="#A78BFA" />
            <Text style={styles.logoText}>AI CAL TRACK</Text>
          </View>
          <Text style={styles.watermark}>
            {userWon ? '🤖🥊 HUMAN WINS TODAY' : '🤖💪 AI WINS THIS ROUND'}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 16,
    alignItems: 'center',
  },
  versusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    marginBottom: 12,
  },
  versusChipText: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTitle: {
    color: '#E2E8F0',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTitleAccent: {
    color: '#A78BFA',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: -4,
  },
  scoreSummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
  },
  winsText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
  },
  vsText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  wonLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  splitSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  splitLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  splitDivider: {
    width: 32,
  },
  challengesList: {
    gap: 6,
  },
  challengeRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  challengeLabel: {
    alignItems: 'center',
    marginBottom: 4,
  },
  challengeLabelText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  challengeValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSide: {
    flex: 1,
    alignItems: 'center',
  },
  aiValue: {
    color: '#CBD5E0',
    fontSize: 16,
    fontWeight: '800',
  },
  resultBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  userSide: {
    flex: 1,
    alignItems: 'center',
  },
  userValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  logoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  watermark: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
