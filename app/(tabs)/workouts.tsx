import { useUser } from '@clerk/expo';
import {
  Activity01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  Dumbbell01Icon,
  FlashIcon,
  InformationCircleIcon,
  SparklesIcon,
  PlayIcon
} from '@hugeicons/core-free-icons';
import * as WebBrowser from 'expo-web-browser';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp, query, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  FadeInDown,
  FadeIn,
  FadeOut,
  Layout
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { db } from '../../lib/firebase';
import { WorkoutTimer } from '../../components/WorkoutTimer';
import { WorkoutSummaryModal } from '../../components/WorkoutSummaryModal';
import * as Speech from 'expo-speech';
import { CheckmarkCircle02Icon, PencilEdit02Icon, Square01Icon, ChampionIcon } from '@hugeicons/core-free-icons';
import { getExercisePR, getMusclesFromExercise, ExercisePR, getLastExerciseLog } from '../../services/workoutService';
import { MuscleHeatmap } from '../../components/MuscleHeatmap';

const { width } = Dimensions.get('window');
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  tip: string;
  alternatives?: string[]; // Bio-mechanical equivalent swaps
  rpe?: number; // Rate of Perceived Exertion (1-10)
  muscleGroups?: string[]; // Targeted muscles
}

interface WorkoutPlan {
  title: string;
  description: string;
  warmup: string[];
  exercises: Exercise[];
  cooldown: string[];
  aiNotes: string;
  estimatedCalories: number;
}

const FALLBACK_WORKOUT: WorkoutPlan = {
  title: "Elite Full-Body Performance (Elite Backup)",
  description: "A professional-grade, equipment-free routine designed for maximum muscle engagement and fat loss.",
  warmup: ["2 min Jumping Jacks", "1 min Arm Circles", "1 min Bodyweight Squats", "1 min Glute Bridges"],
  exercises: [
    { 
      name: "Tempo Push-Ups", 
      sets: "4", 
      reps: "12-15", 
      rest: "60s", 
      tip: "Lower slowly (3s), explode up. Keep core tight.",
      rpe: 8,
      muscleGroups: ["Chest", "Triceps", "Shoulders"],
      alternatives: ["Knee Push-Ups", "Incline Push-Ups"]
    },
    { 
      name: "Bulgarian Split Squats", 
      sets: "3", 
      reps: "10 per leg", 
      rest: "60s", 
      tip: "Lean slightly forward to target glutes more.",
      rpe: 9,
      muscleGroups: ["Legs", "Glutes"],
      alternatives: ["Standard Lunges", "Step-Ups"]
    },
    { 
      name: "Inverted Rows (or Floor Slides)", 
      sets: "3", 
      reps: "12", 
      rest: "60s", 
      tip: "Focus on squeezing your shoulder blades together.",
      rpe: 7,
      muscleGroups: ["Back", "Biceps"],
      alternatives: ["Superman Holds", "T-Y-W Floor Isometrics"]
    },
    { 
      name: "Mountain Climbers", 
      sets: "3", 
      reps: "45s", 
      rest: "45s", 
      tip: "Maintain a flat back and drive knees high.",
      rpe: 8,
      muscleGroups: ["Core", "Full Body"],
      alternatives: ["Plank Jacks", "Bear Crawls"]
    }
  ],
  cooldown: ["2 min Child's Pose", "1 min Hamstring Stretch"],
  aiNotes: "Since we're using our backup routine, focus intensely on mind-muscle connection. Squeeze at the top of every rep to make up for the lack of weights.",
  estimatedCalories: 280
};

const MUSCLE_GROUPS = [
  { id: 'full_body', label: 'Full Body', icon: Activity01Icon },
  { id: 'push', label: 'Push (Chest/Shoulders/Triceps)', icon: FlashIcon },
  { id: 'pull', label: 'Pull (Back/Biceps)', icon: FlashIcon },
  { id: 'legs', label: 'Legs', icon: FlashIcon },
  { id: 'core', label: 'Core & Abs', icon: FlashIcon },
];

const EQUIPMENT = [
  { id: 'none', label: 'No Equipment (Bodyweight)', icon: Activity01Icon },
  { id: 'basic', label: 'Basic (Dumbbells/Bands)', icon: Dumbbell01Icon },
  { id: 'full', label: 'Full Gym', icon: Dumbbell01Icon },
];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DURATIONS = [15, 30, 45, 60];
const LOADING_MESSAGES = [
  "INITIALIZING NEURAL CORE...",
  "ANALYZING BIOMECHANICAL HISTORY...",
  "MAPPING TARGET FIBER DENSITY...",
  "CALCULATING OPTIMAL RPE LOAD...",
  "OPTIMIZING RECOVERY WINDOWS...",
  "CONSTRUCTING ELITE BLUEPRINT..."
];

function LoadingSequence() {
  const [index, setIndex] = useState(0);
  const scanAnim = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    
    scanAnim.value = withRepeat(
      withTiming(1, { duration: 2500 }),
      -1,
      true
    );
    
    return () => clearInterval(interval);
  }, []);

  const scanStyle = useAnimatedStyle(() => ({
    top: `${scanAnim.value * 100}%`,
    opacity: withSequence(withTiming(1), withTiming(0.4), withTiming(1))
  }));

  return (
    <View style={styles.proLoadingContainer}>
      <View style={styles.blueprintFrame}>
        <HugeiconsIcon icon={FlashIcon} size={64} color="#009050" style={{ opacity: 0.1, position: 'absolute' }} />
        <Animated.View style={[styles.scanLine, scanStyle]} />
        <View style={styles.blueprintGrid}>
           {[...Array(9)].map((_, i) => (
             <View key={i} style={styles.gridBox} />
           ))}
        </View>
      </View>
      
      <View style={styles.loadingStatusRow}>
        <View style={styles.pulseDot} />
        <Text style={styles.loadingTitle}>{LOADING_MESSAGES[index]}</Text>
      </View>
      <Text style={styles.loadingSubtitle}>CONSTRUCTING YOUR PERFORMANCE MATRIX</Text>
      
      <View style={styles.loadingBarContainer}>
        <Animated.View 
          entering={FadeIn.duration(1000)}
          style={[styles.loadingBarFill, { width: `${((index + 1) / LOADING_MESSAGES.length) * 100}%` }]} 
        />
      </View>
    </View>
  );
}

// --- Elite UI Components ---

const SegmentedControl = ({ 
  options, 
  activeValue, 
  onChange 
}: { 
  options: { label: string, value: any }[], 
  activeValue: any, 
  onChange: (val: any) => void 
}) => {
  return (
    <View style={styles.segmentedContainer}>
      <BlurView intensity={20} tint="light" style={styles.segmentedBlur}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(opt.value);
            }}
            style={[
              styles.segmentedItem,
              activeValue === opt.value && styles.segmentedItemActive
            ]}
          >
            <Text style={[
              styles.segmentedText,
              activeValue === opt.value && styles.segmentedTextActive
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </BlurView>
    </View>
  );
};

const SegmentedProgressBar = ({ current, total }: { current: number, total: number }) => {
  return (
    <View style={styles.segmentedProgressRow}>
      {[...Array(total)].map((_, i) => (
        <View 
          key={i} 
          style={[
            styles.segmentTrack,
            { flex: 1 },
            i < current && styles.segmentFilled,
            i === current && styles.segmentActive
          ]} 
        />
      ))}
    </View>
  );
};

