import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  ChampionIcon, 
  CheckmarkCircle01Icon, 
  FlashIcon, 
  Share01Icon
} from '@hugeicons/core-free-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface WorkoutSummaryModalProps {
  isVisible: boolean;
  onClose: () => void;
  stats: {
    totalVolume: number;
    totalReps: number;
    workoutTitle: string;
  };
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({ 
  isVisible, 
  onClose, 
  stats 
}) => {
  if (!stats) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
    >
      <BlurView intensity={100} tint="dark" style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#009050', '#006B3C']}
            style={styles.card}
          >
            <View style={styles.trophyContainer}>
              <HugeiconsIcon icon={ChampionIcon} size={64} color="#FFD700" />
            </View>

            <Text style={styles.title}>Elite Session Complete!</Text>
            <Text style={styles.workoutName}>{stats.workoutTitle}</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <HugeiconsIcon icon={FlashIcon} size={24} color="#FFF" />
                <Text style={styles.statValue}>{stats.totalVolume.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Vol (kg)</Text>
              </View>

              <View style={styles.statLine} />

              <View style={styles.statBox}>
                <HugeiconsIcon icon={ChampionIcon} size={24} color="#FFF" />
                <Text style={styles.statValue}>{stats.totalReps}</Text>
                <Text style={styles.statLabel}>Total Reps</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color="#009050" />
                <Text style={styles.badgeText}>PR Logged</Text>
              </View>
              <View style={styles.badge}>
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color="#009050" />
                <Text style={styles.badgeText}>Clean Form</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.doneBtn} 
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
              }}
            >
              <Text style={styles.doneBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn}>
              <HugeiconsIcon icon={Share01Icon} size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.shareBtnText}>Share Story</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    borderRadius: 32,
    overflow: 'hidden',
  },
  card: {
    padding: 32,
    alignItems: 'center',
  },
  trophyContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 32,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLine: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#009050',
    textTransform: 'uppercase',
  },
  doneBtn: {
    backgroundColor: '#FFF',
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#006B3C',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
});
