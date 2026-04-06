import React, { useEffect, useState, useMemo } from 'react';
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
  TextInput,
  Image,
  Dimensions
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
  Activity01Icon as WeightIcon,
  Calendar01Icon,
  ArtificialIntelligence01Icon as SparklesIcon,
  Camera01Icon,
  Settings02Icon,
  Delete02Icon,
  Dumbbell01Icon,
  GlobalIcon,
  CalculatorIcon,
  NoteIcon,
  DashboardCircleIcon,
  EnergyIcon,
  Time02Icon,
  WorkIcon as ProfessionalIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../lib/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfilePicture } from '../services/userService';
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  Layout, 
  useAnimatedStyle, 
  withSpring,
  interpolateColor,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little/No exercise, desk job', icon: Moon02Icon, color: '#718096', multiplier: 1.2 },
  { id: 'light', label: 'Lightly Active', desc: 'Exercise 1-3 days/wk', icon: Footprints, color: '#4A5568', multiplier: 1.375 },
  { id: 'moderate', label: 'Moderately Active', desc: 'Exercise 3-5 days/wk', icon: ProfessionalIcon, color: '#3182CE', multiplier: 1.55 },
  { id: 'active', label: 'Very Active', desc: 'Hard exercise 6-7 days/wk', icon: FireIcon, color: '#009050', multiplier: 1.725 },
  { id: 'extra', label: 'Extra Active', desc: 'Physical job / Hard training', icon: EnergyIcon, color: '#E53E3E', multiplier: 1.9 },
];

const GOALS = [
  { id: 'lose_weight', label: 'Lose Weight', desc: 'Focus on fat loss', icon: FireIcon, color: '#E53E3E', offset: -500 },
  { id: 'maintain', label: 'Maintain', desc: 'Stay healthy & balanced', icon: DashboardCircleIcon, color: '#3182CE', offset: 0 },
  { id: 'gain_muscle', label: 'Gain Muscle', desc: 'Build strength & mass', icon: Dumbbell01Icon, color: '#009050', offset: 300 },
];

