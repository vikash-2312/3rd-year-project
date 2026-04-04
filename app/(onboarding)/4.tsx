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
        <View style={styles.header}>
          <Text style={styles.title}>When’s your birthday?</Text>
          <Text style={styles.subtitle}>This helps our AI calculate your metabolism accurately</Text>
        </View>

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
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A0AEC0',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputBox: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footer: {
    marginTop: 'auto',
    width: '100%',
  },
  button: {
    marginTop: 40,
  }
});
