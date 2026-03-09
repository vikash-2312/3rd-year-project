import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Step4Birthdate() {
  const router = useRouter();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const isValidDate = day.length > 0 && month.length > 0 && year.length === 4;

  const handleNext = async () => {
    if (isValidDate) {
      const birthdate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      await AsyncStorage.setItem('onboarding_birthdate', birthdate);
      router.push('/(onboarding)/5');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>When were you born?</Text>
        <Text style={styles.subtitle}>This helps us calculate your daily caloric needs accurately</Text>

        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Day</Text>
            <InputField
              key="day"
              placeholder="DD"
              value={day}
              onChangeText={(text) => setDay(text.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              textAlign="center"
              style={styles.inputBox}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Month</Text>
            <InputField
              key="month"
              placeholder="MM"
              value={month}
              onChangeText={(text) => setMonth(text.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              textAlign="center"
              style={styles.inputBox}
            />
          </View>

          <View style={[styles.inputWrapper, { flex: 1.5 }]}>
            <Text style={styles.inputLabel}>Year</Text>
            <InputField
              key="year"
              placeholder="YYYY"
              value={year}
              onChangeText={(text) => setYear(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              textAlign="center"
              style={styles.inputBox}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button 
            title="Continue" 
            onPress={handleNext} 
            disabled={!isValidDate}
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
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    textAlign: 'center',
  },
  inputBox: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
  },
  footer: {
    marginTop: 'auto',
    width: '100%',
  },
  button: {
    marginTop: 40,
  }
});
