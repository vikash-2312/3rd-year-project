import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Activity01Icon, Dumbbell01Icon, ChampionIcon } from '@hugeicons/core-free-icons';

export default function Step3Activity() {
  const router = useRouter();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const handleNext = async () => {
    if (selectedActivity) {
      await AsyncStorage.setItem('onboarding_activity', selectedActivity);
      router.push('/(onboarding)/4');
    }
  };

  const options = [
    { id: 'light', label: '2-3 Days / Week', description: 'Light activity, walking, yoga', icon: Activity01Icon },
    { id: 'moderate', label: '3-4 Days / Week', description: 'Moderate workout, jogging', icon: Dumbbell01Icon },
    { id: 'active', label: '5-6 Days / Week', description: 'Intense training, athlete', icon: ChampionIcon },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Activity</Text>
      <Text style={styles.subtitle}>How often do you exercise?</Text>

      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedActivity === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected
              ]}
              onPress={() => setSelectedActivity(option.id)}
            >
              <View style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected
              ]}>
                <HugeiconsIcon 
                  icon={option.icon} 
                  color={isSelected ? '#FFFFFF' : '#A0AEC0'} 
                  size={32} 
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button 
        title="Continue" 
        onPress={handleNext} 
        disabled={!selectedActivity}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  optionsContainer: {
    flex: 1,
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: '#FF6B6B',
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#FF6B6B',
  },
  optionDescription: {
    fontSize: 14,
    color: '#718096',
  },
  button: {
    marginTop: 'auto',
  }
});
