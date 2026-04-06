import { ArrowLeft01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { FoodScanStoryTemplate } from '../components/progress/FoodScanStoryTemplate';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export default function AnalyzeFoodScreen() {
  const router = useRouter();
  const { imageUri, imageBase64 } = useLocalSearchParams<{ imageUri: string, imageBase64?: string }>();

  const [step, setStep] = useState(0);
  const [aiResult, setAiResult] = useState<any>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const storyViewShotRef = React.useRef<ViewShot>(null);

  const steps = [
    "Analyzing food...",
    "Getting Nutrition data...",
    "Get final result"
  ];

  useEffect(() => {
    let isMounted = true;

    const analyzeImage = async () => {
      // If we don't have the image Uri, we can't proceed.
      if (!imageUri || !GEMINI_API_KEY) {
        if (!GEMINI_API_KEY && isMounted) {
          Alert.alert('Configuration Error', 'Missing Gemini API Key in .env');
        } else if (!imageUri && isMounted) {
          Alert.alert('Error', 'Image data could not be processed. Please try taking the photo again.');
          router.back();
        }
        return;
      }

      try {
        // Step 1: Initialize & Get Base64
        if (isMounted) setStep(0);
        const decodedUri = decodeURIComponent(imageUri);

        const base64Data = await FileSystem.readAsStringAsync(decodedUri, {
          encoding: 'base64',
        });

        if (!base64Data) {
          throw new Error('Failed to convert image to base64');
        }

        // Step 2: Send to Gemini
        if (isMounted) setStep(1);

        const prompt = `You are a professional nutritionist and food recognition system.

Your goal is to provide CONSISTENT and STABLE nutritional estimates.

Instructions:

1. Identify the food in the image.
2. Assume a STANDARD serving size (not large, not small).
3. Use AVERAGE nutritional values from common nutrition databases.
4. Do NOT guess randomly — keep values consistent across repeated runs.
5. If uncertain, choose the MOST COMMON version of the food.
6. Keep values rounded and stable (avoid unnecessary variation).

Constraints:

* Calories must be rounded to nearest 10
* Protein, carbs, fat must be rounded to nearest whole number
* Do NOT change values drastically between similar inputs

Return ONLY valid JSON:

{
"foodName": "Name of the food",
"calories": number,
"protein": number,
"carbs": number,
"fat": number
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
                      data: base64Data
                    }
                  }
                ]
              }],
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              ]
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
  }, [imageUri]);

  const handleShareAnalysis = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPreviewVisible(true);
  };

  const performFinalShare = async () => {
    setIsSharing(true);
    setIsPreviewVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setTimeout(async () => {
      try {
        if (storyViewShotRef.current?.capture) {
          const uri = await storyViewShotRef.current.capture();
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/jpeg',
              dialogTitle: 'AI Food Analysis',
            });
          }
        }
      } catch (err) {
        console.error('Sharing Error:', err);
        Alert.alert('Share Failed', 'Unable to generate your AI scan story.');
      } finally {
        setIsSharing(false);
      }
    }, 1000);
  };

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
          {step === 3 && (
            <TouchableOpacity 
              style={styles.shareAnalysisButton}
              onPress={handleShareAnalysis}
            >
              <Text style={styles.shareAnalysisText}>📤 Preview & Share AI Scan</Text>
            </TouchableOpacity>
          )}

          <Button
            title="Continue & Log Food"
            onPress={() => {
              if (aiResult) {
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

        {/* Share Preview Modal */}
        <Modal
          visible={isPreviewVisible}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.previewModalOverlay}>
            <View style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewHeaderTitle}>AI Scan Reveal</Text>
                <TouchableOpacity onPress={() => setIsPreviewVisible(false)}>
                   <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.previewTemplateContainer}>
                <View 
                  style={{ 
                    width: 1080, 
                    height: 1920, 
                    transform: [
                      { scale: (SCREEN_WIDTH * 0.75) / 1080 },
                    ],
                    overflow: 'hidden',
                    borderRadius: 40,
                  }}
                >
                  {aiResult && imageUri && (
                    <FoodScanStoryTemplate
                      imageUri={decodeURIComponent(imageUri)}
                      foodName={aiResult.foodName}
                      calories={aiResult.calories}
                      protein={aiResult.protein}
                      carbs={aiResult.carbs}
                      fat={aiResult.fat}
                    />
                  )}
                </View>
              </View>

              <View style={styles.previewFooter}>
                <Text style={styles.previewHint}>Share the AI magic with your friends! 🍱🤖</Text>
                <TouchableOpacity
                  style={styles.confirmShareButton}
                  onPress={performFinalShare}
                >
                  <Text style={styles.confirmShareButtonText}>📤 Confirm & Share Story</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Global Sharing Overlay */}
        {isSharing && (
          <View style={[StyleSheet.absoluteFill, styles.shareModalOverlay]}>
            <ActivityIndicator size="large" color="#22D3EE" />
            <Text style={styles.sharingText}>REVEALING AI DATA...</Text>
          </View>
        )}

        {/* Hidden high-res capture view */}
        <View style={styles.hiddenViewShot}>
          {aiResult && imageUri && (
             <ViewShot
              ref={storyViewShotRef}
              options={{ format: 'jpg', quality: 0.9 }}
              style={{ width: 1080, height: 1920 }}
            >
              <FoodScanStoryTemplate
                imageUri={decodeURIComponent(imageUri)}
                foodName={aiResult.foodName}
                calories={aiResult.calories}
                protein={aiResult.protein}
                carbs={aiResult.carbs}
                fat={aiResult.fat}
              />
            </ViewShot>
          )}
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
  },
  shareAnalysisButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#3182CE',
    borderStyle: 'dashed',
    backgroundColor: '#EBF8FF',
  },
  shareAnalysisText: {
    color: '#3182CE',
    fontWeight: '800',
    fontSize: 15,
  },
  // Preview Modal Styles
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
    padding: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
  },
  cancelText: {
    color: '#A0AEC0',
    fontSize: 16,
    fontWeight: '600',
  },
  previewTemplateContainer: {
    height: (SCREEN_WIDTH * 0.75 * 1920) / 1080,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 24,
    overflow: 'hidden',
  },
  previewFooter: {
    marginTop: 24,
    alignItems: 'center',
  },
  previewHint: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmShareButton: {
    width: '100%',
    backgroundColor: '#22D3EE',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmShareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shareModalOverlay: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  sharingText: {
    color: '#1A202C',
    marginTop: 16,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 14,
  },
  hiddenViewShot: {
    position: 'absolute',
    left: -5000,
    top: 0,
    opacity: 0,
  },
});
