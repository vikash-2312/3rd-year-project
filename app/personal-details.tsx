import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { 
  ArrowLeft01Icon, 
  UserCircleIcon, 
  FireIcon, 
  BeefIcon, 
  Bread01Icon, 
  AvocadoIcon, 
  DropletIcon, 
  Footprints, 
  Moon02Icon,
  CheckmarkCircle02Icon,
  RulerIcon,
  Activity01Icon as WeightIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../lib/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';

export default function PersonalDetails() {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [weight, setWeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [gender, setGender] = useState('');
  const [goal, setGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  
  // Target State
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [water, setWater] = useState('');
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data().profile;
          // Basics
          setWeight(data.measurements?.weightKg?.toString() || '');
          setHeightFt(data.measurements?.heightFt?.toString() || '');
          setHeightIn(data.measurements?.heightIn?.toString() || '');
          setGender(data.gender || '');
          setGoal(data.goal || '');
          setActivityLevel(data.activityLevel || '');
          
          // Macros
          setCalories(data.macros?.dailyCalories?.toString() || '2000');
          setProtein(data.macros?.proteinGrams?.toString() || '150');
          setCarbs(data.macros?.carbsGrams?.toString() || '200');
          setFats(data.macros?.fatsGrams?.toString() || '60');
          setWater(data.macros?.waterIntakeLiters?.toString() || '2.5');
          
          // Lifestyle (with defaults if not present)
          setSteps(data.macros?.dailySteps?.toString() || '10000');
          setSleep(data.macros?.dailySleep?.toString() || '8');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load your profile data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const userRef = doc(db, 'users', user.id);
      
      const updatedProfile = {
        'profile.measurements.weightKg': parseFloat(weight) || 0,
        'profile.measurements.heightFt': parseInt(heightFt) || 0,
        'profile.measurements.heightIn': parseInt(heightIn) || 0,
        'profile.gender': gender,
        'profile.goal': goal,
        'profile.activityLevel': activityLevel,
        'profile.macros.dailyCalories': parseInt(calories) || 0,
        'profile.macros.proteinGrams': parseInt(protein) || 0,
        'profile.macros.carbsGrams': parseInt(carbs) || 0,
        'profile.macros.fatsGrams': parseInt(fats) || 0,
        'profile.macros.waterIntakeLiters': parseFloat(water) || 0,
        'profile.macros.dailySteps': parseInt(steps) || 10000,
        'profile.macros.dailySleep': parseFloat(sleep) || 8,
        'profile.updatedAt': new Date()
      };

      await updateDoc(userRef, updatedProfile);
      
      Alert.alert('Success', 'Your profile and targets have been updated.', [
        { text: 'Great', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSectionHeader = (title: string, icon: any, color: string) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}15` }]}>
        <HugeiconsIcon icon={icon} size={20} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  const renderInput = (label: string, value: string, setValue: (v: string) => void, placeholder: string, keyboardType: any = 'numeric', unit?: string) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>{label}</Text>
      <View style={[styles.inputContainer, { backgroundColor: colors.inputBg || (isDark ? '#2D3748' : '#F7FAFC'), borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
        />
        {unit && <Text style={[styles.unitText, { color: colors.textTertiary }]}>{unit}</Text>}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.card }]} 
            onPress={() => router.back()}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Personal Details</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Physical Metrics */}
          <View style={styles.section}>
            {renderSectionHeader('Physical Metrics', RulerIcon, '#3182CE')}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                {renderInput('Weight', weight, setWeight, '70', 'decimal-pad', 'kg')}
              </View>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  {renderInput('Ht (Ft)', heightFt, setHeightFt, '5', 'number-pad')}
                </View>
                <View style={{ flex: 1 }}>
                  {renderInput('Ht (In)', heightIn, setHeightIn, '10', 'number-pad')}
                </View>
              </View>
            </View>
          </View>

          {/* Goals & Activity */}
          <View style={styles.section}>
            {renderSectionHeader('Profile Basics', UserCircleIcon, '#805AD5')}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Gender</Text>
                <TouchableOpacity 
                  style={[styles.selectBox, { backgroundColor: colors.inputBg || (isDark ? '#2D3748' : '#F7FAFC'), borderColor: colors.border }]}
                  onPress={() => {
                    Alert.alert('Gender', 'Select your gender', [
                      { text: 'Male', onPress: () => setGender('male') },
                      { text: 'Female', onPress: () => setGender('female') },
                      { text: 'Other', onPress: () => setGender('other') },
                    ]);
                  }}
                >
                  <Text style={[styles.selectText, { color: gender ? colors.text : colors.textMuted }]}>
                    {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Fitness Goal</Text>
                <TouchableOpacity 
                  style={[styles.selectBox, { backgroundColor: colors.inputBg || (isDark ? '#2D3748' : '#F7FAFC'), borderColor: colors.border }]}
                  onPress={() => {
                    Alert.alert('Goal', 'Select your goal', [
                      { text: 'Lose Weight', onPress: () => setGoal('lose_weight') },
                      { text: 'Maintain', onPress: () => setGoal('maintain') },
                      { text: 'Gain Muscle', onPress: () => setGoal('gain_muscle') },
                    ]);
                  }}
                >
                  <Text style={[styles.selectText, { color: goal ? colors.text : colors.textMuted }]} numberOfLines={1}>
                    {goal ? goal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Macros & Targets */}
          <View style={styles.section}>
            {renderSectionHeader('Nutritional Targets', FireIcon, '#E53E3E')}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                {renderInput('Calories', calories, setCalories, '2000', 'number-pad', 'kcal')}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput('Water', water, setWater, '2.5', 'decimal-pad', 'L')}
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                {renderInput('Protein', protein, setProtein, '150', 'number-pad', 'g')}
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                {renderInput('Carbs', carbs, setCarbs, '200', 'number-pad', 'g')}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput('Fats', fats, setFats, '60', 'number-pad', 'g')}
              </View>
            </View>
          </View>

          {/* Lifestyle Targets */}
          <View style={styles.section}>
            {renderSectionHeader('Lifestyle Goals', Footprints, '#009050')}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                {renderInput('Daily Steps', steps, setSteps, '10000', 'number-pad', 'steps')}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput('Daily Sleep', sleep, setSleep, '8', 'decimal-pad', 'hrs')}
              </View>
            </View>
          </View>

          <Button 
            title={isSaving ? "Saving..." : "Save All Changes"}
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    height: '100%',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.6,
  },
  selectBox: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 16,
    height: 56,
    borderRadius: 16,
  }
});
