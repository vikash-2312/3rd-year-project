import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Activity01Icon, Dumbbell01Icon, ChampionIcon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';

export default function Step3Activity() {
  const router = useRouter();
  const { user } = useUser();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const handleNext = async () => {
    if (selectedActivity && user?.id) {
      await AsyncStorage.setItem(`onboarding_activity_${user.id}`, selectedActivity);
      router.push('/(onboarding)/4');
    }
  };

  const options = [
    { id: 'light', label: 'Lightly Active', description: 'Office job, 1-2 workouts/week', icon: Activity01Icon },
    { id: 'moderate', label: 'Moderately Active', description: 'Active lifestyle, 3-4 workouts/week', icon: Dumbbell01Icon },
    { id: 'active', label: 'Very Active', description: 'Physical job, 5+ workouts/week', icon: ChampionIcon },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>How active is your lifestyle?</Text>
        <Text style={styles.subtitle}>This helps us calculate your maintenance calories perfectly</Text>
      </View>

      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedActivity === option.id;
          return (
            <OptionCard
              key={option.id}
              label={option.label}
              description={option.description}
              icon={option.icon}
              isSelected={isSelected}
              onPress={() => {
                setSelectedActivity(option.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          );
        })}
      </View>

      <Button 
        title="Continue" 
        onPress={handleNext} 
        disabled={!selectedActivity || !user?.id}
        style={styles.button}
      />
    </View>
  );
}

function OptionCard({ label, description, icon, isSelected, onPress }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      style={{ overflow: 'visible' }}
    >
      <Animated.View style={[
        styles.optionCard,
        isSelected && styles.optionCardSelected,
        { transform: [{ scale }] }
      ]}>
        <View style={[
          styles.iconContainer,
          isSelected && styles.iconContainerSelected
        ]}>
          <HugeiconsIcon 
            icon={icon} 
            color={isSelected ? '#FFFFFF' : '#A0AEC0'} 
            size={28} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[
            styles.optionLabel,
            isSelected && styles.optionLabelSelected
          ]}>
            {label}
          </Text>
          <Text style={styles.optionDescription}>
            {description}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkCircle} />
        )}
      </Animated.View>
    </Pressable>
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
  optionsContainer: {
    flex: 1,
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F7FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F7FAFC',
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
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#FF6B6B',
  },
  optionDescription: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    borderWidth: 5,
    borderColor: '#FFE5E5',
    marginLeft: 12,
  },
  button: {
    marginTop: 'auto',
  }
});
