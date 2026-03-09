import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { AiUserIcon } from '@hugeicons/core-free-icons';

export default function Step1Gender() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  const handleNext = async () => {
    if (selectedGender) {
      await AsyncStorage.setItem('onboarding_gender', selectedGender);
      router.push('/(onboarding)/2');
    }
  };

  const options = [
    { id: 'male', label: 'Male', icon: AiUserIcon },
    { id: 'female', label: 'Female', icon: AiUserIcon },
    { id: 'other', label: 'Other', icon: AiUserIcon },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about yourself</Text>
      <Text style={styles.subtitle}>Let's start with your gender</Text>

      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedGender === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected
              ]}
              onPress={() => setSelectedGender(option.id)}
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
              <Text style={[
                styles.optionLabel,
                isSelected && styles.optionLabelSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button 
        title="Continue" 
        onPress={handleNext} 
        disabled={!selectedGender}
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
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
  },
  optionLabelSelected: {
    color: '#FF6B6B',
  },
  button: {
    marginTop: 'auto',
  }
});
