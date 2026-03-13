import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Button } from '../components/Button';
import { db } from '../lib/firebase';

export default function LogExerciseDetailsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { title, description } = useLocalSearchParams();

  const [intensity, setIntensity] = useState('Medium');
  const intensityValues = ['Low', 'Medium', 'High'];

  const durations = [15, 30, 60, 90];
  const [duration, setDuration] = useState<number>(30);
  const [manualDuration, setManualDuration] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);

  const handleDurationSelect = (val: number) => {
    setDuration(val);
    setManualDuration('');
  };

  const handleManualDuration = (text: string) => {
    setManualDuration(text);
    if (text) {
      setDuration(parseInt(text) || 0);
    }
  };

  const calculateCalories = (userWeight: number, exerciseType: string, intensityLevel: string, durationMins: number) => {
    let met = 0;
    const isCardio = exerciseType === 'Cardio';

    if (isCardio) {
      if (intensityLevel === 'Low') met = 5.0; // Brisk walk / Light jog
      else if (intensityLevel === 'Medium') met = 8.5; // Moderate run
      else met = 11.5; // Vigorous run
    } else {
      // Weight Lifting
      if (intensityLevel === 'Low') met = 3.0;
      else if (intensityLevel === 'Medium') met = 4.5;
      else met = 6.0;
    }

    // Standard formula: Calories = MET * Weight(kg) * Time(hrs)
    const caloriesBurned = met * userWeight * (durationMins / 60);
    return Math.round(caloriesBurned);
  };

  const handleContinue = async () => {
    const finalDuration = manualDuration ? parseInt(manualDuration) : duration;
    if (!finalDuration || finalDuration <= 0) return;

    if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return;
    }

    setIsCalculating(true);
    try {
      // Get user weight from Firestore
      const userRef = doc(db, 'users', user.id);
      const userSnap = await getDoc(userRef);
      
      let weight = 70; // Default fallback weight if profile not found
      if (userSnap.exists()) {
        const profile = userSnap.data().profile;
        if (profile?.measurements?.weightKg) {
          weight = profile.measurements.weightKg;
        }
      }

      const calBurned = calculateCalories(weight, title as string, intensity, finalDuration);

      router.push({
        pathname: '/log-exercise-result',
        params: {
          calories: calBurned.toString(),
          title: title as string,
          intensity: intensity,
          duration: finalDuration.toString(),
          description: description as string
        }
      });
    } catch (err) {
      console.error('Calculation Error:', err);
      Alert.alert('Error', 'Failed to calculate calories. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#2D3748" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title and Description */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{title || 'Exercise'}</Text>
          <Text style={styles.pageDescription}>{description || 'Log your workout details'}</Text>
        </View>

        {/* Intensity Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flame-outline" size={22} color="#E53E3E" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Intensity of Workout</Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrackLine}>
              <View style={[
                  styles.sliderActiveTrack, 
                  { width: intensity === 'Low' ? '0%' : intensity === 'Medium' ? '50%' : '100%' }
                ]} 
              />
            </View>
            
            {intensityValues.map((val, index) => (
              <TouchableOpacity 
                key={val}
                activeOpacity={0.8}
                onPress={() => setIntensity(val)}
                style={[
                  styles.sliderThumbWrapper, 
                  { left: `${index * 50}%` }
                ]}
              >
                <View style={[styles.sliderThumb, intensity === val && styles.sliderThumbActive]} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabelText, intensity === 'Low' && styles.sliderLabelActive]}>Low</Text>
            <Text style={[styles.sliderLabelText, {textAlign: 'center'}, intensity === 'Medium' && styles.sliderLabelActive]}>Medium</Text>
            <Text style={[styles.sliderLabelText, {textAlign: 'right'}, intensity === 'High' && styles.sliderLabelActive]}>High</Text>
          </View>
        </View>

        {/* Duration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={22} color="#3182CE" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Duration</Text>
          </View>
          
          <View style={styles.chipsContainer}>
            {durations.map(d => (
              <TouchableOpacity 
                key={d} 
                style={[styles.chip, duration === d && !manualDuration && styles.chipActive]} 
                onPress={() => handleDurationSelect(d)}
              >
                <Text style={[styles.chipText, duration === d && !manualDuration && styles.chipTextActive]}>
                  {d} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.manualInputContainer}>
            <Text style={styles.manualInputLabel}>Or enter manually:</Text>
            <TextInput
              style={styles.durationInput}
              placeholder="e.g. 45"
              keyboardType="number-pad"
              value={manualDuration}
              onChangeText={handleManualDuration}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button 
          title={isCalculating ? "Calculating..." : "Continue"} 
          onPress={handleContinue} 
          disabled={isCalculating || (duration <= 0 && (!manualDuration || parseInt(manualDuration) <= 0))}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#F7FAFC',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    alignSelf: 'flex-start',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 16,
    color: '#718096',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  
  // Custom Slider
  sliderContainer: {
    height: 30,
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
    marginHorizontal: 10,
  },
  sliderTrackLine: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    width: '100%',
    position: 'absolute',
  },
  sliderActiveTrack: {
    height: 8,
    backgroundColor: '#009050',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  sliderThumbWrapper: {
    position: 'absolute',
    marginLeft: -15, // Half of thumb width
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderThumbActive: {
    borderColor: '#009050',
    borderWidth: 6,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -5,
  },
  sliderLabelText: {
    flex: 1,
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  sliderLabelActive: {
    color: '#009050',
    fontWeight: 'bold',
  },

  // Chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#E6F4EA',
    borderColor: '#009050',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  chipTextActive: {
    color: '#009050',
  },

  // Manual Input
  manualInputContainer: {
    marginTop: 8,
  },
  manualInputLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
    fontWeight: '500',
  },
  durationInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3748',
  },

  // Footer
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
});
