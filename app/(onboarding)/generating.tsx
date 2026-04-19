import { useUser } from '@clerk/expo';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parse, differenceInYears } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { db } from '../../lib/firebase';
import { 
  scheduleDailyReminders, 
  seedAdminSettings, 
  seedWelcomeNotification 
} from '../../lib/notifications';
import { calculateUserPlan } from '../../services/macroEngine';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const LOADING_STEPS = [
  "Analyzing profile metrics...",
  "Calculating caloric needs...",
  "Formulating macro targets...",
  "Generating custom AI plan..."
];

export default function GeneratingProfile() {
  const router = useRouter();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [aiCompleted, setAiCompleted] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Timer logic for UI steps
  useEffect(() => {
    if (currentStep < LOADING_STEPS.length - 1) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setCurrentStep(prev => prev + 1);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 1500);
      return () => clearTimeout(timer);
    } else if (currentStep === LOADING_STEPS.length - 1) {
      if (aiCompleted) {
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            setCurrentStep(LOADING_STEPS.length);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    } else if (currentStep === LOADING_STEPS.length) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) router.replace('/(onboarding)/plan-preview');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentStep, aiCompleted]);

  useEffect(() => {
    const generateProfile = async () => {
      if (!user) return;

      try {
        // 1. Gather all data from AsyncStorage (Identity-Locked)
        const gender = await AsyncStorage.getItem(`onboarding_gender_${user.id}`) || 'male';
        const goal = await AsyncStorage.getItem(`onboarding_goal_${user.id}`) || 'maintain';
        const activity = await AsyncStorage.getItem(`onboarding_activity_${user.id}`) || 'moderate';
        const birthdate = await AsyncStorage.getItem(`onboarding_birthdate_${user.id}`) || '2000-01-01';
        const weight = await AsyncStorage.getItem(`onboarding_weight_${user.id}`) || '70';
        const heightCm = await AsyncStorage.getItem(`onboarding_height_cm_${user.id}`) || '170';
        const diet = await AsyncStorage.getItem(`onboarding_diet_${user.id}`) || 'non-vegetarian';

        // 2. CORE DETERMINISTIC CALCULATION (REPLACES AI MACRO GEN)
        const macroPlan = calculateUserPlan({
          gender,
          birthdate,
          weight: parseFloat(weight),
          height: parseInt(heightCm),
          activityLevel: activity,
          goal
        });

        // 3. SECONDARY AI LAYER: INSIGHTS ONLY
        let fitnessAdvice = "Keep pushing, consistency is key!"; // Fallback

        if (GEMINI_API_KEY) {
          try {
            const prompt = `You are a fitness coach. The user is a ${gender}, weighs ${weight}kg, goal is ${goal}. 
            Provide a short, motivating 1-sentence fitness advice for them. No markdown. RETURN ONLY JSON: {"advice": "..."}`;
            
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
              }
            );
            if (response.ok) {
              const data = await response.json();
              const quote = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (quote) {
                const parsed = JSON.parse(quote.replace(/```json/g, '').replace(/```/g, '').trim());
                fitnessAdvice = parsed.advice;
              }
            }
          } catch (e) { console.error("Advice fetch failed", e); }
        }

        const finalData = {
          ...macroPlan,
          fitnessAdvice
        };

        // 4. Save to Firebase
        const userRef = doc(db, 'users', user.id);
        const parsedWeight = parseFloat(weight);
        const rawEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
        
        // Calculate Age for Profile Persistence
        let calculatedAge = 25;
        try {
          const birthDateObj = parse(birthdate, 'yyyy-MM-dd', new Date());
          calculatedAge = differenceInYears(new Date(), birthDateObj);
          if (isNaN(calculatedAge)) calculatedAge = 25;
        } catch (e) {
          console.error('[Generating] Age calculation failed:', e);
        }
        
        await setDoc(userRef, {
          email: rawEmail.toLowerCase(),
          profile: {
            gender,
            goal,
            activityLevel: activity,
            birthdate,
            age: calculatedAge,
            diet,
            measurements: {
              weightKg: parsedWeight,
              heightCm: parseInt(heightCm),
              // Save imperial too for perfect profile sync
              heightFt: Math.floor((Math.round(parseInt(heightCm) / 2.54)) / 12),
              heightIn: (Math.round(parseInt(heightCm) / 2.54)) % 12,
            },
            macros: finalData,
            updatedAt: new Date(),
          },
          hasOnboarded: true,
        }, { merge: true });

        // 5. Activity Logs
        const weightLogsRef = collection(db, 'weight_logs');
        await addDoc(weightLogsRef, {
          userId: user.id,
          weightKg: parsedWeight,
          date: format(new Date(), 'yyyy-MM-dd'),
          timestamp: serverTimestamp()
        });

        // 6. Store for Preview Screen (Identity-Locked)
        await AsyncStorage.setItem(`onboarding_result_calories_${user.id}`, finalData.dailyCalories.toString());
        await AsyncStorage.setItem(`onboarding_result_protein_${user.id}`, finalData.proteinGrams.toString());
        await AsyncStorage.setItem(`has_onboarded_${user.id}`, 'true');
        
        // 7. Seed Welcome Notification (New User only)
        await seedWelcomeNotification(user.id);

        if (isMountedRef.current) setAiCompleted(true);

      } catch (error) {
        console.error('Generation Error:', error);
        if (isMountedRef.current) {
          Alert.alert('System Error', 'Failed to calculate your plan. Using default targets.', [
            { text: 'Continue', onPress: () => router.replace('/(tabs)') }
          ]);
        }
      }
    };

    setTimeout(() => { generateProfile(); }, 1000);
  }, [user]);

  return (
    <View style={styles.container}>
      <View style={styles.checklistContainer}>
        {LOADING_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <View key={index} style={[styles.stepRow, isCurrent ? styles.stepCurrent : null]}>
              <View style={styles.iconContainer}>
                {isCompleted ? (
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} color="#00C066" />
                ) : isCurrent ? (
                  <ActivityIndicator size="small" color="#FF6B6B" />
                ) : (
                  <View style={styles.pendingCircle} />
                )}
              </View>
              <Text style={[
                styles.stepText,
                isCompleted && styles.textCompleted,
                isCurrent && styles.textCurrent,
                isPending && styles.textPending
              ]}>
                {step}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.subText}>ENGINEERING YOUR RESULTS ✨</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 24,
  },
  checklistContainer: {
    padding: 32,
    backgroundColor: '#F7FAFC',
    borderRadius: 32,
    gap: 24,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepCurrent: {
    transform: [{ scale: 1.05 }],
  },
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  stepText: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  textCompleted: {
    color: '#00C066',
  },
  textCurrent: {
    color: '#2D3748',
  },
  textPending: {
    color: '#A0AEC0',
  },
  subText: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }
});
