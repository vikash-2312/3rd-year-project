import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Button } from '../components/Button';
import { db } from '../lib/firebase';

export default function LogExerciseResultScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { calories, title, intensity, duration, description } = useLocalSearchParams();
  const [isLogging, setIsLogging] = useState(false);

  const handleLogWorkout = async () => {
    if (!user) return;
    setIsLogging(true);

    try {
      const logData = {
        userId: user.id,
        type: 'exercise',
        name: title || 'Workout',
        description: description || '',
        intensity: intensity,
        duration: duration,
        calories: parseFloat(calories as string) || 0,
        timestamp: serverTimestamp(),
        date: format(new Date(), 'yyyy-MM-dd'),
      };

      console.log('[ExerciseResult] Saving log:', logData);
      await addDoc(collection(db, 'logs'), logData);

      Alert.alert('Success', 'Workout logged successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error('Error logging workout:', error);
      Alert.alert('Error', 'Failed to log workout. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#2D3748" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="flame" size={60} color="#009050" />
        </View>

        <Text style={styles.calorieText}>{calories}</Text>
        <Text style={styles.label}>Your Workout Burned</Text>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Activity</Text>
            <Text style={styles.detailValue}>{title}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{duration} min</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button 
          title={isLogging ? "Logging..." : "Log Calories"} 
          onPress={handleLogWorkout}
          disabled={isLogging}
        />
      </View>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -60,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  calorieText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#009050',
    lineHeight: 80,
  },
  label: {
    fontSize: 20,
    color: '#4A5568',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 48,
  },
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  detailDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
});
