import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  SparklesIcon, 
  ChampionIcon, 
  FlashIcon,
  Activity01Icon,
  CheckmarkCircle02Icon,
  Dumbbell01Icon
} from '@hugeicons/core-free-icons';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width;

interface Log {
  id: string;
  type: string;
  name?: string;
  calories?: number;
  metadata?: {
    totalVolume?: number;
    totalReps?: number;
    detailedLogs?: {
      name: string;
      sets: number;
      volume: number;
      maxWeight: number;
      repsAtMax: number;
    }[];
  };
}

interface DailyWorkoutCardProps {
  logs: Log[];
  stats: {
    healthScore: number;
  };
}

export const DailyWorkoutCard: React.FC<DailyWorkoutCardProps> = ({ logs, stats }) => {
  const dateStr = format(new Date(), 'EEEE, MMMM do');
  
  const workoutLog = logs.find(log => 
    log.type === 'exercise' && log.metadata && log.metadata.detailedLogs
  ) || logs.find(log => log.type === 'exercise');

  const hasWorkoutData = workoutLog && workoutLog.metadata?.detailedLogs && workoutLog.metadata.detailedLogs.length > 0;

  if (!hasWorkoutData) {
    return (
      <View style={styles.emptyCard}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.emptyBg}>
          <View style={styles.emptyIconWrap}>
            <HugeiconsIcon icon={Dumbbell01Icon} size={40} color="#334155" />
          </View>
          <Text style={styles.emptyTitle}>Rest Day</Text>
          <Text style={styles.emptyDesc}>No workout logged today.{'\n'}Recover and come back stronger 💪</Text>
        </LinearGradient>
      </View>
    );
  }

  const title = workoutLog.name || 'Elite Workout';
  const calories = workoutLog.calories || 0;
  const vol = workoutLog.metadata?.totalVolume || 0;
  const reps = workoutLog.metadata?.totalReps || 0;
  const exercises = workoutLog.metadata?.detailedLogs || [];

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#022C22', '#064E3B', '#0B0F19']}
        style={styles.background}
      >
        {/* Elite Tag */}
        <View style={styles.header}>
          <View style={styles.eliteTagWrap}>
            <View style={styles.eliteDot} />
            <Text style={styles.eliteTag}>ELITE PERFORMANCE</Text>
          </View>
          
          <Text style={styles.workoutTitle}>{title}</Text>
          
          <View style={styles.datePill}>
            <Text style={styles.dateLabel}>{dateStr.toUpperCase()}</Text>
            {calories > 0 && (
              <>
                <View style={styles.dot} />
                <Text style={styles.calorieLabel}>{calories} KCAL</Text>
              </>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <LinearGradient 
              colors={['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.04)']} 
              style={styles.statCardBg}
            >
              <HugeiconsIcon icon={FlashIcon} size={20} color="#34D399" />
              <Text style={styles.statValue}>{vol.toLocaleString()}</Text>
              <Text style={styles.statLabel}>KG LIFTED</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient 
              colors={['rgba(251,191,36,0.12)', 'rgba(251,191,36,0.04)']} 
              style={styles.statCardBg}
            >
              <HugeiconsIcon icon={ChampionIcon} size={20} color="#FBBF24" />
              <Text style={styles.statValue}>{reps}</Text>
              <Text style={styles.statLabel}>TOTAL REPS</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Exercise List */}
        <View style={styles.exerciseSection}>
          <Text style={styles.sectionTitle}>EXERCISES COMPLETED</Text>
          {exercises.map((ex, index) => (
            <View key={index} style={styles.exerciseRow}>
              <View style={styles.exIndex}>
                <Text style={styles.exIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.exInfo}>
                <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
                <Text style={styles.exMeta}>
                  {ex.sets} {ex.sets === 1 ? 'set' : 'sets'} · {ex.maxWeight > 0 ? `${ex.maxWeight}kg max` : `${ex.repsAtMax} reps`}
                </Text>
              </View>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color="#10B981" />
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.logoRow}>
            <HugeiconsIcon icon={SparklesIcon} size={16} color="#10B981" />
            <Text style={styles.logoText}>AI CAL TRACK</Text>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{stats.healthScore}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#022C22',
  },
  background: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  // Empty State
  emptyCard: {
    width: CARD_WIDTH,
    height: (CARD_WIDTH * 16) / 9,
  },
  emptyBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#94A3B8',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  eliteTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  eliteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  eliteTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#34D399',
    letterSpacing: 3,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dateLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  calorieLabel: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statCardBg: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 2,
  },
  // Exercises
  exerciseSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 2,
    marginBottom: 16,
    marginLeft: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 14,
  },
  exIndex: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIndexText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '900',
  },
  exInfo: {
    flex: 1,
  },
  exName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  exMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  // Footer
  footer: {
    paddingTop: 32,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scoreBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  scoreText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
  }
});
