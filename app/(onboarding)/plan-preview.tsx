import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FireIcon, Dumbbell01Icon, Activity01Icon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';

export default function PlanPreview() {
  const router = useRouter();
  const { user } = useUser();
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [goal, setGoal] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      const cals = await AsyncStorage.getItem(`onboarding_result_calories_${user.id}`);
      const prot = await AsyncStorage.getItem(`onboarding_result_protein_${user.id}`);
      const g = await AsyncStorage.getItem(`onboarding_goal_${user.id}`);
      
      setCalories(cals || '0');
      setProtein(prot || '0');
      setGoal(g === 'lose' ? 'Fat Loss' : g === 'gain' ? 'Muscle Gain' : 'Maintenance');
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start();
    };
    
    loadData();
  }, []);

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView 
        style={[styles.scrollArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconHeader}>
          <HugeiconsIcon icon={FireIcon} size={48} color="#FF6B6B" />
        </View>
        
        <Text style={styles.title}>Your Plan is Ready 🔥</Text>
        <Text style={styles.subtitle}>Our AI has engineered a personalized path to your results</Text>

        <View style={styles.resultsContainer}>
          <ResultCard 
            label="Daily Calories" 
            value={`${calories} kcal`} 
            icon={FireIcon} 
            color="#FF6B6B" 
          />
          <ResultCard 
            label="Protein Target" 
            value={`${protein}g`} 
            icon={Dumbbell01Icon} 
            color="#4FD1C5" 
          />
          <ResultCard 
            label="Your Goal" 
            value={goal} 
            icon={Activity01Icon} 
            color="#6366F1" 
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            You can adjust these targets anytime in your profile settings.
          </Text>
        </View>
      </Animated.ScrollView>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Button 
          title="Start My Plan 🚀" 
          onPress={handleStart} 
          style={styles.button}
        />
      </Animated.View>
    </View>
  );
}

function ResultCard({ label, value, icon, color }: any) {
  return (
    <View style={styles.resultCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <HugeiconsIcon icon={icon} size={24} color={color} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultLabel}>{label}</Text>
        <Text style={[styles.resultValue, { color: color }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  iconHeader: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  resultsContainer: {
    width: '100%',
    gap: 16,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F7FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  infoBox: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#0284C7',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    marginTop: 'auto',
    width: '100%',
  },
  button: {
    height: 64,
    borderRadius: 32,
  }
});
