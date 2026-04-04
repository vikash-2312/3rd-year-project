import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Leaf01Icon, NaturalFoodIcon, Dish01Icon, Restaurant01Icon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';

export default function Step6Diet() {
  const router = useRouter();
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);

  const handleNext = async () => {
    if (selectedDiet) {
      await AsyncStorage.setItem('onboarding_diet', selectedDiet);
      router.push('/(onboarding)/generating');
    }
  };

  const options = [
    { id: 'vegetarian', label: 'Vegetarian', description: 'Plant-based with dairy', icon: Leaf01Icon },
    { id: 'non-vegetarian', label: 'Non-Vegetarian', description: 'Includes meat and poultry', icon: Restaurant01Icon },
    { id: 'eggetarian', label: 'Eggetarian', description: 'Vegetarian plus eggs', icon: Dish01Icon },
    { id: 'vegan', label: 'Vegan', description: 'Strictly plant-based', icon: NaturalFoodIcon },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your diet preference?</Text>
        <Text style={styles.subtitle}>We’ll customize your meal suggestions based on this</Text>
      </View>

      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedDiet === option.id;
          return (
            <OptionCard
              key={option.id}
              label={option.label}
              description={option.description}
              icon={option.icon}
              isSelected={isSelected}
              onPress={() => {
                setSelectedDiet(option.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          );
        })}
      </View>

      <Button 
        title="Continue" 
        onPress={handleNext} 
        disabled={!selectedDiet}
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
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 2,
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
