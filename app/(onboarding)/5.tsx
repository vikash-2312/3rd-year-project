import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export default function Step5Measurements() {
  const router = useRouter();
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidMeasurements = weight.length > 0 && heightCm.length > 0;

  const handleNext = async () => {
    if (!isValidMeasurements) return;
    setIsSubmitting(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await AsyncStorage.setItem('onboarding_weight', weight);
      await AsyncStorage.setItem('onboarding_height_cm', heightCm);
      
      // Navigate to the next step (Step 6: Diet)
      router.push('/(onboarding)/6');
    } catch (error) {
      console.error('Error saving measurement data:', error);
      Alert.alert('Error', 'Failed to save your progress. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Let’s find your baseline</Text>
          <Text style={styles.subtitle}>We'll use this to calculate your personal targets</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.sectionTitle}>Current Weight</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <InputField
                key="weight"
                placeholder="0.0"
                value={weight}
                onChangeText={(text) => setWeight(text.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                textAlign="center"
                style={styles.inputBox}
              />
            </View>
            <Text style={styles.unitText}>kg</Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.sectionTitle}>Height</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <InputField
                key="heightCm"
                placeholder="000"
                value={heightCm}
                onChangeText={(text) => setHeightCm(text.replace(/[^0-9]/g, '').slice(0, 3))}
                keyboardType="number-pad"
                textAlign="center"
                style={styles.inputBox}
              />
            </View>
            <Text style={styles.unitText}>cm</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button 
            title="Continue" 
            onPress={handleNext} 
            disabled={!isValidMeasurements || isSubmitting}
            loading={isSubmitting}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 32,
    backgroundColor: '#F7FAFC',
    padding: 24,
    borderRadius: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A0AEC0',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    width: 120,
  },
  inputBox: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A202C',
  },
  unitText: {
    fontSize: 20,
    color: '#A0AEC0',
    fontWeight: '700',
    marginLeft: 12,
  },
  footer: {
    marginTop: 'auto',
    width: '100%',
  },
  button: {
    marginTop: 40,
  }
});
