import { ArrowLeft01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export default function AnalyzeFoodScreen() {
  const router = useRouter();
  const { imageUri, imageBase64 } = useLocalSearchParams<{ imageUri: string, imageBase64?: string }>();

  const [step, setStep] = useState(0);
  const [aiResult, setAiResult] = useState<any>(null);

  const steps = [
    "Analyzing food...",
    "Getting Nutrition data...",
    "Get final result"
  ];

  useEffect(() => {
    let isMounted = true;

    const analyzeImage = async () => {
      // If we don't have the base64 payload, we can't send it to Gemini.
      if (!imageBase64 || !GEMINI_API_KEY) {
        if (!GEMINI_API_KEY && isMounted) {
          Alert.alert('Configuration Error', 'Missing Gemini API Key in .env');
        } else if (!imageBase64 && isMounted) {
          Alert.alert('Error', 'Image data could not be processed. Please try taking the photo again.');
          router.back();
        }
        return;
      }

      try {
        // Step 1: Initialize
        if (isMounted) setStep(0);
        const decodedBase64 = decodeURIComponent(imageBase64);

        // Step 2: Send to Gemini
        if (isMounted) setStep(1);

        const prompt = `You are an expert nutritionist. Analyze this image and identify the food.
Provide the estimated nutritional value for a standard serving of this food.
Return ONLY a valid JSON object matching this exact structure, with no markdown formatting or extra text:
{
  "foodName": "Name of the food",
  "calories": 250,
  "protein": 10,
  "carbs": 30,
  "fat": 5
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: decodedBase64
                    }
                  }
                ]
              }],
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API returned ${response.status}`);
        }

        // Step 3: Parse Result
        if (isMounted) setStep(2);
        const data = await response.json();
        let textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Clean up markdown block if Gemini hallucinated it
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(textResponse);

        if (isMounted) {
          setAiResult(parsedData);
          setStep(3); // All complete
        }

      } catch (error) {
        console.error('AI Analysis Error:', error);
        if (isMounted) {
          Alert.alert('Analysis Failed', 'Could not analyze the food image. Please try again or log manually.');
          router.back();
        }
      }
    };

    // Small delay to let the screen transition finish before heavy blocking operations
    setTimeout(analyzeImage, 500);

    return () => { isMounted = false; };
  }, [imageBase64]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#2D3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analyzing Food</Text>
        </View>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: decodeURIComponent(imageUri) }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>No Image Selected</Text>
            </View>
          )}
        </View>

        {/* Loading Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((stepText, index) => {
            const isCompleted = step > index;
            const isActive = step === index;

            return (
              <View key={index} style={styles.stepRow}>
                <View style={styles.iconContainer}>
                  {isCompleted ? (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} color="#009050" />
                  ) : isActive ? (
                    <ActivityIndicator size="small" color="#3182CE" />
                  ) : (
                    <View style={styles.pendingCircle} />
                  )}
                </View>
                <Text style={[
                  styles.stepText,
                  isCompleted && styles.stepCompletedText,
                  isActive && styles.stepActiveText
                ]}>
                  {stepText}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={() => {
              if (aiResult) {
                // Navigate to log-food with pre-filled AI data
                router.replace({
                  pathname: '/log-food',
                  params: {
                    aiName: aiResult.foodName,
                    aiCalories: aiResult.calories,
                    aiProtein: aiResult.protein,
                    aiCarbs: aiResult.carbs,
                    aiFat: aiResult.fat,
                  }
                });
              }
            }}
            disabled={step < 3}
            style={styles.continueButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // Added space between back button and new title
  },
  headerTitle: {
    fontSize: 28, // Significantly larger font
    fontWeight: 'bold',
    color: '#2D3748',
  },
  imageContainer: {
    margin: 24,
    aspectRatio: 1, // 1:1 Square
    backgroundColor: '#EDF2F7',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#A0AEC0',
    fontSize: 16,
  },
  stepsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 16,
  },
  pendingCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  stepText: {
    fontSize: 16,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  stepActiveText: {
    color: '#2D3748',
    fontWeight: '700',
  },
  stepCompletedText: {
    color: '#009050',
    fontWeight: '600',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  continueButton: {
    width: '100%',
  }
});
