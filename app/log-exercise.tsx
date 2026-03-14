import { Ionicons } from '@expo/vector-icons';
import { Dumbbell01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
          <Ionicons name="arrow-back" size={28} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Exercise</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Option 1: Run */}
        <TouchableOpacity style={styles.optionCard} onPress={() => handleOptionPress('Cardio', 'Running, Walking, Cycling etc')} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: '#EBF8FF' }]}>
            <Ionicons name="footsteps-outline" size={28} color="#3182CE" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.optionTitle}>Cardio</Text>
            <Text style={styles.optionDescription}>Running, Walking, Cycling etc</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
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
          <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
        </TouchableOpacity>

        {/* Option 3: Manual */}
        <TouchableOpacity style={styles.optionCard} onPress={() => handleOptionPress('Manual', 'Enter calories Burn Manually')} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: '#F0FFF4' }]}>
            <Ionicons name="create-outline" size={28} color="#009050" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.optionTitle}>Manual</Text>
            <Text style={styles.optionDescription}>Enter calories Burn Manually</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CBD5E0" />
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
});
