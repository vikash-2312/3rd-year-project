import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, Alert } from 'react-native';
import { useUser } from '@clerk/expo';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '../components/Button';

export default function LogExerciseManualScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [calories, setCalories] = useState('');
  const [description, setDescription] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    if (!user) return;
    setIsLogging(true);

    try {
      const logData = {
        userId: user.id,
        type: 'exercise',
        name: 'Manual Calories',
        description: description,
        calories: parseFloat(calories) || 0,
        timestamp: serverTimestamp(),
        date: format(new Date(), 'yyyy-MM-dd'),
      };

      console.log('[ManualLog] Saving log:', logData);
      await addDoc(collection(db, 'logs'), logData);

      Alert.alert('Success', 'Workout logged successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error('Error logging manual workout:', error);
      Alert.alert('Error', 'Failed to log workout. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#2D3748" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manual Entry</Text>
            <View style={styles.headerRight} />
          </View>

          <View style={styles.content}>
            <View style={styles.iconWrapper}>
              <View style={styles.iconCircle}>
                <Ionicons name="flame-outline" size={50} color="#009050" />
              </View>
              <Text style={styles.questionText}>How many calories did you burn?</Text>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="190"
                placeholderTextColor="#E2E8F0"
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
                maxLength={5}
                autoFocus
              />
              <Text style={styles.unitText}>cal</Text>
            </View>

            <View style={styles.descriptionWrapper}>
              <Text style={styles.descriptionLabel}>Description (Optional)</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="e.g. Hiking, Yoga class..."
                placeholderTextColor="#A0AEC0"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Footer / Button Area */}
          <View style={styles.footer}>
            <Button
              title={isLogging ? "Logging..." : "Log Calories"}
              onPress={handleLog}
              disabled={!calories || parseInt(calories) <= 0 || isLogging}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconWrapper: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 40,
  },
  input: {
    fontSize: 70,
    fontWeight: 'bold',
    color: '#009050',
    minWidth: 120,
    textAlign: 'center',
  },
  unitText: {
    fontSize: 30,
    fontWeight: '600',
    color: '#A0AEC0',
    marginLeft: 8,
  },
  descriptionWrapper: {
    marginTop: 10,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 12,
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    color: '#2D3748',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFFFFF',
  },
});
