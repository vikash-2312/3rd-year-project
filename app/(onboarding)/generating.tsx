import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { db } from '../../lib/firebase';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkCircle02Icon, CircleIcon } from '@hugeicons/core-free-icons';

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
      // Dummy timer for early steps
      const timer = setTimeout(() => {
        if (isMountedRef.current) setCurrentStep(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (currentStep === LOADING_STEPS.length - 1) {
      // Last step: wait for AI to formally finish
      if (aiCompleted) {
        const timer = setTimeout(() => {
          if (isMountedRef.current) setCurrentStep(LOADING_STEPS.length); // All complete
        }, 800);
        return () => clearTimeout(timer);
      }
    } else if (currentStep === LOADING_STEPS.length) {
      // Everything is done, redirect
      const timer = setTimeout(() => {
        if (isMountedRef.current) router.replace('/(tabs)');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentStep, aiCompleted]);

  useEffect(() => {
    const generateProfile = async () => {
      if (!user) return;

      if (!GEMINI_API_KEY) {
        Alert.alert(
          'Missing API Key',
          'Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }

      try {
        // 1. Gather all data from AsyncStorage
        const gender = await AsyncStorage.getItem('onboarding_gender');
        const goal = await AsyncStorage.getItem('onboarding_goal');
        const activity = await AsyncStorage.getItem('onboarding_activity');
        const birthdate = await AsyncStorage.getItem('onboarding_birthdate');
        const weight = await AsyncStorage.getItem('onboarding_weight');
        const heightFt = await AsyncStorage.getItem('onboarding_height_ft');
        const heightIn = await AsyncStorage.getItem('onboarding_height_in');

        const userProfileStr = `
          Gender: ${gender}
          Goal: ${goal}
          Activity Level: ${activity}
          Birthdate: ${birthdate}
          Weight: ${weight} kg
          Height: ${heightFt} ft ${heightIn} in
        `;

        // 2. Call Gemini via direct REST API
        const prompt = `You are an expert fitness and nutrition AI assistant. 
Given the following user profile, calculate their daily nutritional requirements.

User Profile:
${userProfileStr}

Provide a highly accurate target for:
- Daily Calories
- Protein (grams)
- Carbs (grams)
- Fats (grams)
- Water intake (liters)
- A short, motivating 1-sentence fitness advice.

Return ONLY a valid JSON object matching this exact structure, with no markdown formatting or extra text:
{"dailyCalories": 2000, "proteinGrams": 150, "carbsGrams": 200, "fatsGrams": 60, "waterIntakeLiters": 3.5, "fitnessAdvice": "Keep pushing, consistency is key!"}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Gemini API Error:', response.status, errorBody);
          throw new Error(`Gemini API returned ${response.status}`);
        }

        const data = await response.json();

        // Extract the text from Gemini's response
        let textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Clean up markdown code blocks if the AI included them accidentally
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const generatedData = JSON.parse(textResponse);

        // 3. Save everything to Firebase
        const userRef = doc(db, 'users', user.id);
        await setDoc(userRef, {
          profile: {
            gender,
            goal,
            activityLevel: activity,
            birthdate,
            measurements: {
              weightKg: parseFloat(weight || '0'),
              heightFt: parseInt(heightFt || '0'),
              heightIn: parseInt(heightIn || '0'),
            },
            macros: generatedData,
            updatedAt: new Date(),
          },
          hasOnboarded: true,
        }, { merge: true });

        // 4. Update local storage marker
        await AsyncStorage.setItem('has_onboarded', 'true');

        if (isMountedRef.current) {
          setAiCompleted(true);
        }

      } catch (error) {
        console.error('Generation Error:', error);
        if (isMountedRef.current) {
          Alert.alert('Error', 'Failed to generate your profile. Please try again.');
          router.replace('/(tabs)');
        }
      }
    };

    // Minor delay before starting API
    setTimeout(() => {
      generateProfile();
    }, 1000);

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
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} color="#009050" />
                ) : isCurrent ? (
                  <ActivityIndicator size="small" color="#009050" />
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
      
      <Text style={styles.subText}>Powered by Gemini AI ✨</Text>
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
    padding: 24,
    backgroundColor: '#F7FAFC',
    borderRadius: 24,
    gap: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepCurrent: {
    transform: [{ scale: 1.02 }],
  },
  iconContainer: {
    width: 24,
    height: 24,
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
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  textCompleted: {
    color: '#009050',
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
    fontWeight: '500',
  }
});
