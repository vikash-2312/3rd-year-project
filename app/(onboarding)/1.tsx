import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { AiUserIcon, GlobalIcon, UserIcon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';

export default function Step1Gender() {
  const router = useRouter();
  const { user } = useUser();
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  const handleNext = async () => {
    if (selectedGender && user?.id) {
      await AsyncStorage.setItem(`onboarding_gender_${user.id}`, selectedGender);
      router.push('/(onboarding)/2');
    }
  };

  const options = [
    { id: 'male', label: 'Male', icon: UserIcon },
    { id: 'female', label: 'Female', icon: UserIcon },
    { id: 'other', label: 'Other', icon: GlobalIcon },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Let’s build your personal fitness plan</Text>
        <Text style={styles.subtitle}>We'll customize everything for your goal</Text>
      </View>

      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedGender === option.id;
          
          return (
            <OptionCard
              key={option.id}
              label={option.label}
              icon={option.icon}
              isSelected={isSelected}
              onPress={() => {
                setSelectedGender(option.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          );
        })}
      </View>

      <Button 
        title="Continue" 
        onPress={handleNext} 
        disabled={!selectedGender || !user?.id}
        style={styles.button}
      />
    </View>
  );
}

function OptionCard({ label, icon, isSelected, onPress }: any) {
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
        <Text style={[
          styles.optionLabel,
          isSelected && styles.optionLabelSelected
        ]}>
          {label}
        </Text>
        {isSelected && (
          <View style={styles.checkContainer}>
            <View style={styles.checkCircle} />
          </View>
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
    // Shadow for non-selected
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
    // Stronger shadow for selected
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
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A5568',
  },
  optionLabelSelected: {
    color: '#1A202C',
  },
  checkContainer: {
    marginLeft: 'auto',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    borderWidth: 6,
    borderColor: '#FFE5E5',
  },
  button: {
    marginTop: 'auto',
  }
});