export default function PersonalDetails() {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile Photo State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [existingPhotoURL, setExistingPhotoURL] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [gender, setGender] = useState('');
  const [goal, setGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  
  // Target State
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [water, setWater] = useState('');
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');
  const [targetWeight, setTargetWeight] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data().profile || {};
          
          setFullName(userSnap.data().display_name || user?.fullName || '');
          setAge(data.age?.toString() || '');
          setWeight(data.measurements?.weightKg?.toString() || '');
          setHeightFt(data.measurements?.heightFt?.toString() || '');
          setHeightIn(data.measurements?.heightIn?.toString() || '');
          setGender(data.gender || 'male');
          setGoal(data.goal || 'maintain');
          setActivityLevel(data.activityLevel || 'moderate');
          setExistingPhotoURL(data.photoURL || user?.imageUrl || null);
          setCalories(data.macros?.dailyCalories?.toString() || '2000');
          setProtein(data.macros?.proteinGrams?.toString() || '150');
          setCarbs(data.macros?.carbsGrams?.toString() || '200');
          setFats(data.macros?.fatsGrams?.toString() || '60');
          setWater(data.macros?.waterIntakeLiters?.toString() || '2.5');
          setSteps(data.macros?.dailySteps?.toString() || '10000');
          setSleep(data.macros?.dailySleep?.toString() || '8');
          setTargetWeight(data.measurements?.targetWeightKg?.toString() || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  // Real-time BMR/TDEE Calculation
  const liveStats = useMemo(() => {
    const weightKg = parseFloat(weight);
    const totalInches = ((parseInt(heightFt) || 0) * 12) + (parseInt(heightIn) || 0);
    const heightCm = totalInches * 2.54;
    const userAge = parseInt(age) || 25;

    if (!weightKg || !heightCm || !userAge || !gender) return null;

    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * userAge);
    if (gender === 'male') bmr += 5;
    else bmr -= 161;

    const activity = ACTIVITY_LEVELS.find(a => a.id === activityLevel);
    const multiplier = activity?.multiplier || 1.2;
    const tdee = Math.round(bmr * multiplier);

    const goalObj = GOALS.find(g => g.id === goal);
    const suggested = tdee + (goalObj?.offset || 0);

    return { bmr: Math.round(bmr), tdee, suggested };
  }, [weight, heightFt, heightIn, age, gender, activityLevel, goal]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled && user) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      setIsUploadingPhoto(true);
      try {
        const finalURL = await uploadProfilePicture(user.id, uri);
        setExistingPhotoURL(finalURL);
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { 'profile.photoURL': finalURL });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error uploading photo:', error);
        Alert.alert('Error', 'Failed to upload photo.');
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!user) return;
    
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setIsUploadingPhoto(true);
            try {
              const userRef = doc(db, 'users', user.id);
              await updateDoc(userRef, { 'profile.photoURL': null });
              setExistingPhotoURL(null);
              setSelectedImage(null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to remove photo.');
            } finally {
              setIsUploadingPhoto(false);
            }
          }
        }
      ]
    );
  };

  const applySuggestedMacros = () => {
    if (!liveStats) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const suggestedCalories = liveStats.suggested;
    const p = Math.round((suggestedCalories * 0.3) / 4);
    const c = Math.round((suggestedCalories * 0.4) / 4);
    const f = Math.round((suggestedCalories * 0.3) / 9);
    setCalories(suggestedCalories.toString());
    setProtein(p.toString());
    setCarbs(c.toString());
    setFats(f.toString());
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        'display_name': fullName,
        'profile.age': parseInt(age) || 0,
        'profile.measurements.weightKg': parseFloat(weight) || 0,
        'profile.measurements.heightFt': parseInt(heightFt) || 0,
        'profile.measurements.heightIn': parseInt(heightIn) || 0,
        'profile.gender': gender,
        'profile.goal': goal,
        'profile.activityLevel': activityLevel,
        'profile.measurements.targetWeightKg': parseFloat(targetWeight) || 0,
        'profile.macros.dailyCalories': parseInt(calories) || 0,
        'profile.macros.proteinGrams': parseInt(protein) || 0,
        'profile.macros.carbsGrams': parseInt(carbs) || 0,
        'profile.macros.fatsGrams': parseInt(fats) || 0,
        'profile.macros.waterIntakeLiters': parseFloat(water) || 0,
        'profile.macros.dailySteps': parseInt(steps) || 10000,
        'profile.macros.dailySleep': parseFloat(sleep) || 8,
        'profile.updatedAt': new Date()
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile optimized!', [{ text: 'Done', onPress: () => router.back() }]);
    } catch (error) {
      console.error('Save error:', error);
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
      <View style={[styles.inputContainer, { backgroundColor: colors.inputBg || (isDark ? '#222' : '#F7F7F7'), borderColor: colors.border }]}>
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

  const OptionCard = ({ item, isSelected, onSelect }: any) => {
    const animatedScale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(isSelected ? 1.05 : 1) }],
      backgroundColor: isSelected ? `${item.color}15` : isDark ? '#222' : '#F7F7F7',
      borderColor: isSelected ? item.color : colors.border,
    }));

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect(item.id);
        }}
        style={{ width: '48%', marginBottom: 12 }}
      >
        <Animated.View style={[styles.optionCard, animatedStyle]}>
          <HugeiconsIcon icon={item.icon} size={24} color={isSelected ? item.color : colors.textMuted} />
          <Text style={[styles.optionLabel, { color: isSelected ? colors.text : colors.textTertiary }]}>{item.label}</Text>
          <Text style={[styles.optionDesc, { color: colors.textMuted }]} numberOfLines={1}>{item.desc}</Text>
          {isSelected && (
            <View style={[styles.selectedCircle, { backgroundColor: item.color }]}>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color="#FFF" />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={() => router.back()}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Elite Performance Suite</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Identity Card */}
          <Animated.View entering={FadeInDown.delay(100).springify().damping(12)} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity activeOpacity={0.8} onPress={handlePickImage} style={[styles.avatarWrapper, { borderColor: colors.border }]}>
                  {selectedImage || existingPhotoURL ? (
                    <Image source={{ uri: selectedImage || existingPhotoURL! }} style={styles.avatarImage} />
                  ) : (
                    <HugeiconsIcon icon={UserCircleIcon} size={64} color={colors.textMuted} />
                  )}
                  {isUploadingPhoto && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  )}
                  <View style={[styles.avatarBadge, { backgroundColor: colors.accent }]}>
                    <HugeiconsIcon icon={Camera01Icon} size={16} color="#FFF" />
                  </View>
                </TouchableOpacity>
                {(selectedImage || existingPhotoURL) && !isUploadingPhoto && (
                  <TouchableOpacity 
                    style={[styles.deleteBadge, { backgroundColor: isDark ? '#2D3748' : '#FFF', borderColor: colors.border }]} 
                    onPress={handleDeletePhoto}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {renderInput('Full Name', fullName, setFullName, 'Your Identity', 'default')}
            
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                {renderInput('Biological Age', age, setAge, '25', 'number-pad')}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Gender</Text>
                <View style={styles.genderRow}>
                  {['male', 'female'].map(g => (
                    <TouchableOpacity 
                      key={g}
                      style={[
                        styles.genderBtn, 
                        { backgroundColor: gender === g ? colors.accent : (isDark ? '#222' : '#F7F7F7'), borderColor: colors.border }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setGender(g);
                      }}
                    >
                      <Text style={[styles.genderBtnText, { color: gender === g ? '#FFF' : colors.textTertiary }]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Physical Dimensions */}
          <Animated.View entering={FadeInDown.delay(200).springify().damping(12)} style={[styles.card, { backgroundColor: colors.card }]}>
            {renderSectionHeader('Dimensions', RulerIcon, '#3182CE')}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                {renderInput('Current Weight', weight, setWeight, '70', 'decimal-pad', 'kg')}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput('Target Weight', targetWeight, setTargetWeight, '65', 'decimal-pad', 'kg')}
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                {renderInput('Height (Ft)', heightFt, setHeightFt, '5', 'number-pad')}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput('Height (In)', heightIn, setHeightIn, '10', 'number-pad')}
              </View>
            </View>
          </Animated.View>

          {/* Performance Mode (Goals & Activity) */}
          <Animated.View entering={FadeInDown.delay(300).springify().damping(12)} style={[styles.card, { backgroundColor: colors.card }]}>
            {renderSectionHeader('Performance Goal', FireIcon, '#E53E3E')}
            <View style={styles.gridRow}>
              {(GOALS || []).map(g => (
                <OptionCard key={g.id} item={g} isSelected={goal === g.id} onSelect={setGoal} />
              ))}
            </View>

            <View style={{ height: 24 }} />
            
            {renderSectionHeader('Activity Threshold', Footprints, '#009050')}
            <View style={styles.gridRow}>
              {(ACTIVITY_LEVELS || []).map(a => (
                <OptionCard key={a.id} item={a} isSelected={activityLevel === a.id} onSelect={setActivityLevel} />
              ))}
            </View>
          </Animated.View>

          {/* Health Precision */}
          <Animated.View entering={FadeInDown.delay(400).springify().damping(12)} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderBetween}>
              {renderSectionHeader('Precision Targets', CalculatorIcon, '#805AD5')}
              <TouchableOpacity 
                style={[styles.aiButton, { backgroundColor: liveStats ? colors.accent : colors.border }]} 
                onPress={applySuggestedMacros}
                disabled={!liveStats}
              >
                <HugeiconsIcon icon={SparklesIcon} size={16} color="#FFF" />
                <Text style={styles.aiButtonText}>AUTO-OPTIMIZE</Text>
              </TouchableOpacity>
            </View>
            
            {renderInput('Daily Calorie Fuel', calories, setCalories, '2000', 'number-pad', 'kcal')}
            
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>{renderInput('Protein', protein, setProtein, '150', 'number-pad', 'g')}</View>
              <View style={{ flex: 1, marginRight: 8 }}>{renderInput('Carbs', carbs, setCarbs, '200', 'number-pad', 'g')}</View>
              <View style={{ flex: 1 }}>{renderInput('Fats', fats, setFats, '60', 'number-pad', 'g')}</View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>{renderInput('Hydration', water, setWater, '2.5', 'decimal-pad', 'L')}</View>
              <View style={{ flex: 1 }}>{renderInput('Daily Steps', steps, setSteps, '10000', 'number-pad', 'steps')}</View>
            </View>
          </Animated.View>

          <Button title={isSaving ? "Synchronizing..." : "Finalize Optimization"} onPress={handleSave} disabled={isSaving} style={styles.saveButton} />
          
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Live Biological Ticker */}
        {liveStats && (
          <Animated.View entering={FadeInDown.duration(500)} style={[styles.tickerBar, { backgroundColor: isDark ? '#1A202C' : '#FFF' }]}>
            <LinearGradient colors={['rgba(0,144,80,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
            <View style={styles.tickerContent}>
              <View style={styles.tickerItem}>
                <Text style={[styles.tickerLabel, { color: colors.textTertiary }]}>BMR (Static)</Text>
                <Text style={[styles.tickerValue, { color: colors.text }]}>{liveStats.bmr} <Text style={styles.tickerUnit}>kcal</Text></Text>
              </View>
              <View style={styles.tickerDivider} />
              <View style={styles.tickerItem}>
                <Text style={[styles.tickerLabel, { color: colors.textTertiary }]}>TDEE (Active)</Text>
                <Text style={[styles.tickerValue, { color: colors.text }]}>{liveStats.tdee} <Text style={styles.tickerUnit}>kcal</Text></Text>
              </View>
              <View style={styles.tickerDivider} />
              <View style={[styles.tickerItem, { alignItems: 'flex-end' }]}>
                <Text style={[styles.tickerLabel, { color: colors.accent, fontWeight: '900' }]}>SUGGESTED</Text>
                <Text style={[styles.tickerValue, { color: colors.accent }]}>{liveStats.suggested} <Text style={styles.tickerUnit}>kcal</Text></Text>
              </View>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  backButton: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  container: { flex: 1 },
  content: { padding: 16 },
  card: { borderRadius: 32, padding: 24, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { position: 'relative' },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  deleteBadge: { position: 'absolute', top: -4, right: -4, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', zIndex: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionHeaderBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '800', marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, fontSize: 15, fontWeight: '700', height: '100%' },
  unitText: { fontSize: 12, fontWeight: '800', opacity: 0.6 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  genderBtnText: { fontSize: 14, fontWeight: '800' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  optionCard: { width: '100%', padding: 16, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', position: 'relative' },
  optionLabel: { fontSize: 15, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  optionDesc: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  selectedCircle: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  aiButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  aiButtonText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  saveButton: { height: 60, borderRadius: 20 },
  tickerBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: Platform.OS === 'ios' ? 32 : 16, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 20 },
  tickerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tickerItem: { flex: 1 },
  tickerLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  tickerValue: { fontSize: 18, fontWeight: '900' },
  tickerUnit: { fontSize: 12, fontWeight: '600', opacity: 0.5 },
  tickerDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.05)', marginHorizontal: 12 },
});