const ChunkyInput = ({ 
  value, 
  onChange, 
  step = 1, 
  unit = '', 
  placeholder = '',
  isLocked = false,
  onQuickFill
}: { 
  value: string, 
  onChange: (val: string) => void, 
  step?: number, 
  unit?: string,
  placeholder?: string,
  isLocked?: boolean,
  onQuickFill?: () => void
}) => {
  const numericValue = parseFloat(value) || 0;

  const handleAdjust = (delta: number) => {
    if (isLocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = Math.max(0, numericValue + delta);
    onChange(newVal % 1 === 0 ? newVal.toString() : newVal.toFixed(1));
  };

  return (
    <View style={styles.chunkyIntake}>
      <TouchableOpacity 
        onPress={() => handleAdjust(-step)} 
        style={styles.chunkyBtn}
        disabled={isLocked}
      >
        <Text style={styles.chunkyBtnText}>-</Text>
      </TouchableOpacity>
      
      <View style={styles.chunkyValueContainer}>
         <TextInput
            style={styles.chunkyValueText}
            value={value}
            onChangeText={onChange}
            keyboardType="numeric"
            placeholder={placeholder}
            placeholderTextColor="#A0AEC0"
            editable={!isLocked}
            selectTextOnFocus={true}
         />
         {unit ? <Text style={styles.chunkyUnit}>{unit}</Text> : null}
         {onQuickFill && (
           <TouchableOpacity onPress={onQuickFill} style={styles.quickFillBtn}>
             <HugeiconsIcon icon={FlashIcon} size={10} color="#009050" />
           </TouchableOpacity>
         )}
      </View>

      <TouchableOpacity 
        onPress={() => handleAdjust(step)} 
        style={styles.chunkyBtn}
        disabled={isLocked}
      >
        <Text style={styles.chunkyBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const SetRow = ({ 
  index, 
  onLog, 
  isCompleted, 
  onToggle,
  isBodyweight,
  initialWeight,
  initialReps,
  lastWeight,
  lastReps,
  targetReps
}: { 
  index: number, 
  onLog: (w: string, r: string) => void,
  isCompleted: boolean,
  onToggle: () => void,
  isBodyweight?: boolean,
  initialWeight?: string,
  initialReps?: string,
  lastWeight?: number,
  lastReps?: number,
  targetReps?: string
}) => {
  const [weight, setWeight] = useState(initialWeight || (isBodyweight ? 'BW' : ''));
  const [reps, setReps] = useState(initialReps || '');
  
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!isCompleted) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.02, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isCompleted]);

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    borderColor: isCompleted ? '#009050' : withTiming(pulseScale.value > 1.01 ? '#C6F6D5' : '#E2E8F0')
  }));

  // Sync with parent if it changes (e.g. remount, swap, or external clear)
  useEffect(() => {
    // If the parent log is explicitly empty/undefined, reset to appropriate defaults
    if (initialWeight === undefined) {
      setWeight(isBodyweight ? 'BW' : '');
    } else if (initialWeight !== weight) {
      setWeight(initialWeight);
    }
  }, [initialWeight, isBodyweight]);

  useEffect(() => {
    if (initialReps === undefined) {
      setReps('');
    } else if (initialReps !== reps) {
      setReps(initialReps);
    }
  }, [initialReps]);

  const isPR = useMemo(() => {
    if (!isCompleted || !lastWeight) return false;
    const curW = parseFloat(weight) || 0;
    const curR = parseInt(reps) || 0;
    return curW > lastWeight || (curW === lastWeight && curR > lastReps!);
  }, [isCompleted, weight, reps, lastWeight, lastReps]);

  return (
    <Animated.View style={[styles.setRow, isCompleted && styles.setRowCompleted, animatedRowStyle]}>
      <Text style={styles.setNumber}>Set {index + 1}</Text>
      <View style={styles.setInputGroup}>
        <ChunkyInput
          value={weight}
          onChange={(val) => {
            setWeight(val);
            onLog(val === 'BW' ? '0' : val, reps);
          }}
          onQuickFill={() => {
            const val = lastWeight ? lastWeight.toString() : '0';
            setWeight(val);
            onLog(val, reps);
          }}
          step={2.5}
          unit="kg"
          isLocked={isBodyweight && weight === 'BW'}
          placeholder="kg"
        />
        <ChunkyInput
          value={reps}
          onChange={(val) => {
            setReps(val);
            onLog(weight, val);
          }}
          onQuickFill={() => {
            const val = targetReps?.split('-')[0]?.replace(/\D/g, '') || '10';
            setReps(val);
            onLog(weight, val);
          }}
          step={1}
          placeholder="reps"
        />
      </View>

      {isPR && isCompleted && (
        <Animated.View entering={FadeIn.delay(200)} style={styles.prSetBadge}>
          <HugeiconsIcon icon={ChampionIcon} size={10} color="#FFF" />
          <Text style={styles.prSetBadgeText}>PR</Text>
        </Animated.View>
      )}

      <TouchableOpacity 
        onPress={() => {
          if (!isCompleted && isPR) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          onToggle();
        }} 
        style={styles.setCheck}
      >
        <HugeiconsIcon 
          icon={isCompleted ? CheckmarkCircle02Icon : Square01Icon} 
          size={24} 
          color={isCompleted ? "#009050" : "#CBD5E0"} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

interface ExerciseCardItemProps {
  ex: Exercise;
  index: number;
  isActive: boolean;
  displayName: string;
  isSwapped: boolean;
  onSwap: (idx: number) => void;
  onActiveSelect: (idx: number) => void;
  sessionLogs: any;
  onLogSet: (setIdx: number, w: string, r: string) => void;
  onToggleSet: (setIdx: number) => void;
  pr?: ExercisePR | null;
  isBodyweight?: boolean;
  isVoiceEnabled?: boolean;
  lastSession?: { weight: number; reps: number } | null;
  unit?: string;
}

const ExerciseCardItem: React.FC<ExerciseCardItemProps> = ({
  ex,
  index,
  isActive,
  displayName,
  isSwapped,
  onSwap,
  onActiveSelect,
  sessionLogs,
  onLogSet,
  onToggleSet,
  pr,
  isBodyweight,
  isVoiceEnabled,
  lastSession,
  unit
}) => {
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);

  useEffect(() => {
    if (isActive && isVoiceEnabled) {
      // Prevent overlapping speech
      Speech.stop();
      Speech.speak(`Next up: ${displayName}. Focus on ${ex.tip}. Aim for RPE ${ex.rpe || 8}.`, {
        pitch: 1.0,
        rate: 0.95,
      });
    }
    
    // Cleanup: Stop speaking if unmounted or inactive
    return () => {
       if (isActive) Speech.stop();
    };
  }, [isActive, isVoiceEnabled, displayName]);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.01, { duration: 1500 }), withTiming(1, { duration: 1500 })),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    borderColor: isActive ? '#009050' : '#E2E8F0',
    backgroundColor: isActive ? '#FFFFFF' : '#FFFFFF',
    shadowOpacity: isActive ? 0.15 : 0.03,
  }));

  return (
    <Animated.View 
      style={[
        styles.exerciseCard, 
        animatedStyle
      ]}
    >
      <View style={styles.exerciseHero}>
        <View style={styles.nameRow}>
          <Text style={[styles.exerciseName, isActive && styles.activeText]}>
            {displayName}
          </Text>
          {isSwapped && (
            <View style={styles.swappedBadge}>
              <Text style={styles.swappedBadgeText}>Swapped</Text>
            </View>
          )}
        </View>

        <View style={styles.intensityRow}>
          <View style={styles.setRepBadge}>
            <Text style={styles.setRepText}>{ex.sets} Sets × {ex.reps}</Text>
          </View>
          {ex.rpe && (
            <View style={styles.rpeBadge}>
              <Text style={styles.rpeText}>RPE {ex.rpe}</Text>
            </View>
          )}
          {pr && (
            <View style={styles.prBadge}>
              <HugeiconsIcon icon={ChampionIcon} size={14} color="#B7791F" />
              <Text style={styles.prText}>Best: {pr.weight}{unit || 'kg'}</Text>
            </View>
          )}
          {lastSession && (
            <View style={[styles.prBadge, { backgroundColor: '#EBF8FF', borderColor: '#90CDF4' }]}>
              <HugeiconsIcon icon={Clock01Icon} size={10} color="#3182CE" />
              <Text style={[styles.prText, { color: '#2B6CB0' }]}>Last: {lastSession.weight}{unit || 'kg'} x {lastSession.reps}</Text>
            </View>
          )}
        </View>

        <View style={styles.exerciseToolbar}>
          <TouchableOpacity 
            onPress={() => setIsFormModalVisible(true)}
            style={styles.watchFormBtn}
          >
            <HugeiconsIcon icon={PlayIcon} size={16} color="#009050" />
            <Text style={styles.watchFormText}>Form Guide</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => onSwap(index)} 
            style={styles.swapActionBtn}
          >
            <HugeiconsIcon icon={SparklesIcon} size={16} color="#009050" />
            <Text style={styles.swapActionText}>Swap Exercise</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FormMasteryModal 
        isVisible={isFormModalVisible}
        onClose={() => setIsFormModalVisible(false)}
        exercise={{ ...ex, name: displayName }}
      />

      <View style={styles.exerciseMeta}>
        <View style={styles.infoRow}>
          <HugeiconsIcon icon={InformationCircleIcon} size={16} color="#718096" />
          <Text style={styles.proTipText}>{isSwapped ? `Focus on controlled form and mind-muscle connection for ${displayName}.` : ex.tip}</Text>
        </View>

        {isActive && (
          <View style={styles.liveSetWrapper}>
            <Text style={styles.liveSetTitle}>Live Set Tracking</Text>
            {Array.from({ length: parseInt(ex.sets) || 3 }).map((_, sIdx) => {
              const setData = sessionLogs[sIdx] || {};
              return (
                <SetRow
                  key={sIdx}
                  index={sIdx}
                  isCompleted={!!setData.completed}
                  onLog={(w, r) => onLogSet(sIdx, w, r)}
                  onToggle={() => onToggleSet(sIdx)}
                  isBodyweight={isBodyweight}
                  initialWeight={setData.w}
                  initialReps={setData.r}
                  lastWeight={lastSession?.weight}
                  lastReps={lastSession?.reps}
                  targetReps={ex.reps}
                />
              );
            })}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity 
            onPress={() => onActiveSelect(index)} 
            style={[styles.trackBtn, isActive && styles.trackBtnActive]}
          >
            <Text style={[styles.trackBtnText, isActive && styles.activeText]}>
              {isActive ? "Track Mode" : "Select"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

interface FormMasteryModalProps {
  isVisible: boolean;
  onClose: () => void;
  exercise: Exercise;
}

const FormMasteryModal: React.FC<FormMasteryModalProps> = ({ isVisible, onClose, exercise }) => {
  const searchForm = async () => {
    const query = encodeURIComponent(`${exercise.name} exercise form guidance`);
    await WebBrowser.openBrowserAsync(`https://www.youtube.com/results?search_query=${query}`);
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
         <View style={styles.formModalContainer}>
            <View style={styles.formModalHeader}>
               <Text style={styles.formModalTitle}>{exercise.name}</Text>
               <TouchableOpacity onPress={onClose} style={styles.closeModalBtn}>
                  <HugeiconsIcon icon={Square01Icon} size={24} color="#718096" />
               </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formModalContent}>
               <Text style={styles.formSectionTitle}>Coach's Master Cue</Text>
               <View style={styles.tipCard}>
                  <HugeiconsIcon icon={SparklesIcon} size={20} color="#009050" />
                  <Text style={styles.tipText}>{exercise.tip}</Text>
               </View>

               <Text style={styles.formSectionTitle}>Technique Checklist</Text>
               <View style={styles.checklist}>
                  {["Controlled Eccentric", "Full Range of Motion", "Mind-Muscle Connection"].map((item, i) => (
                    <View key={i} style={styles.checklistItem}>
                       <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color="#009050" />
                       <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
               </View>

               <TouchableOpacity onPress={searchForm} style={styles.watchProBtn}>
                  <LinearGradient
                    colors={['#FF0000', '#CC0000']}
                    style={styles.watchProGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                     <HugeiconsIcon icon={PlayIcon} size={20} color="#FFF" />
                     <Text style={styles.watchProText}>Watch Masterclass Video</Text>
                  </LinearGradient>
               </TouchableOpacity>
            </ScrollView>
         </View>
      </BlurView>
    </Modal>
  );
};

/**
 * Intelligent Bodyweight Detection Engine
 */
const isBodyweightExercise = (name: string): boolean => {
  const n = (name || '').toLowerCase();
  const keywords = ['pushup', 'squat', 'plank', 'crunch', 'situp', 'dip', 'pullup', 'chinup', 'lunges', 'leg raise', 'burpee', 'mountain climber'];
  return keywords.some(k => n.includes(k));
};

/**
 * Safe Normalizer for AI Data
 * Gemini sometimes returns objects when arrays are expected.
 */
const normalizeArray = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') {
    // Sort by numeric key to preserve intended ordering from AI
    return Object.keys(data)
      .sort((a, b) => Number(a) - Number(b))
      .map(key => data[key]);
  }
  return [];
};

export default function AIWorkoutScreen() {
  const router = useRouter();
  const { user } = useUser();

  // Selection State
  const [step, setStep] = useState(0); // 0: Form, 1: Loading, 2: Result
  const [targetMuscles, setTargetMuscles] = useState('full_body');
  const [equipment, setEquipment] = useState('none');
  const [level, setLevel] = useState('Intermediate');
  const [duration, setDuration] = useState(30);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  // Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [swappedExercises, setSwappedExercises] = useState<Record<number, string>>({});
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(-1);
  const [sessionLogs, setSessionLogs] = useState<Record<number, Record<number, { w: string, r: string, completed?: boolean }>>>({});
  const [hasAcceptedSafety, setHasAcceptedSafety] = useState(false);
  const [finalStats, setFinalStats] = useState<any>(null);
  const [exercisePRs, setExercisePRs] = useState<Record<string, ExercisePR | null>>({});
  const [lastSessionLogs, setLastSessionLogs] = useState<Record<string, ExercisePR | null>>({});
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [isFocusMode, setIsFocusMode] = useState(true); // Default to Focus for better UX
  const [globalTimerVisible, setGlobalTimerVisible] = useState(false);
  const [currentRestSeconds, setCurrentRestSeconds] = useState(60);

  const [savedRoutines, setSavedRoutines] = useState<any[]>([]);
  const [isSavedLoading, setIsSavedLoading] = useState(true);
  const [loadedRoutineId, setLoadedRoutineId] = useState<string | null>(null);
  const [workoutPhase, setWorkoutPhase] = useState<'briefing' | 'training'>('briefing');
  const volumePulse = useSharedValue(1);

  const navigation = useNavigation();

  // Elite Focus: Hide Tab Bar during active workout
  React.useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: step === 2 ? { display: 'none' } : { display: 'flex' }
    });

    // Stability Patch: Ensure Tab Bar returns if component unmounts mid-workout
    return () => {
      navigation.setOptions({ tabBarStyle: { display: 'flex' } });
    };
  }, [navigation, step]);

  useEffect(() => {
    const fetchSaved = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'saved_routines'), where('userId', '==', user.id));
        const snap = await getDocs(q);
        setSavedRoutines(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Error fetching saved routines:", e);
      } finally {
        setIsSavedLoading(false);
      }
    };
    fetchSaved();
  }, [user]);

  const handleDeleteSavedRoutine = (routineId: string, routineTitle: string) => {
    Alert.alert(
      "Delete Routine",
      `Are you sure you want to delete "${routineTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'saved_routines', routineId));
              setSavedRoutines(prev => prev.filter(r => r.id !== routineId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.error("Error deleting routine:", e);
              Alert.alert("Error", "Could not delete the routine.");
            }
          }
        }
      ]
    );
  };

  const handleLoadSavedRoutine = async (routine: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWorkout(routine.workout);
    setLoadedRoutineId(routine.id);
    setWorkoutPhase('briefing'); // Always start with briefing
    setStep(2);
    setActiveExerciseIndex(0);
    setSwappedExercises({}); // Anti-corruption: Clear session state
    setSessionLogs({});    // Anti-corruption: Clear session state
    
    // Fetch PRs for the loaded workout
    if (user) {
      const prMap: Record<string, ExercisePR | null> = {};
      const lastMap: Record<string, ExercisePR | null> = {};
      const exercises = normalizeArray(routine.workout.exercises);
      for (const ex of exercises) {
        const name = (ex.name || '').trim();
        const pr = await getExercisePR(user.id, name);
        const last = await getLastExerciseLog(user.id, name);
        prMap[name] = pr;
        lastMap[name] = last;
      }
      setExercisePRs(prMap);
      setLastSessionLogs(lastMap);
    }
  };

  // NEW: Dynamic Muscle Heatmap (Recalculates whenever exercises or swaps change)
  const allTargetedMuscles = useMemo(() => {
    if (!workout) return [];
    
    const muscles = normalizeArray(workout.exercises).reduce((acc: string[], ex, i) => {
      const activeName = swappedExercises[i] || ex.name;
      const exerciseMuscles = getMusclesFromExercise(activeName);
      return [...new Set([...acc, ...exerciseMuscles])];
    }, []);
    return muscles;
  }, [workout, swappedExercises]);

  // Phase 3: Live Session Volume Calculation (with smart fallbacks)
  const currentTotalVolume = useMemo(() => {
    let vol = 0;
    const exercises = normalizeArray(workout?.exercises);
    Object.entries(sessionLogs).forEach(([exIdx, exerciseLogs]) => {
      const idx = parseInt(exIdx);
      const ex = exercises[idx];
      if (!ex) return;

      Object.values(exerciseLogs).forEach(set => {
        if (set.completed) {
          const w = parseFloat(set.w) || 0;
          // Bug Fix #5: Skip time-based reps (e.g. "45s") from volume calculation
          const rawReps = set.r || (ex.reps?.split('-')[0]) || '0';
          const isTimeBased = /s$/i.test(String(rawReps).trim());
          const r = isTimeBased ? 0 : (parseInt(rawReps) || 0);
          vol += w * r;
        }
      });
    });
    return vol;
  }, [sessionLogs, workout]);

  useEffect(() => {
    if (currentTotalVolume > 0) {
      volumePulse.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );
    }
  }, [currentTotalVolume]);

  const tickerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: volumePulse.value }],
  }));

  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.id));
      if (snap.exists()) {
        setUserProfile(snap.data().profile);
      }
    };
    fetchProfile();
  }, [user]);

  const generateWorkout = async () => {
    if (!GEMINI_API_KEY) {
      Alert.alert('Error', 'Gemini API Key missing');
      return;
    }

    if (!hasAcceptedSafety) {
       Alert.alert('Safety Required', 'Please accept the safety disclaimer to proceed.');
       return;
    }

    setStep(1);
    setIsGenerating(true);
    setWorkoutPhase('briefing'); // Landing on briefing
    setLoadedRoutineId(null);
    setSessionLogs({}); // Reset logs for new generation
    setSwappedExercises({}); // Reset swaps
    setActiveExerciseIndex(-1); // Reset index
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const prompt = `You are an elite personal trainer. Create a highly effective, production-level workout plan.
User Profile:
- Goal: ${userProfile?.goal || 'General Health'}
- Activity Level: ${userProfile?.activityLevel || 'Moderate'}
- Gender: ${userProfile?.gender || 'Not specified'}
- Current Weight: ${userProfile?.measurements?.weightKg || 70}kg

Current Selection:
- Target Muscle Group: ${MUSCLE_GROUPS.find(m => m.id === targetMuscles)?.label || targetMuscles}
- Equipment Available: ${
    equipment === 'full' ? 'Full Commercial Gym (Barbells, Dumbbells, Machines, Cables)' :
    equipment === 'basic' ? 'Basic Home Gym (Dumbbells, Resistance Bands)' :
    'No Equipment (Bodyweight Only)'
  }
- Duration: ${duration} minutes
- Intensity Level: ${level} (Selection: ${level})

SAFETY CONSTRAINTS:
- No dangerous acrobatic or high-risk movements.
- Exercises must be bio-mechanically sound for the selected ${level} level.
- No equipment mentioned that isn't selected in the equipment list.

Please generate a workout plan in JSON format only. Include:
1. A catchy title and short description.
2. A 3-5 minute warmup list.
3. A list of main exercises with name, sets, reps, rest time, a pro tip, RPE intensity (1-10), 2 bio-mechanical alternative exercise names, and primary muscle groups (e.g. ['Chest', 'Triceps']).
4. A 3-minute cooldown.
5. AI Coach notes about form and intensity.
6. A realistic calorie burn estimate for a ${userProfile?.measurements?.weightKg || 70}kg person at ${level} intensity.

Return ONLY a valid JSON object:
{
  "title": "Workout Title",
  "description": "Short description...",
  "warmup": ["step 1", "step 2"],
  "exercises": [
    { 
      "name": "Exercise Name", 
      "sets": "3", 
      "reps": "12", 
      "rest": "60s", 
      "tip": "Keep back straight",
      "rpe": 8,
      "muscleGroups": ["Chest", "Triceps"],
      "alternatives": ["Alt 1", "Alt 2"]
    }
  ],
  "cooldown": ["stretch 1"],
  "aiNotes": "Coach advice...",
  "estimatedCalories": 250
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ]
          }),
        }
      );

      const data = await response.json();

      if (data?.error) {
        console.error('Gemini API Error Object:', data.error);
        throw new Error(`Gemini API Error: ${data.error.message || 'Unknown error'}`);
      }

      const candidate = data?.candidates?.[0];
      let textResponse = candidate?.content?.parts?.[0]?.text || '';

      if (!textResponse) {
        console.error('Gemini error (Empty Text Response):', JSON.stringify(data, null, 2));
        const finishReason = candidate?.finishReason || 'UNKNOWN';
        throw new Error(`AI returned an empty response (Finish Reason: ${finishReason})`);
      }

      // Bug Fix #1: Robust JSON extraction - handles markdown blocks AND leading text
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('JSON Extraction Failed, Raw Output:', textResponse);
        throw new Error('Could not extract JSON from AI response');
      }

      let parsedData: WorkoutPlan;
      try {
        parsedData = JSON.parse(jsonMatch[0]) as WorkoutPlan;
      } catch (parseError) {
        console.error('JSON Parse Error Raw Output:', jsonMatch[0]);
        throw parseError;
      }

      setWorkout(parsedData);
      
      // Fetch PRs and Last Session for each exercise
      if (user) {
        const prMap: Record<string, ExercisePR | null> = {};
        const lastMap: Record<string, ExercisePR | null> = {};
        for (const ex of normalizeArray(parsedData.exercises)) {
          const name = (ex.name || '').trim();
          const pr = await getExercisePR(user.id, name);
          const last = await getLastExerciseLog(user.id, name);
          prMap[name] = pr;
          lastMap[name] = last;
        }
        setExercisePRs(prMap);
        setLastSessionLogs(lastMap);
      }

      setStep(2);
      setActiveExerciseIndex(0); // Start session
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('AI Generation Error:', error);
      Alert.alert(
        'Network Issue', 
        'Our AI is taking longer than expected. Loading our "Elite Pro Backup" routine so you can keep training!',
        [{ text: "Let's Go", onPress: () => {
           setWorkout(FALLBACK_WORKOUT);
           setStep(2);
           setActiveExerciseIndex(0);
        }}]
      );
    } finally {
      setIsGenerating(false);
    }
  };



  const handleSwapExercise = async (index: number) => {
    const exercises = normalizeArray(workout?.exercises);
    const ex = exercises[index];
    if (!ex) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Cycle through main exercise + all alternatives
    const alts = normalizeArray(ex.alternatives);
    const allOptions = [ex.name, ...alts].filter(Boolean);
    
    if (allOptions.length === 0) return;

    const currentName = swappedExercises[index] || ex.name;
    const currentIndex = allOptions.indexOf(currentName);
    const nextIdx = currentIndex === -1 ? 0 : (currentIndex + 1) % allOptions.length;
    const nextName = allOptions[nextIdx];

    setSwappedExercises(prev => ({
      ...prev,
      [index]: nextName
    }));

    // CRITICAL: Clear logs for this specific index when swapping to prevent data bleeding
    setSessionLogs(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    // NEW: Dynamic Data Sync for swapped exercise
    if (user) {
      const pr = await getExercisePR(user.id, nextName);
      const last = await getLastExerciseLog(user.id, nextName);
      
      setExercisePRs(prev => ({ ...prev, [nextName]: pr }));
      setLastSessionLogs(prev => ({ ...prev, [nextName]: last }));
    }
  };

  const handleFinishAndLog = async () => {
    if (!user || !workout) return;

    try {
      // Calculate Total Volume & PRs
      let totalVolume = 0;
      let totalReps = 0;
      const exerciseDetailedLogs: any[] = [];

      const exercises = normalizeArray(workout?.exercises);

      Object.entries(sessionLogs || {}).forEach(([exIdx, sets]) => {
        const idx = parseInt(exIdx);
        const ex = exercises[idx];
        if (!ex) return; 

        const displayName = swappedExercises[idx] || ex.name || 'Exercise';
        const setValues = normalizeArray(sets);
        
        let maxWeightInEx = 0;
        let repsAtMax = 0;
        let exerciseVolume = 0;

        // If no sets are logged but the exercise was checked/interacted with? 
        // We'll rely on the explicit 'completed' check for now to be safe, 
        // but we add a fallback to target reps if 'r' is missing.

        setValues.forEach(set => {
          // Audit Patch: ONLY include if explicitly marked as completed.
          // This prevents "Smart Fill" mis-clicks from polluting long-term history.
          if (!set || !set.completed) return;

          const w = parseFloat(set.w) || 0;
          
          // Smart Rep Fallback: Use entered reps, or first number in AI range (e.g. "12" from "12-15")
          const targetRepFallback = ex.reps?.split('-')[0]?.replace(/\D/g, '') || '0';
          const rawR = set.r || targetRepFallback;
          // Bug Fix #5: Skip time-based entries (e.g. "45s") from volume
          const isTimeBased = /s$/i.test(String(rawR).trim());
          const r = isTimeBased ? 0 : (parseInt(rawR) || 0);
          
          const vol = w * r;
          
          totalVolume += vol;
          exerciseVolume += vol;
          totalReps += r;
          
          if (w >= maxWeightInEx) {
            maxWeightInEx = w;
            repsAtMax = r;
          }
        });

        if (exerciseVolume > 0 || repsAtMax > 0) {
          exerciseDetailedLogs.push({
            name: displayName,
            sets: setValues.filter(s => s?.completed).length,
            volume: exerciseVolume,
            maxWeight: maxWeightInEx,
            repsAtMax: repsAtMax
          });
        }
      });

      const logData = {
        userId: user.id,
        type: 'exercise',
        name: workout.title,
        description: `AI Elite Session: ${workout.description}`,
        duration: duration,
        intensity: level, // Sync with RecentActivity.tsx
        calories: workout.estimatedCalories,
        timestamp: serverTimestamp(),
        date: format(new Date(), 'yyyy-MM-dd'),
        metadata: {
          level,
          equipment,
          targetMuscles,
          totalVolume,
          totalReps,
          exercisesSwapped: Object.keys(swappedExercises).length,
          detailedLogs: exerciseDetailedLogs,
          unit: weightUnit
        }
      };

      await addDoc(collection(db, 'logs'), logData);

      setFinalStats({ totalVolume, totalReps, workoutTitle: workout.title });
      setIsSummaryVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to log workout.');
    }
  };

  const handleCloseSummary = () => {
    // Bug Fix #7: Stop any lingering AI voice coach audio
    Speech.stop();
    setIsSummaryVisible(false);
    setFinalStats(null);
    setWorkout(null);
    setStep(0);
    setWorkoutPhase('briefing');
    setActiveExerciseIndex(-1);
    setSwappedExercises({});
    setSessionLogs({});
  };

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* Hero Section */}
      <View style={{ marginBottom: 28 }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#1A202C', letterSpacing: -0.5 }}>
          Build Your{'\n'}Workout
        </Text>
        <Text style={{ fontSize: 15, color: '#718096', marginTop: 6, fontWeight: '500' }}>
          Configure your perfect training session
        </Text>
      </View>

      {/* Quick Start - Saved Routines */}
      {savedRoutines.length > 0 && (
        <View style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#009050' }} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: 1.2 }}>Quick Start</Text>
            <Text style={{ fontSize: 11, color: '#CBD5E0', marginLeft: 'auto' }}>(Long press to delete)</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedRoutinesScroll}>
            {savedRoutines.map((routine) => (
              <TouchableOpacity 
                key={routine.id} 
                style={styles.savedRoutineCard}
                onPress={() => handleLoadSavedRoutine(routine)}
                onLongPress={() => handleDeleteSavedRoutine(routine.id, routine.title || routine.workout?.title || 'Workout')}
                delayLongPress={500}
              >
                <View style={[styles.savedRoutineIcon, { backgroundColor: '#F0FFF4' }]}>
                   <HugeiconsIcon icon={ChampionIcon} size={20} color="#009050" />
                </View>
                <Text style={styles.savedRoutineTitle} numberOfLines={1}>{routine.title || routine.workout?.title}</Text>
                <Text style={styles.savedRoutineDesc}>{routine.workout?.exercises?.length || 0} exercises</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Muscle Focus Card */}
      <View style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <Text style={styles.formCardTitle}>Muscle Focus</Text>
        </View>
        <View style={styles.grid}>
          {MUSCLE_GROUPS.map((mt) => (
            <TouchableOpacity
              key={mt.id}
              style={[styles.chip, targetMuscles === mt.id && styles.chipActive]}
              onPress={() => setTargetMuscles(mt.id)}
            >
              <HugeiconsIcon icon={mt.icon} size={20} color={targetMuscles === mt.id ? '#FFF' : '#718096'} />
              <Text style={[styles.chipText, targetMuscles === mt.id && styles.chipTextActive]}>{mt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Equipment Card */}
      <View style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <Text style={styles.formCardTitle}>Equipment</Text>
        </View>
        <View style={styles.grid}>
          {EQUIPMENT.map((eq) => (
            <TouchableOpacity
              key={eq.id}
              style={[styles.chip, equipment === eq.id && styles.chipActive]}
              onPress={() => setEquipment(eq.id)}
            >
              <HugeiconsIcon icon={eq.icon} size={20} color={equipment === eq.id ? '#FFF' : '#718096'} />
              <Text style={[styles.chipText, equipment === eq.id && styles.chipTextActive]}>{eq.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Intensity & Duration Row */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={[styles.formCard, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.formCardTitle}>Level</Text>
          <SegmentedControl 
            options={LEVELS.map(l => ({ label: l.substring(0, 3), value: l }))}
            activeValue={level}
            onChange={setLevel}
          />
        </View>
        <View style={[styles.formCard, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.formCardTitle}>Minutes</Text>
          <SegmentedControl 
            options={DURATIONS.map(d => ({ label: `${d}`, value: d }))}
            activeValue={duration}
            onChange={setDuration}
          />
        </View>
      </View>

      {/* Unit Toggle */}
      <View style={[styles.formCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text style={styles.formCardTitle}>Weight Unit</Text>
          <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 2 }}>Used for tracking volume</Text>
        </View>
        <View style={styles.unitToggle}>
          <TouchableOpacity 
            disabled={currentTotalVolume > 0}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeightUnit('kg');
            }}
            style={[styles.unitBtn, weightUnit === 'kg' && styles.unitBtnActive]}
          >
            <Text style={[styles.unitBtnText, weightUnit === 'kg' && styles.unitBtnTextActive]}>KG</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            disabled={currentTotalVolume > 0}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeightUnit('lbs');
            }}
            style={[styles.unitBtn, weightUnit === 'lbs' && styles.unitBtnActive]}
          >
            <Text style={[styles.unitBtnText, weightUnit === 'lbs' && styles.unitBtnTextActive]}>LBS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Voice Coach Toggle */}
      <View style={[styles.formCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center' }}>
             <HugeiconsIcon icon={SparklesIcon} size={20} color="#009050" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.formCardTitle}>AI Voice Coach</Text>
            <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 2 }}>Audio cues for form & timing</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsVoiceEnabled(!isVoiceEnabled);
          }}
          style={[styles.voiceToggle, isVoiceEnabled && styles.voiceToggleActive]}
        >
          <View style={[styles.voiceToggleDot, isVoiceEnabled && styles.voiceToggleDotActive]} />
        </TouchableOpacity>
      </View>

      {/* Safety Disclaimer */}
      <TouchableOpacity 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setHasAcceptedSafety(!hasAcceptedSafety);
        }}
        style={[styles.formCard, { flexDirection: 'row', alignItems: 'flex-start', gap: 12, 
          borderColor: hasAcceptedSafety ? '#C6F6D5' : '#FED7D7' }]}
      >
        <View style={[styles.safetyCheckbox, hasAcceptedSafety && styles.safetyCheckboxActive]}>
           {hasAcceptedSafety && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color="#FFF" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2D3748', marginBottom: 2 }}>Safety Disclaimer</Text>
          <Text style={{ fontSize: 12, color: '#718096', lineHeight: 18 }}>
            I am physically fit and have consulted a physician if needed. I perform these exercises at my own risk.
          </Text>
        </View>
      </TouchableOpacity>

      {/* Generate Button */}
      <Button 
        title="Generate AI Workout" 
        onPress={generateWorkout} 
        style={[styles.generateBtn, !hasAcceptedSafety && { opacity: 0.5 }]} 
      />
    </ScrollView>
  );

  const renderWorkoutBriefing = () => (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(400)}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#009050', '#006B3C']}
        style={styles.workoutHeaderGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.workoutTitleWhite}>{workout?.title}</Text>
        <Text style={styles.workoutDescWhite}>{workout?.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItemGlass}>
            <HugeiconsIcon icon={Clock01Icon} size={18} color="#FFF" />
            <Text style={styles.statTextWhite}>{duration}m</Text>
          </View>
          <View style={styles.statItemGlass}>
            <HugeiconsIcon icon={FlashIcon} size={18} color="#FFF" />
            <Text style={styles.statTextWhite}>{workout?.estimatedCalories} kcal</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.briefingSectionTitle}>Targeted Muscles</Text>
      <MuscleHeatmap activeMuscles={allTargetedMuscles} />

      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>Warming Up</Text>
        {normalizeArray(workout?.warmup).map((step: string, i: number) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.bullet} />
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.aiNoteBoxBriefing}>
        <View style={styles.aiNoteHeader}>
          <HugeiconsIcon icon={SparklesIcon} size={20} color="#009050" />
          <Text style={styles.aiNoteTitle}>Coach's Stratagem</Text>
        </View>
        <Text style={styles.aiNoteText}>{workout?.aiNotes}</Text>
      </View>

      <Button 
        title="Start Training" 
        onPress={() => {
          setWorkoutPhase('training');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }} 
        style={styles.startTrainingBtn} 
      />
      
      <TouchableOpacity onPress={() => setStep(0)} style={styles.regenerateBtn}>
        <Text style={styles.regenerateBtnText}>Back to Library</Text>
      </TouchableOpacity>
    </ScrollView>
  </Animated.View>
);

  const renderWorkout = () => (
    <Animated.View 
      entering={FadeIn.duration(500)} 
      exiting={FadeOut.duration(400)}
      style={{ flex: 1 }}
    >
      {/* Session Progress Header */}
      <View style={styles.trainingOverlayHeader}>
        <SegmentedProgressBar 
          current={activeExerciseIndex + 1} 
          total={normalizeArray(workout?.exercises).length} 
        />
        <View style={styles.trainingHeaderMetrics}>
          <Text style={styles.trainingProgressText}>
            EX {activeExerciseIndex + 1} of {normalizeArray(workout?.exercises).length}
          </Text>
          <Animated.View style={[styles.miniVolumeTicker, tickerAnimatedStyle]}>
            <HugeiconsIcon icon={FlashIcon} size={12} color="#009050" />
            <Text style={styles.miniVolumeValue}>{currentTotalVolume.toLocaleString()} {weightUnit}</Text>
          </Animated.View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.trainingContent} showsVerticalScrollIndicator={false}>
        <Animated.View layout={Layout.springify()} style={styles.activeExerciseWrapper}>
          {(() => {
            const ex = normalizeArray(workout?.exercises)[activeExerciseIndex];
            if (!ex) return null;
            return (
              <ExerciseCardItem
                key={`${workout?.title}-${activeExerciseIndex}`}
                ex={ex}
                index={activeExerciseIndex}
                isActive={true}
                displayName={swappedExercises[activeExerciseIndex] || ex.name || 'Exercise'}
                isSwapped={!!swappedExercises[activeExerciseIndex]}
                onSwap={handleSwapExercise}
                onActiveSelect={setActiveExerciseIndex}
                sessionLogs={sessionLogs[activeExerciseIndex] || {}}
                pr={exercisePRs[(swappedExercises[activeExerciseIndex] || ex.name).trim()]}
                lastSession={lastSessionLogs[(swappedExercises[activeExerciseIndex] || ex.name).trim()]}
                isBodyweight={isBodyweightExercise(swappedExercises[activeExerciseIndex] || ex.name || '')}
                isVoiceEnabled={isVoiceEnabled}
                onLogSet={(setIdx: number, w: string, r: string) => {
                  setSessionLogs(prev => ({
                    ...prev,
                    [activeExerciseIndex]: {
                      ...prev[activeExerciseIndex],
                      [setIdx]: { 
                        ...prev[activeExerciseIndex]?.[setIdx],
                        w, r 
                      }
                    }
                  }));
                }}
                onToggleSet={(setIdx: number) => {
                  const isMarkingComplete = !sessionLogs[activeExerciseIndex]?.[setIdx]?.completed;
                  if (isMarkingComplete) {
                    setCurrentRestSeconds(parseInt(ex.rest) || 60);
                    // Bug Fix #6: Only start timer if one isn't already running
                    if (!globalTimerVisible) {
                      setGlobalTimerVisible(true);
                    }
                  }
                  
                  setSessionLogs(prev => ({
                    ...prev,
                    [activeExerciseIndex]: {
                      ...prev[activeExerciseIndex],
                      [setIdx]: {
                        ...prev[activeExerciseIndex]?.[setIdx],
                        completed: isMarkingComplete
                      }
                    }
                  }));
                }}
              />
            );
          })()}

          {activeExerciseIndex < normalizeArray(workout?.exercises).length - 1 && (
            <View style={styles.nextUpSection}>
               <Text style={styles.nextUpLabel}>Next Up</Text>
               <Text style={styles.nextUpValue} numberOfLines={1}>
                 {/* Bug Fix #4: Show swapped name if next exercise was swapped */}
                 {swappedExercises[activeExerciseIndex + 1] || normalizeArray(workout?.exercises)[activeExerciseIndex + 1]?.name}
               </Text>
            </View>
          )}

          <TouchableOpacity 
            onPress={() => setWorkoutPhase('briefing')} 
            style={styles.backToBriefingBtn}
          >
            <Text style={styles.backToBriefingText}>View Workout Details</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Floating Training Console */}
      <View style={styles.floatingConsoleWrapper}>
        <View style={styles.floatingConsole}>
           <TouchableOpacity 
             disabled={activeExerciseIndex <= 0}
             onPress={() => setActiveExerciseIndex(prev => Math.max(0, prev - 1))}
             style={[styles.floatingBtn, activeExerciseIndex <= 0 && { opacity: 0.3 }]}
           >
             <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#4A5568" />
           </TouchableOpacity>

           <TouchableOpacity 
             onPress={handleFinishAndLog}
             style={styles.floatingFinishBtn}
           >
             <Text style={styles.floatingFinishText}>Finish</Text>
           </TouchableOpacity>

           {/* Bug Fix #9: Safe bounds check for forward navigation */}
           <TouchableOpacity 
             disabled={activeExerciseIndex >= (normalizeArray(workout?.exercises).length || 1) - 1}
             onPress={() => setActiveExerciseIndex(prev => Math.min(prev + 1, (normalizeArray(workout?.exercises).length || 1) - 1))}
             style={[styles.floatingBtn, activeExerciseIndex >= (normalizeArray(workout?.exercises).length || 1) - 1 && { opacity: 0.3 }]}
           >
             <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#4A5568" />
           </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
        {/* Spacer to balance header layout (replaces back button since this is a tab) */}
        <View style={styles.backButton} />
        <Text style={styles.headerTitle}>AI Workout Coach</Text>
        <View style={styles.headerRight}>
          {step === 2 ? (
            <TouchableOpacity 
              onPress={() => {
                Alert.alert(
                  "Session Options",
                  "Choose how to end your workout:",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Discard Workout", style: "destructive", onPress: handleCloseSummary },
                    { text: "Finish & Log", style: "default", onPress: handleFinishAndLog }
                  ]
                );
              }}
              style={styles.headerOptionsBtn}
            >
               <Text style={styles.headerOptionsText}>End</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      {step === 1 ? (
        <View style={styles.centerContainer}>
          <LoadingSequence />
        </View>
      ) : step === 2 ? (
        workoutPhase === 'briefing' ? renderWorkoutBriefing() : renderWorkout()
      ) : (
        renderForm()
      )}

      <WorkoutSummaryModal
        isVisible={isSummaryVisible}
        stats={finalStats}
        activeMuscles={allTargetedMuscles}
        isAlreadySaved={!!loadedRoutineId}
        onSaveRoutine={loadedRoutineId ? undefined : async (title: string) => {
           if (!user || !workout) return;
           await addDoc(collection(db, 'saved_routines'), {
              userId: user.id,
              title: title || workout.title,
              workout: workout,
              timestamp: serverTimestamp()
           });
           setSavedRoutines(prev => [{ id: 'temp-'+Date.now(), userId: user.id, title, workout }, ...prev]);
           Alert.alert('Success', 'Routine saved to your library!');
        }}
        onClose={handleCloseSummary}
      />

      {globalTimerVisible && (
        <View style={styles.globalTimerContainer}>
          <WorkoutTimer 
             initialSeconds={currentRestSeconds}
             onClose={() => setGlobalTimerVisible(false)}
          />
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    zIndex: 10,
  },
  segmentedContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  segmentedBlur: {
    flexDirection: 'row',
    backgroundColor: 'rgba(237, 242, 247, 0.5)',
    borderRadius: 16,
    padding: 4,
    gap: 4,
    overflow: 'hidden',
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentedItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#718096',
  },
  segmentedTextActive: {
    color: '#1A202C',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  formCardHeader: {
    marginBottom: 12,
  },
  formCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D3748',
  },
  startTrainingBtn: {
    marginHorizontal: 32,
    marginTop: 24,
    marginBottom: 12,
    backgroundColor: '#009050',
    height: 64,
    borderRadius: 20,
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  aiNoteBoxBriefing: {
    backgroundColor: '#F7FAFC',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  aiNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiNoteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D3748',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  briefingSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    marginLeft: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  trainingOverlayHeader: {
    paddingTop: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    zIndex: 20,
  },
  trainingHeaderMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  trainingProgressText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#CBD5E0',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  miniVolumeTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#C6F6D5',
  },
  miniVolumeValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#009050',
    fontVariant: ['tabular-nums'],
  },
  trainingContent: {
    paddingBottom: 120,
  },
  activeExerciseWrapper: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },

  backToBriefingBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  backToBriefingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    textDecorationLine: 'underline',
  },
  segmentedProgressRow: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
    marginBottom: 12,
  },
  segmentTrack: {
    backgroundColor: '#EDF2F7',
    borderRadius: 3,
  },
  segmentFilled: {
    backgroundColor: '#009050',
  },
  segmentActive: {
    backgroundColor: '#009050',
    opacity: 0.5,
  },
  quickFillBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'rgba(0,144,80,0.1)',
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  content: {
    padding: 24,
    paddingBottom: 110,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EDF2F7',
    gap: 8,
  },
  chipActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  chipTextActive: {
    color: '#FFF',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  levelBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  levelBtnActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  levelBtnText: {
    fontWeight: '700',
    color: '#4A5568',
  },
  levelBtnTextActive: {
    color: '#FFF',
  },
  durationBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  durationBtnActive: {
    backgroundColor: '#2D3748',
    borderColor: '#2D3748',
  },
  durationBtnText: {
    fontWeight: '700',
    color: '#4A5568',
  },
  durationBtnTextActive: {
    color: '#FFF',
  },
  generateBtn: {
    marginTop: 24,
    marginBottom: 8,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#009050',
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  proLoadingContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  blueprintFrame: {
    width: 200,
    height: 200,
    backgroundColor: '#F0FFF4',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(0,144,80,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 40,
  },
  blueprintGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.05,
  },
  gridBox: {
    width: '33.33%',
    height: '33.33%',
    borderWidth: 1,
    borderColor: '#009050',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#009050',
    zIndex: 10,
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  loadingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#009050',
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A202C',
    letterSpacing: 2,
  },
  loadingSubtitle: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  loadingBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 32,
    overflow: 'hidden',
  },
  nextUpSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextUpLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextUpValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 6,
  },
  prText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: '#009050',
  },
  workoutHeaderGradient: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
  },
  workoutTitleWhite: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
  },
  workoutDescWhite: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItemGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  statTextWhite: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#009050',
  },
  stepText: {
    fontSize: 15,
    color: '#4A5568',
  },
  exerciseSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  activeExerciseCard: {
    borderColor: '#009050',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#009050',
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  exerciseHero: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  exerciseToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A202C',
    marginBottom: 4,
  },
  setRepBadge: {
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  setRepText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009050',
  },
  exerciseMeta: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  proTipText: {
    fontSize: 13,
    color: '#718096',
    flex: 1,
    fontStyle: 'italic',
  },
  restSection: {
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
    paddingTop: 8,
  },
  restLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  aiNoteBox: {
    backgroundColor: '#F0FFF4',
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  aiNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#276749',
    lineHeight: 20,
    fontWeight: '500',
  },
  sessionVolumeTicker: {
    backgroundColor: '#1A202C',
    padding: 20,
    borderRadius: 28,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  volumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,144,80,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  volumeLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4ADE80',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  volumeValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
  },
  volumeUnit: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  prSetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D69E2E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    marginLeft: 8,
  },
  prSetBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  formModalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: '75%',
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  formModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2D3748',
  },
  closeModalBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formModalContent: {
    flex: 1,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 24,
  },
  tipCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F0FFF4',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#276749',
    lineHeight: 20,
    fontWeight: '500',
  },
  checklist: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 16,
  },
  checklistText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  watchProBtn: {
    marginTop: 32,
    marginBottom: 40,
  },
  watchProGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderRadius: 20,
  },
  watchProText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  finishBtn: {
    height: 56,
    alignSelf: 'center',
    width: '80%',
    marginTop: 20,
  },
  regenerateBtn: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  regenerateBtnText: {
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  sessionProgressBox: {
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#009050',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  watchFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6F6D5',
    gap: 6,
  },
  watchFormText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009050',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  activeText: {
    color: '#009050',
  },
  swappedBadge: {
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B2F5EA',
  },
  swappedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2C7A7B',
    textTransform: 'uppercase',
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rpeBadge: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  rpeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C53030',
  },
  swapActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6F6D5',
    gap: 6,
  },
  swapActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22543D',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  timerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C6F6D5',
    gap: 8,
  },
  timerToggleBtnActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  timerToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#009050',
  },
  trackBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    alignItems: 'center',
  },
  trackBtnActive: {
    backgroundColor: '#F0FFF4',
    borderColor: '#009050',
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#718096',
  },
  liveSetWrapper: {
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  liveSetTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  setRowCompleted: {
    backgroundColor: '#F0FFF4',
    borderColor: '#C6F6D5',
  },
  setNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5568',
    width: 50,
  },
  setInputGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  setField: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  setFieldBW: {
    backgroundColor: '#EDF2F7',
    color: '#718096',
  },
  setCheck: {
    paddingLeft: 12,
  },
  voiceToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDF2F7',
    padding: 2,
    justifyContent: 'center',
  },
  voiceToggleActive: {
    backgroundColor: '#009050',
  },
  voiceToggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceToggleDotActive: {
    alignSelf: 'flex-end',
  },
  headerOptionsBtn: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerOptionsText: {
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '800',
  },
  safetyCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetyCheckboxActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C6F6D5',
    gap: 6,
  },
  focusToggleActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  focusToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#009050',
  },
  focusContainer: {
    marginBottom: 24,
  },
  focusConsole: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 28,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  consoleBtn: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  consoleProgress: {
    flex: 1,
    alignItems: 'center',
  },
  consoleProgressText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A202C',
    letterSpacing: 2,
  },
  savedRoutinesScroll: {
    paddingBottom: 16,
    gap: 12,
  },
  savedRoutineCard: {
    backgroundColor: '#FFF',
    width: 160,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  savedRoutineIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  savedRoutineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 4,
  },
  savedRoutineDesc: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 10,
    padding: 2,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unitBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unitBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#718096',
  },
  unitBtnTextActive: {
    color: '#2D3748',
  },
  globalTimerContainer: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    right: 24,
    zIndex: 1000,
  },
  chunkyIntake: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    flex: 1,
  },
  chunkyBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  chunkyBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A5568',
  },
  chunkyValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  chunkyValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
    textAlign: 'center',
    minWidth: 30,
  },
  chunkyUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0AEC0',
    marginLeft: 4,
  },
  floatingConsoleWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.5)',
  },
  floatingConsole: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 8,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  floatingBtn: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingFinishBtn: {
    flex: 1,
    height: 64,
    marginHorizontal: 12,
    backgroundColor: '#009050',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  floatingFinishText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  }
});
