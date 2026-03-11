import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { db } from '../../lib/firebase';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export default function GeneratingProfile() {
  const router = useRouter();
  const { user } = useUser();
  const [loadingText, setLoadingText] = useState('Analyzing your profile...');

  useEffect(() => {
    let isMounted = true;

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

        if (isMounted) setLoadingText('Calculating optimal macros...');

        // 2. Call Gemini via direct REST API (compatible with Expo Go / React Native)
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

        if (isMounted) setLoadingText('Building your fitness plan...');

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

        if (isMounted) setLoadingText('All set! Redirecting...');

        // Small delay to show final message
        await new Promise(resolve => setTimeout(resolve, 800));

        if (isMounted) {
          router.replace('/(tabs)');
        }

      } catch (error) {
        console.error('Generation Error:', error);
        if (isMounted) {
          Alert.alert('Error', 'Failed to generate your profile. Please try again.');
          router.replace('/(tabs)');
        }
      }
    };

    // Minor delay for visual UX
    setTimeout(() => {
      generateProfile();
    }, 1000);

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#009050" style={styles.spinner} />
      <Text style={styles.loadingText}>{loadingText}</Text>
      <Text style={styles.subText}>Powered by Gemini AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  spinner: {
    transform: [{ scale: 1.5 }],
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
  }
});
