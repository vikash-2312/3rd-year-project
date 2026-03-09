import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { AArrowUpIcon, AArrowDownIcon, ApproximatelyEqualIcon } from '@hugeicons/core-free-icons';

export default function Step2Goal() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const handleNext = async () => {
    if (selectedGoal) {
      await AsyncStorage.setItem('onboarding_goal', selectedGoal);
      router.push('/(onboarding)/3');
    }
  };

  const options = [
    { id: 'lose', label: 'Lose Weight', description: 'Burn fat and get leaner', icon: AArrowDownIcon },
    { id: 'maintain', label: 'Maintain Weight', description: 'Stay healthy and fit', icon: ApproximatelyEqualIcon },
    { id: 'gain', label: 'Gain Weight', description: 'Build muscle mass', icon: AArrowUpIcon },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's your goal?</Text>
      <Text style={styles.subtitle}>This helps us tailor your experience</Text>

      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedGoal === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected
              ]}
              onPress={() => setSelectedGoal(option.id)}
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
        disabled={!selectedGoal}
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
