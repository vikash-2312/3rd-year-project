import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Step5Measurements() {
  const router = useRouter();
  const { user } = useUser();
  const [weight, setWeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidMeasurements = weight.length > 0 && heightFt.length > 0 && heightIn.length > 0;

  const handleComplete = async () => {
    if (!isValidMeasurements || !user) return;
    setIsSubmitting(true);

    try {
      // 1. Save step 5 data to AsyncStorage
      await AsyncStorage.setItem('onboarding_weight', weight);
      await AsyncStorage.setItem('onboarding_height_ft', heightFt);
      await AsyncStorage.setItem('onboarding_height_in', heightIn);

      // 2. Navigate to AI generation screen
      router.replace('/(onboarding)/generating');
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
        <Text style={styles.title}>Your Measurements</Text>
        <Text style={styles.subtitle}>Help us set the right baseline for you</Text>

        <View style={styles.formGroup}>
          <Text style={styles.sectionTitle}>Weight</Text>
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
                key="heightFt"
                placeholder="Ft"
                value={heightFt}
                onChangeText={(text) => setHeightFt(text.replace(/[^0-9]/g, '').slice(0, 1))}
                keyboardType="number-pad"
                textAlign="center"
                style={styles.inputBox}
              />
            </View>
            <Text style={styles.unitText}>ft</Text>
            
            <View style={[styles.inputWrapper, { marginLeft: 16 }]}>
              <InputField
                key="heightIn"
                placeholder="In"
                value={heightIn}
                onChangeText={(text) => setHeightIn(text.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                textAlign="center"
                style={styles.inputBox}
              />
            </View>
            <Text style={styles.unitText}>in</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button 
            title="Complete Setup" 
            onPress={handleComplete} 
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 40,
  },
  formGroup: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
  },
  inputBox: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  unitText: {
    fontSize: 18,
    color: '#A0AEC0',
    fontWeight: '600',
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
