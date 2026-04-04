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
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { db } from '../lib/firebase';

const { width } = Dimensions.get('window');
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  tip: string;
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

export default function AIWorkoutScreen() {
  const router = useRouter();
  const { user } = useUser();

  // Selection State
  const [step, setStep] = useState(0); // 0: Form, 1: Loading, 2: Result
  const [targetMuscles, setTargetMuscles] = useState('full_body');
  const [equipment, setEquipment] = useState('none');
  const [level, setLevel] = useState('Intermediate');
  const [duration, setDuration] = useState(30);

  // Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

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

    setStep(1);
    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const prompt = `You are an elite personal trainer. Create a highly effective, production-level workout plan.
User Profile:
- Goal: ${userProfile?.goal || 'General Health'}
- Activity Level: ${userProfile?.activityLevel || 'Moderate'}
- Gender: ${userProfile?.gender || 'Not specified'}
- Current Weight: ${userProfile?.measurements?.weightKg || 70}kg

Current Selection:
- Target: ${targetMuscles}
- Equipment: ${equipment}
- Level: ${level}
- Duration: ${duration} minutes

Please generate a workout plan in JSON format only. Include:
1. A catchy title and short description.
2. A 3-5 minute warmup list.
3. A list of main exercises with name, sets, reps, rest time, and a pro tip for each.
4. A 3-minute cooldown.
5. AI Coach notes about form and intensity.
6. A realistic calorie burn estimate for a ${userProfile?.measurements?.weightKg || 70}kg person at ${level} intensity.

Return ONLY a valid JSON object:
{
  "title": "Workout Title",
  "description": "Short description...",
  "warmup": ["step 1", "step 2"],
  "exercises": [
    { "name": "Exercise Name", "sets": "3", "reps": "12", "rest": "60s", "tip": "Keep back straight" }
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
      setStep(2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Generation Error:', error);
      Alert.alert('Failed', 'Could not generate workout. Please try again.');
      setStep(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinishAndLog = async () => {
    if (!user || !workout) return;

    try {
      const logData = {
        userId: user.id,
        type: 'exercise',
        name: workout.title,
        description: `AI Generated: ${workout.description}`,
        duration: duration,
        calories: workout.estimatedCalories,
        timestamp: serverTimestamp(),
        date: format(new Date(), 'yyyy-MM-dd'),
      };

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Workout completed and logged!', [
        { text: 'Great!', onPress: () => router.replace('/(tabs)') }
      ]);
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

      <Button title="Generate Workout" onPress={generateWorkout} style={styles.generateBtn} />
    </ScrollView>
  );

  const renderWorkout = () => (
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

      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>Warming Up</Text>
        {workout?.warmup.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.bullet} />
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.exerciseSectionTitle}>Main Exercises</Text>
      {workout?.exercises.map((ex, i) => (
        <View key={i} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <View style={styles.setRepBadge}>
              <Text style={styles.setRepText}>{ex.sets} Sets × {ex.reps}</Text>
            </View>
          </View>
          <View style={styles.exerciseMeta}>
            <View style={styles.infoRow}>
              <HugeiconsIcon icon={InformationCircleIcon} size={16} color="#718096" />
              <Text style={styles.proTipText}>{ex.tip}</Text>
            </View>
            <View style={styles.restSection}>
              <Text style={styles.restLabel}>Rest: {ex.rest}</Text>
            </View>
          </View>
        </View>
      ))}

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
        <View style={{ width: 40 }} />
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
    backgroundColor: '#3182CE',
    borderColor: '#3182CE',
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
    backgroundColor: '#3182CE',
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
});
