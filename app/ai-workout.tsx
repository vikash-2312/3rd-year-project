import { useUser } from '@clerk/expo';
import {
  Activity01Icon,
  ArrowLeft01Icon,
  Clock01Icon,
  Dumbbell01Icon,
  FlashIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { db } from '../lib/firebase';
import { WorkoutTimer } from '../components/WorkoutTimer';
import { WorkoutSummaryModal } from '../components/WorkoutSummaryModal';
import * as Speech from 'expo-speech';
import { CheckmarkCircle02Icon, PencilEdit02Icon, Square01Icon, ChampionIcon } from '@hugeicons/core-free-icons';
import { getExercisePR, getMusclesFromExercise, ExercisePR } from '../services/workoutService';
import { MuscleHeatmap } from '../components/MuscleHeatmap';

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
  "Analyzing profile...",
  "Targeting muscle groups...",
  "Optimizing for equipment...",
  "Crafting pro tips...",
  "Finalizing routine..."
];

function LoadingSequence() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ alignItems: 'center', marginTop: 24 }}>
      <Text style={styles.loadingTitle}>{LOADING_MESSAGES[index]}</Text>
      <Text style={styles.loadingSubtitle}>Our AI is designing your perfect workout</Text>
    </View>
  );
}

// --- Sub-Components ---

interface ExerciseCardItemProps {
  ex: Exercise;
  index: number;
  isActive: boolean;
  displayName: string;
  isSwapped: boolean;
  onSwap: (index: number) => void;
  onActiveSelect: (index: number) => void;
  sessionLogs: any[];
  onLogSet: (setIndex: number, weight: string, reps: string) => void;
  pr?: ExercisePR | null;
  isBodyweight?: boolean;
  isVoiceEnabled?: boolean;
}

