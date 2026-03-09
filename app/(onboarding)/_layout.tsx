import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ProgressBarAndroid, Platform } from 'react-native';
import { useSegments, useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingLayout() {
  const segments = useSegments();
  const router = useRouter();
  
  // Basic routing logic to determine which step we are on:
  // (onboarding)/1 -> step 1 -> progress 20%
  // (onboarding)/2 -> step 2 -> progress 40%
  // (onboarding)/3 -> step 3 -> progress 60%
  // (onboarding)/4 -> step 4 -> progress 80%
  // (onboarding)/5 -> step 5 -> progress 100%

  const currentSegment = segments[segments.length - 1];
  const stepNumber = parseInt(currentSegment as string) || 1;
  const progress = stepNumber / 5;

  const handleBack = () => {
    if (stepNumber > 1) {
      router.back();
    } else {
      // If at step 1, where do they go? Maybe sign out? 
      // We'll just disable the back button on step 1 for now.
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {stepNumber > 1 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2D3748" />
          </TouchableOpacity>
        )}
        <View style={styles.progressContainer}>
          <Text style={styles.stepText}>Step {stepNumber} of 5</Text>
          <View style={styles.progressBarWrapper}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>
      
      {/* The step screens will render here */}
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
    paddingTop: 60, // Safe area roughly
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    marginLeft: -8, // compensate for padding
  },
  progressContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBarWrapper: {
    height: 6,
    backgroundColor: '#EDF2F7',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 3,
  },
});
