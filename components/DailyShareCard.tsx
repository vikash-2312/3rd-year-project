import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  FlashIcon, 
  ChampionIcon, 
  DropletIcon as WaterIcon, 
  Activity01Icon,
  BeefIcon as ProteinIcon,
  Timer02Icon as DateIcon,
  SparklesIcon,
  Moon02Icon as SleepIcon,
  WalkingIcon as StepsIcon
} from '@hugeicons/core-free-icons';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width;
const CARD_HEIGHT = (width * 16) / 9;

interface DailyShareCardProps {
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

export const DailyShareCard: React.FC<DailyShareCardProps> = ({ stats }) => {
  const dateStr = format(new Date(), 'MMMM do, yyyy');
  
  const getVerdict = (score: number) => {
    if (score >= 90) return "ELITE PERFORMANCE";
    if (score >= 70) return "DIALED IN";
    if (score >= 50) return "CONSISTENT GROWTH";
    return "BUILDING MOMENTUM";
  };

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#111827', '#1E293B', '#0F172A']}
        style={styles.background}
      >
        {/* Header & Health Score */}
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <View style={styles.dateBadge}>
                    <HugeiconsIcon icon={DateIcon} size={14} color="#009050" />
                    <Text style={styles.dateText}>{dateStr.toUpperCase()}</Text>
                </View>
                <Text style={styles.verdictText}>{getVerdict(stats.healthScore)}</Text>
            </View>
            
            <View style={styles.scoreCircle}>
                <LinearGradient
                    colors={['#009050', '#00C853']}
                    style={styles.scoreGradient}
                >
                    <Text style={styles.scoreValue}>{stats.healthScore}</Text>
                    <Text style={styles.scoreLabel}>SCORE</Text>
                </LinearGradient>
            </View>
        </View>

        <View style={styles.gridSection}>
            <View style={styles.gridRow}>
                <MetricBox 
                    icon={FlashIcon} 
                    label="CALORIES" 
                    value={stats.calories} 
                    target={stats.targetCalories} 
                    unit="kcal" 
                    color="#FFAB00"
                />
                <MetricBox 
                    icon={ProteinIcon} 
                    label="PROTEIN" 
                    value={stats.protein} 
                    target={stats.targetProtein} 
                    unit="g" 
                    color="#FF5252"
                />
            </View>
            <View style={styles.gridRow}>
                <MetricBox 
                    icon={StepsIcon} 
                    label="STEPS" 
                    value={stats.steps} 
                    target={stats.targetSteps} 
                    unit="" 
                    color="#448AFF"
                />
                <MetricBox 
                    icon={Activity01Icon} 
                    label="ACTIVE" 
                    value={stats.exerciseMinutes} 
                    target={stats.targetExercise} 
                    unit="min" 
                    color="#60A5FA"
                />
            </View>
            <View style={styles.gridRow}>
                <MetricBox 
                    icon={WaterIcon} 
                    label="HYDRATION" 
                    value={stats.water.toFixed(1)} 
                    target={stats.targetWater} 
                    unit="L" 
                    color="#00BCD4"
                />
                <MetricBox 
                    icon={SleepIcon} 
                    label="SLEEP" 
                    value={stats.sleepHours.toFixed(1)} 
                    target={stats.targetSleep} 
                    unit="hrs" 
                    color="#A78BFA"
                />
            </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
            <View style={styles.logoRow}>
                <HugeiconsIcon icon={SparklesIcon} size={20} color="#009050" />
                <Text style={styles.logoText}>AI CAL TRACK</Text>
            </View>
            <Text style={styles.watermark}>ELITE PERFORMANCE TRACKING</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const MetricBox = ({ icon, label, value, target, unit, color }: any) => (
    <View style={styles.metricBox}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            <HugeiconsIcon icon={icon} size={20} color={color} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={styles.valueRow}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricUnit}>{unit}</Text>
        </View>
        <View style={styles.progressTrack}>
            <View 
                style={[
                    styles.progressFill, 
                    { 
                        backgroundColor: color, 
                        width: `${Math.min((Number(value) / target) * 100, 100)}%` 
                    }
                ]} 
            />
        </View>
    </View>
);

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
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  verdictText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 16,
  },
  scoreGradient: {
    flex: 1,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  scoreValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
  },
  gridSection: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 12,
  },
  metricValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  metricUnit: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  watermark: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  }
});
