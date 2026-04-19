import { 
  Dumbbell01Icon, 
  Activity01Icon, 
  SparklesIcon, 
  ArrowRight01Icon,
  ArrowLeft01Icon,
  QuillWrite01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LogExerciseScreen() {
  const router = useRouter();

  const handleOptionPress = (option: string, description: string) => {
    if (option === 'Cardio' || option === 'Weight Lifting') {
      router.push({
        pathname: '/log-exercise-details',
        params: {
          title: option,
          description: description
        }
      });
    } else if (option === 'Manual') {
      router.push('/log-exercise-manual');
    } else {
      console.log(`[LogExercise] Selected: ${option}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Exercise</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Option: AI Workout Generator */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/workouts')} 
          activeOpacity={0.9}
          style={styles.aiCardContainer}
        >
          <LinearGradient
            colors={['#009050', '#006B3C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCardGradient}
          >
            <View style={styles.aiIconContainer}>
              <HugeiconsIcon icon={SparklesIcon} size={28} color="#FFF" />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI POWERED</Text>
              </View>
              <Text style={styles.aiOptionTitle}>AI Workout Generator</Text>
              <Text style={styles.aiOptionDescription}>Custom routines based on your goals</Text>
            </View>
            <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Option 1: Cardio */}
        <TouchableOpacity style={styles.optionCard} onPress={() => handleOptionPress('Cardio', 'Running, Walking, Cycling etc')} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: '#EBF8FF' }]}>
            <HugeiconsIcon icon={Activity01Icon} size={28} color="#3182CE" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.optionTitle}>Cardio</Text>
            <Text style={styles.optionDescription}>Running, Walking, Cycling etc</Text>
          </View>
          <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#CBD5E0" />
        </TouchableOpacity>

        {/* Option 2: Weight Lifting */}
        <TouchableOpacity style={styles.optionCard} onPress={() => handleOptionPress('Weight Lifting', 'Gym, Machine etc')} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: '#FFF5F5' }]}>
            <HugeiconsIcon icon={Dumbbell01Icon} size={28} color="#E53E3E" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.optionTitle}>Weight Lifting</Text>
            <Text style={styles.optionDescription}>Gym, Machine etc</Text>
          </View>
          <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#CBD5E0" />
        </TouchableOpacity>

        {/* Option 3: Manual */}
        <TouchableOpacity style={styles.optionCard} onPress={() => handleOptionPress('Manual', 'Enter calories Burn Manually')} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: '#F0FFF4' }]}>
            <HugeiconsIcon icon={QuillWrite01Icon} size={28} color="#009050" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.optionTitle}>Manual</Text>
            <Text style={styles.optionDescription}>Enter calories Burn Manually</Text>
          </View>
          <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#CBD5E0" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  content: {
    padding: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#718096',
  },
  aiCardContainer: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  aiCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  aiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  aiOptionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  aiOptionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  aiBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  aiBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
});
