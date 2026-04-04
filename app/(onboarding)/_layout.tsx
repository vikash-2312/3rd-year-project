import { Stack, useSegments, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingLayout() {
  const segments = useSegments();
  const router = useRouter();
  
  const currentSegment = segments[segments.length - 1];
  const isGenerating = currentSegment === 'generating';
  const isPlanPreview = currentSegment === 'plan-preview';
  
  // Total steps updated to 7 (Gender, Goal, Activity, DOB, Weight/Height, Diet, Plan Preview)
  const TOTAL_STEPS = 7;
  const stepNumber = parseInt(currentSegment as string) || 1;
  const progressValue = stepNumber / TOTAL_STEPS;
  
  const animatedProgress = useRef(new Animated.Value(progressValue)).current;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: progressValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [progressValue]);

  const handleBack = () => {
    if (stepNumber > 1) {
      router.back();
    }
  };

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Hide the header on generating and plan-preview (AI takes over UX) */}
      {!isGenerating && !isPlanPreview && (
        <View style={styles.header}>
          <View style={styles.backButtonContainer}>
            {stepNumber > 1 && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#2D3748" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.stepText}>Step {stepNumber} of {TOTAL_STEPS} — Takes 30 seconds</Text>
            <View style={styles.progressBarWrapper}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>
      )}
      
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonContainer: {
    width: 40,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  progressContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 13,
    color: '#A0AEC0',
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressBarWrapper: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
});