const SetRow = ({ 
  index, 
  onLog, 
  isCompleted, 
  onToggle,
  onStartTimer,
  isBodyweight
}: { 
  index: number, 
  onLog: (w: string, r: string) => void,
  isCompleted: boolean,
  onToggle: () => void,
  onStartTimer: () => void,
  isBodyweight?: boolean
}) => {
  const [weight, setWeight] = useState(isBodyweight ? 'BW' : '');
  const [reps, setReps] = useState('');

  return (
    <View style={[styles.setRow, isCompleted && styles.setRowCompleted]}>
      <Text style={styles.setNumber}>Set {index + 1}</Text>
      <View style={styles.setInputGroup}>
        <TextInput
          style={[styles.setField, isBodyweight && styles.setFieldBW]}
          placeholder={isBodyweight ? "BW" : "kg"}
          keyboardType="numeric"
          value={weight}
          editable={!isBodyweight || weight !== 'BW'} // Allow editing if they clear 'BW' to add extra weight
          onFocus={() => {
            if (isBodyweight && weight === 'BW') setWeight('');
          }}
          onBlur={() => {
            if (isBodyweight && weight === '') setWeight('BW');
          }}
          onChangeText={(val) => {
            setWeight(val);
            onLog(val === 'BW' ? '0' : val, reps);
          }}
        />
        <TextInput
          style={styles.setField}
          placeholder="reps"
          keyboardType="numeric"
          value={reps}
          onChangeText={(val) => {
            setReps(val);
            onLog(weight, val);
          }}
        />
      </View>
      <TouchableOpacity 
        onPress={() => {
          onToggle();
          if (!isCompleted) onStartTimer();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }} 
        style={styles.setCheck}
      >
        <HugeiconsIcon 
          icon={isCompleted ? CheckmarkCircle02Icon : Square01Icon} 
          size={24} 
          color={isCompleted ? "#009050" : "#CBD5E0"} 
        />
      </TouchableOpacity>
    </View>
  );
};

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
  pr,
  isBodyweight,
  isVoiceEnabled
}) => {
  const [timerVisible, setTimerVisible] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isActive && isVoiceEnabled) {
      Speech.speak(`Next up: ${displayName}. Focus on ${ex.tip}. Aim for RPE ${ex.rpe || 8}.`, {
        pitch: 1.0,
        rate: 0.95,
      });
    }
  }, [isActive, isVoiceEnabled]);

  const setArray = Array.from({ length: parseInt(ex.sets) || 3 });

  return (
    <View 
      style={[
        styles.exerciseCard, 
        isActive && styles.activeExerciseCard
      ]}
    >
      <View style={styles.exerciseHeader}>
        <View style={{ flex: 1 }}>
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
                <HugeiconsIcon icon={ChampionIcon} size={10} color="#B7791F" />
                <Text style={styles.prText}>Best: {pr.weight}kg</Text>
              </View>
            )}
            {pr && (parseFloat(pr.weight.toString()) > 0) && (
              <View style={[styles.prBadge, { backgroundColor: '#EBF8FF', borderColor: '#90CDF4' }]}>
                <HugeiconsIcon icon={FlashIcon} size={10} color="#3182CE" />
                <Text style={[styles.prText, { color: '#2B6CB0' }]}>Challenge PR</Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={() => onSwap(index)} 
          style={styles.swapActionBtn}
        >
          <HugeiconsIcon icon={SparklesIcon} size={20} color="#009050" />
          <Text style={styles.swapActionText}>Swap</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.exerciseMeta}>
        <View style={styles.infoRow}>
          <HugeiconsIcon icon={InformationCircleIcon} size={16} color="#718096" />
          <Text style={styles.proTipText}>{ex.tip}</Text>
        </View>

        {isActive && (
          <View style={styles.liveSetWrapper}>
            <Text style={styles.liveSetTitle}>Live Set Tracking</Text>
            {setArray.map((_, sIdx) => (
              <SetRow
                key={sIdx}
                index={sIdx}
                isCompleted={!!completedSets[sIdx]}
                onLog={(w, r) => onLogSet(sIdx, w, r)}
                onToggle={() => setCompletedSets(prev => ({ ...prev, [sIdx]: !prev[sIdx] }))}
                onStartTimer={() => setTimerVisible(true)}
                isBodyweight={isBodyweight}
              />
            ))}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity 
            onPress={() => setTimerVisible(!timerVisible)} 
            style={[styles.timerToggleBtn, timerVisible && styles.timerToggleBtnActive]}
          >
            <HugeiconsIcon 
              icon={Clock01Icon} 
              size={16} 
              color={timerVisible ? "#FFF" : "#009050"} 
            />
            <Text style={[styles.timerToggleText, timerVisible && styles.activeText]}>
              {timerVisible ? "Close Timer" : "Rest Timer"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onActiveSelect(index)} 
            style={[styles.trackBtn, isActive && styles.trackBtnActive]}
          >
            <Text style={[styles.trackBtnText, isActive && styles.activeText]}>
              {isActive ? "Track Mode" : "Select"}
            </Text>
          </TouchableOpacity>
        </View>

        {timerVisible && (
          <WorkoutTimer 
            initialSeconds={parseInt(ex.rest) || 60} 
            onClose={() => setTimerVisible(false)}
          />
        )}
      </View>
    </View>
  );
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
  const [sessionLogs, setSessionLogs] = useState<Record<number, Record<number, { w: string, r: string }>>>({});
  const [hasAcceptedSafety, setHasAcceptedSafety] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [finalStats, setFinalStats] = useState<any>(null);
  const [exercisePRs, setExercisePRs] = useState<Record<string, ExercisePR | null>>({});
  const [allTargetedMuscles, setAllTargetedMuscles] = useState<string[]>([]);

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
- Duration: ${duration} minutes

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

      // Manual Cleanup: Remove markdown JSON blocks if they exist
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

      let parsedData: WorkoutPlan;
      try {
        parsedData = JSON.parse(textResponse) as WorkoutPlan;
      } catch (parseError) {
        console.error('JSON Parse Error Raw Output:', textResponse);
        throw parseError;
      }

      setWorkout(parsedData);
      
      // Extract all muscle groups for heatmap
      const allMuscles = normalizeArray(parsedData.exercises).reduce((acc: string[], ex: any) => {
        const exerciseMuscles = ex.muscleGroups || getMusclesFromExercise(ex.name);
        return [...new Set([...acc, ...exerciseMuscles])];
      }, []);
      setAllTargetedMuscles(allMuscles);

      // Fetch PRs for each exercise
      if (user) {
        const prMap: Record<string, ExercisePR | null> = {};
        for (const ex of normalizeArray(parsedData.exercises)) {
          const pr = await getExercisePR(user.id, ex.name);
          prMap[ex.name] = pr;
        }
        setExercisePRs(prMap);
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

  /**
   * Safe Normalizer for AI Data
   * Gemini sometimes returns objects when arrays are expected.
   */
  const normalizeArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') return Object.values(data);
    return [];
  };

  const handleSwapExercise = (index: number) => {
    const exercises = normalizeArray(workout?.exercises);
    const ex = exercises[index];
    if (!ex) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Cycle through main exercise + all alternatives
    const alts = normalizeArray(ex.alternatives);
    const allOptions = [ex.name, ...alts];
    
    const currentName = swappedExercises[index] || ex.name;
    const currentIndex = allOptions.indexOf(currentName);
    const nextIdx = (currentIndex + 1) % allOptions.length;

    setSwappedExercises(prev => ({
      ...prev,
      [index]: allOptions[nextIdx]
    }));
  };

  const handleFinishAndLog = async () => {
    if (!user || !workout) return;

    try {
      // Calculate Total Volume & PRs
      let totalVolume = 0;
      let totalReps = 0;
      const exerciseDetailedLogs: any[] = [];

      Object.entries(sessionLogs || {}).forEach(([exIdx, sets]) => {
        const exercises = normalizeArray(workout?.exercises);
        const ex = exercises[parseInt(exIdx)];
        if (!ex) return; 

        const displayName = swappedExercises[parseInt(exIdx)] || ex.name;
        
        const setValues = normalizeArray(sets);
        let maxWeightInEx = 0;
        let repsAtMax = 0;

        setValues.forEach(set => {
          if (!set) return;
          const w = parseFloat(set.w) || 0;
          const r = parseInt(set.r) || 0;
          totalVolume += (w * r);
          totalReps += r;
          
          if (w > maxWeightInEx) {
            maxWeightInEx = w;
            repsAtMax = r;
          }
        });

        exerciseDetailedLogs.push({
          name: displayName,
          sets: setValues.length,
          volume: setValues.reduce((acc, s) => acc + (parseFloat(s?.w || '0') * parseInt(s?.r || '0') || 0), 0),
          maxWeight: maxWeightInEx,
          repsAtMax: repsAtMax
        });
      });

      const logData = {
        userId: user.id,
        type: 'exercise',
        name: workout.title,
        description: `AI Elite Session: ${workout.description}`,
        duration: duration,
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
          detailedLogs: exerciseDetailedLogs
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

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Target Focus</Text>
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

      <Text style={styles.sectionTitle}>Equipment</Text>
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

      <Text style={styles.sectionTitle}>Fitness Level</Text>
      <View style={styles.row}>
        {LEVELS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.levelBtn, level === l && styles.levelBtnActive]}
            onPress={() => setLevel(l)}
          >
            <Text style={[styles.levelBtnText, level === l && styles.levelBtnTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Duration (Mins)</Text>
      <View style={styles.row}>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
            onPress={() => setDuration(d)}
          >
            <Text style={[styles.durationBtnText, duration === d && styles.durationBtnTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.card, { marginTop: 8, paddingVertical: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center' }}>
               <HugeiconsIcon icon={SparklesIcon} size={20} color="#009050" />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3748' }}>AI Voice Coach</Text>
              <Text style={{ fontSize: 12, color: '#718096' }}>Audio guidance for form & timing</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsVoiceEnabled(!isVoiceEnabled);
            }}
            style={[
              styles.voiceToggle, 
              isVoiceEnabled && styles.voiceToggleActive
            ]}
          >
            <View style={[styles.voiceToggleDot, isVoiceEnabled && styles.voiceToggleDotActive]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { marginTop: 8, paddingVertical: 16, borderColor: hasAcceptedSafety ? '#C6F6D5' : '#FED7D7', borderWidth: 1 }]}>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setHasAcceptedSafety(!hasAcceptedSafety);
          }}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
        >
          <View style={[
            styles.safetyCheckbox, 
            hasAcceptedSafety && styles.safetyCheckboxActive
          ]}>
             {hasAcceptedSafety && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color="#FFF" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#2D3748', marginBottom: 2 }}>Safety Disclaimer</Text>
            <Text style={{ fontSize: 12, color: '#718096', lineHeight: 18 }}>
              I am physically fit and have consulted a physician if needed. I perform these exercises at my own risk.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Button 
        title="Generate Workout" 
        onPress={generateWorkout} 
        style={[styles.generateBtn, !hasAcceptedSafety && { opacity: 0.6 }]} 
      />
    </ScrollView>
  );

  const renderWorkout = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Session Progress Header */}
      <View style={styles.sessionProgressBox}>
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${((activeExerciseIndex + 1) / (normalizeArray(workout?.exercises).length || 1)) * 100}%` 
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Exercise {activeExerciseIndex + 1} of {normalizeArray(workout?.exercises).length}
        </Text>
      </View>

      {/* Quick Morph Header */}
      <View style={styles.morphHeader}>
        <Text style={styles.morphLabel}>Quick Equipment Morph:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.morphScroll}>
          {EQUIPMENT.map((eq) => (
            <TouchableOpacity
              key={eq.id}
              style={[styles.morphChip, equipment === eq.id && styles.morphChipActive]}
              onPress={() => {
                setEquipment(eq.id);
                generateWorkout(); // Trigger re-morph
              }}
            >
              <HugeiconsIcon icon={eq.icon} size={14} color={equipment === eq.id ? '#FFF' : '#718096'} />
              <Text style={[styles.morphChipText, equipment === eq.id && styles.morphChipTextActive]}>{eq.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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

      {/* NEW: Muscle Heatmap Visualization */}
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

      <Text style={styles.exerciseSectionTitle}>Main Exercises</Text>
      {normalizeArray(workout?.exercises).map((ex, i) => {
        if (!ex) return null;
        return (
          <ExerciseCardItem
            key={i}
            ex={ex}
            index={i}
            isActive={activeExerciseIndex === i}
            displayName={swappedExercises[i] || ex.name || 'Exercise'}
            isSwapped={!!swappedExercises[i]}
            onSwap={handleSwapExercise}
            onActiveSelect={setActiveExerciseIndex}
            sessionLogs={sessionLogs[i] ? normalizeArray(sessionLogs[i]) : []}
            pr={exercisePRs[ex.name]}
            onLogSet={(setIdx, w, r) => {
              setSessionLogs(prev => ({
                ...prev,
                [i]: {
                  ...prev[i],
                  [setIdx]: { w, r }
                }
              }));
            }}
            isBodyweight={equipment === 'none'}
            isVoiceEnabled={isVoiceEnabled}
          />
        );
      })}

      <View style={styles.aiNoteBox}>
        <HugeiconsIcon icon={SparklesIcon} size={24} color="#009050" />
        <Text style={styles.aiNoteText}>{workout?.aiNotes}</Text>
      </View>

      <Button title="Finish & Log Workout" onPress={handleFinishAndLog} style={styles.finishBtn} />
      <TouchableOpacity onPress={() => setStep(0)} style={styles.regenerateBtn}>
        <Text style={styles.regenerateBtnText}>Back / Regenerate</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Workout Coach</Text>
        {step === 2 ? (
          <TouchableOpacity 
            onPress={() => {
              Alert.alert(
                "Finish Session?",
                "Are you sure you want to finish and log your progress now?",
                [
                  { text: "Continue Training", style: "cancel" },
                  { text: "Finish & Log", style: "default", onPress: handleFinishAndLog }
                ]
              );
            }}
            style={styles.headerFinishBtn}
          >
             <Text style={styles.headerFinishText}>Finish</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {step === 1 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#009050" />
          <LoadingSequence />
        </View>
      ) : step === 2 ? (
        renderWorkout()
      ) : (
        renderForm()
      )}

      <WorkoutSummaryModal
        isVisible={isSummaryVisible}
        stats={finalStats}
        onClose={() => router.replace('/(tabs)')}
      />
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
    paddingBottom: 40,
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
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
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
    marginTop: 20,
    height: 56,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
    marginTop: 24,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
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
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    flex: 1,
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
  finishBtn: {
    height: 56,
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
  activeExerciseCard: {
    borderColor: '#009050',
    borderWidth: 2,
    backgroundColor: '#F0FFF4',
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
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCBF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECC94B',
    gap: 4,
  },
  prText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B7791F',
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
  morphHeader: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  morphLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  morphScroll: {
    gap: 8,
  },
  morphChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  morphChipActive: {
    backgroundColor: '#2D3748',
    borderColor: '#2D3748',
  },
  morphChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
  },
  morphChipTextActive: {
    color: '#FFF',
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
  headerFinishBtn: {
    backgroundColor: '#009050',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  headerFinishText: {
    color: '#FFF',
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
});
