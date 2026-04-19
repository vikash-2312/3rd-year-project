import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MuscleHeatmap } from './MuscleHeatmap';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  ChampionIcon, 
  FlashIcon, 
  Dumbbell01Icon,
  Activity01Icon
} from '@hugeicons/core-free-icons';

const { width, height } = Dimensions.get('window');

interface WorkoutShareCardProps {
  stats: {
    totalVolume: number;
    totalReps: number;
    workoutTitle: string;
  };
  activeMuscles: string[];
}

export const WorkoutShareCard: React.FC<WorkoutShareCardProps> = ({ stats, activeMuscles }) => {
  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#1A202C', '#2D3748']}
        style={styles.background}
      >
        <View style={styles.header}>
          <Text style={styles.eliteTag}>ELITE PERFORMANCE</Text>
          <Text style={styles.workoutTitle}>{stats.workoutTitle}</Text>
        </View>

        <View style={styles.heatmapSection}>
           <MuscleHeatmap activeMuscles={activeMuscles} title="Muscles Targeted" />
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statGlass}>
             <HugeiconsIcon icon={FlashIcon} size={24} color="#009050" />
             <Text style={styles.statValue}>{stats.totalVolume.toLocaleString()}</Text>
             <Text style={styles.statLabel}>KG LIFTED</Text>
          </View>
          
          <View style={styles.statGlass}>
             <HugeiconsIcon icon={ChampionIcon} size={24} color="#009050" />
             <Text style={styles.statValue}>{stats.totalReps}</Text>
             <Text style={styles.statLabel}>TOTAL REPS</Text>
          </View>
        </View>

        <View style={styles.branding}>
          <View style={styles.logoRow}>
            <HugeiconsIcon icon={Activity01Icon} size={20} color="#009050" />
            <Text style={styles.logoText}>AI COACH</Text>
          </View>
          <Text style={styles.watermark}>elite fitness tracking</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: width,
    height: (width * 16) / 9,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 40,
  },
  eliteTag: {
    fontSize: 12,
    fontWeight: '900',
    color: '#009050',
    letterSpacing: 2,
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 40,
  },
  heatmapSection: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  statGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#718096',
    marginTop: 4,
    letterSpacing: 1,
  },
  branding: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  watermark: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 2,
  }
});
