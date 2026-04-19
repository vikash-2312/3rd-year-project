import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions,
  TextInput 
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  ChampionIcon, 
  CheckmarkCircle02Icon, 
  FlashIcon, 
  Share02Icon
} from '@hugeicons/core-free-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { WorkoutShareCard } from './WorkoutShareCard';

const { width } = Dimensions.get('window');

const AnimatedCounter = ({ value, label, delay = 0 }: { value: number, label: string, delay?: number }) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500;
    const increment = end / (duration / 16);
    
    let timer: any;
    const timeout = setTimeout(() => {
      timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 16);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (timer) clearInterval(timer);
    };
  }, [value, delay]);

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(800)} style={styles.statBox}>
      <Text style={styles.statValue}>{displayValue.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

interface WorkoutSummaryModalProps {
  isVisible: boolean;
  onClose: () => void;
  stats: {
    totalVolume: number;
    totalReps: number;
    workoutTitle: string;
  };
  activeMuscles?: string[];
  onSaveRoutine?: (title: string) => Promise<void>;
  isAlreadySaved?: boolean;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({ 
  isVisible, 
  onClose, 
  stats,
  activeMuscles = [],
  onSaveRoutine,
  isAlreadySaved = false
}) => {
  const [routineName, setRoutineName] = React.useState('');
  const [hasSaved, setHasSaved] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const viewShotRef = React.useRef(null);

  if (!stats) return null;

  const handleShare = async () => {
    try {
      setIsSharing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Elite Workout',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Sharing failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleSave = async () => {
    if (hasSaved) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onSaveRoutine) {
      await onSaveRoutine(routineName || stats.workoutTitle);
      setHasSaved(true);
    }
  };

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
            <Animated.View entering={FadeInDown.delay(200)} style={styles.trophyContainer}>
              <HugeiconsIcon icon={ChampionIcon} size={72} color="#FFD700" />
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(400)} style={styles.title}>MISSION ACCOMPLISHED</Animated.Text>
            <Animated.Text entering={FadeInDown.delay(500)} style={styles.workoutName}>{stats.workoutTitle.toUpperCase()}</Animated.Text>

            <View style={styles.statsGrid}>
              <AnimatedCounter value={stats.totalVolume} label="Volume (KG)" delay={600} />
              <View style={styles.statLine} />
              <AnimatedCounter value={stats.totalReps} label="Reps Logged" delay={800} />
            </View>

            {onSaveRoutine && !isAlreadySaved && (
              <View style={styles.saveSection}>
                {!hasSaved ? (
                  <>
                    <TextInput
                      style={styles.saveInput}
                      placeholder="Name this routine (e.g. Chest Blast)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={routineName}
                      onChangeText={setRoutineName}
                    />
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                       <Text style={styles.saveBtnText}>Save to Favorites</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.savedOverlay}>
                     <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="#FFF" />
                     <Text style={styles.savedText}>Saved to Favorites!</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={styles.doneBtn} 
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
              }}
            >
              <Text style={styles.doneBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shareBtn, isSharing && { opacity: 0.5 }]} 
              onPress={handleShare}
              disabled={isSharing}
            >
              <HugeiconsIcon icon={Share02Icon} size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.shareBtnText}>
                {isSharing ? "Generating..." : "Share Story"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Hidden Share Card for Capture */}
        <View style={styles.hiddenCardContainer} pointerEvents="none">
          <View ref={viewShotRef} collapsable={false}>
            <WorkoutShareCard stats={stats} activeMuscles={activeMuscles} />
          </View>
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
  saveSection: {
    width: '100%',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  saveInput: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  savedOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  savedText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  hiddenCardContainer: {
    position: 'absolute',
    top: -9999, // Render far off-screen
    left: -9999,
    width: width,
    zIndex: -1,
  }
});
