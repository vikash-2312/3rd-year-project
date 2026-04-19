import { useUser } from "@clerk/expo";
import { ChampionIcon, FireIcon, TrendingDown, TrendingUp } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { addDays, format, isSameDay, startOfWeek, subDays } from "date-fns";
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { collection, doc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { BeforeAfterSlider } from "../../components/progress/BeforeAfterSlider";
import { FullScreenPhoto } from "../../components/progress/FullScreenPhoto";
import { PhotoTimeline } from "../../components/progress/PhotoTimeline";
import { ShareCard } from "../../components/progress/ShareCard";
import { TransformationInsight } from '../../components/progress/TransformationInsight';
import { AnimatedCounter } from '../../components/progress/AnimatedCounter';
import { ConsistencyHeatmap } from '../../components/progress/ConsistencyHeatmap';
import { ShareStoryTemplate } from '../../components/progress/ShareStoryTemplate';
import { WeeklyReportTemplate } from '../../components/progress/WeeklyReportTemplate';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  withSpring, 
  Layout,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { StreakModal } from "../../components/StreakModal";
import { db } from "../../lib/firebase";
import { useTheme } from "../../lib/ThemeContext";
import { typography } from "../../lib/typography";
import {
  deleteProgressPhoto,
  getBeforeAfterPhotos,
  ProgressPhoto,
  subscribeToUserPhotos
} from "../../services/progressPhotoService";
import { calculateStreak, subscribeToActiveDays } from "../../services/streakService";
import { calculateUnifiedHealthScore } from "../../services/healthScore";
import { AnalyticsHeader } from "../../components/AnalyticsHeader";
import { useHealthData } from "../../hooks/useHealthData";

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Analytics() {
  const { user } = useUser();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [userData, setUserData] = useState<any>(null);
  const [weekActivity, setWeekActivity] = useState<Set<string>>(new Set());
  const [dailyConsumed, setDailyConsumed] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [dailyBurned, setDailyBurned] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [dailyWater, setDailyWater] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreakModalVisible, setIsStreakModalVisible] = useState(false);
  const [weightHistory, setWeightHistory] = useState<{ date: string, weight: number }[]>([]);

  // Progress Photo State
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<ProgressPhoto[]>([]);
  const storyViewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isMomentumPreviewVisible, setIsMomentumPreviewVisible] = useState(false);
  const momentumViewShotRef = useRef<ViewShot>(null);
  
  // Weight Trend Timeframe: '7D' | '1M' | '3M' | 'ALL'
  const [weightTimeframe, setWeightTimeframe] = useState<'7D' | '1M' | '3M' | 'ALL'>('1M');
  
  // Segment Navigation: 'visual' or 'data'
  const [activeSegment, setActiveSegment] = useState<'visual' | 'data'>('visual');
  const segmentX = useSharedValue(0); // For animated indicator (not used yet, will add later)

  // Health Data for Header Ring
  const health = useHealthData(user?.id);

  const [todayLogs, setTodayLogs] = useState<any[]>([]);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
  const weekDayLabels = weekDays.map(d => format(d, 'EEEEE')); // Dynamic labels (S, M, T...)

  useEffect(() => {
    if (!user) return;

    // 1. Fetch User Data (Weight)
    const userRef = doc(db, 'users', user.id);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    // 2. Fetch Today's Logs (Identical to Home/Profile for 100% score parity)
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayQuery = query(
      collection(db, 'logs'), 
      where('userId', '==', user.id), 
      where('date', '==', today)
    );
    const unsubscribeToday = onSnapshot(todayQuery, (snapshot) => {
      setTodayLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Fetch Weekly Logs for Streak and Energy
    const thirtyDaysAgo = subDays(new Date(), 30);
    const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      where('date', '>=', thirtyDaysAgoStr)
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const activeDays = new Set<string>();
      const consumedByDay: Record<string, number> = {};
      const burnedByDay: Record<string, number> = {};
      const waterByDay: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date) {
          activeDays.add(data.date);
          const cal = data.calories || 0;

          if (data.type === 'food') {
            consumedByDay[data.date] = (consumedByDay[data.date] || 0) + cal;
          } else if (data.type === 'exercise') {
            burnedByDay[data.date] = (burnedByDay[data.date] || 0) + cal;
          } else if (data.type === 'water') {
            waterByDay[data.date] = (waterByDay[data.date] || 0) + (data.waterLiters || 0);
          }
        }
      });

      setWeekActivity(activeDays);

      const consArr = weekDays.map(d => Math.round(consumedByDay[format(d, 'yyyy-MM-dd')] || 0));
      const burnArr = weekDays.map(d => Math.round(burnedByDay[format(d, 'yyyy-MM-dd')] || 0));
      const waterArr = weekDays.map(d => Number((waterByDay[format(d, 'yyyy-MM-dd')] || 0).toFixed(1)));

      setDailyConsumed(consArr);
      setDailyBurned(burnArr);
      setDailyWater(waterArr);
      setIsLoading(false);
    });

    // 3. Fetch Weight History for Trend Graph
    const weightQuery = query(
      collection(db, 'weight_logs'),
      where('userId', '==', user.id),
      orderBy('date', 'desc'),
      limit(150)
    );

    const unsubscribeWeight = onSnapshot(weightQuery, (snapshot) => {
      const history = snapshot.docs
        .map(doc => ({
          date: doc.data().date,
          weight: doc.data().weightKg
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // Chronological order

      setWeightHistory(history);
    }, (error) => {
      console.error("Weight History Snapshot Error:", error);
    });

    // 4. Subscribe to Progress Photos
    const unsubscribePhotos = subscribeToUserPhotos(user.id, (photos) => {
      setProgressPhotos(photos);
    });

    // 5. Subscribe to Streak
    const unsubscribeStreak = subscribeToActiveDays(user.id, (data) => {
      setWeekActivity(data.activeDays);
    });

    return () => {
      unsubscribeUser();
      unsubscribeLogs();
      unsubscribeToday();
      unsubscribeWeight();
      unsubscribePhotos();
      unsubscribeStreak();
    };
  }, [user]);

  const currentConsumedMacros = useMemo(() => {
    return todayLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.type === 'food' || log.type === 'ai_log' ? (Number(log.calories) || 0) : 0),
      protein: acc.protein + (Number(log.protein) || 0),
      carbs: acc.carbs + (Number(log.carbs) || 0),
      fats: acc.fats + (Number(log.fat) || Number(log.fats) || 0),
      water: acc.water + (Number(log.waterLiters) || 0),
      exerciseMinutes: acc.exerciseMinutes + (log.type === 'exercise' ? (Number(log.duration) || 0) : 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exerciseMinutes: 0 });
  }, [todayLogs]);

  const streakCount = calculateStreak(weekActivity);

  // Progress Photo handlers
  const { before: beforePhoto, after: afterPhoto } = getBeforeAfterPhotos(progressPhotos);
  const firstPhoto = progressPhotos.length > 0 ? progressPhotos[0] : null;

  const handleAddProgressPhoto = useCallback(async () => {
    const showPicker = async (useCamera: boolean) => {
      try {
        const { status } = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            `We need ${useCamera ? 'camera' : 'gallery'} access to add progress photos.`
          );
          return;
        }

        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.7,
        };

        const result = useCamera
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const imageUri = result.assets[0].uri;
          router.push({
            pathname: '/add-progress-photo',
            params: { imageUri: encodeURIComponent(imageUri) },
          } as any);
        }
      } catch (error: any) {
        if (error?.message?.includes('native module')) {
          Alert.alert('Not Available', 'This feature is not available in Expo Go. Please use a development build.');
        } else {
          console.error('Error with image picker:', error);
          Alert.alert('Error', 'Failed to open camera/gallery. Please try again.');
        }
      }
    };

    Alert.alert(
      'Add Progress Photo',
      'How would you like to add your photo?',
      [
        { text: '📸 Take Photo', onPress: () => showPicker(true) },
        { text: '🖼️ Choose from Gallery', onPress: () => showPicker(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [router]);

  const handleDeletePhoto = useCallback(async (photo: ProgressPhoto) => {
    try {
      await deleteProgressPhoto(photo.id, photo.storagePath);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo. Please try again.');
    }
  }, []);

  const handlePhotoPress = useCallback((photo: ProgressPhoto) => {
    if (isSelectMode) {
      setSelectedPhotos(prev => {
        const exists = prev.find(p => p.id === photo.id);
        if (exists) {
          return prev.filter(p => p.id !== photo.id);
        }
        if (prev.length >= 2) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return [prev[1], photo]; 
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return [...prev, photo];
      });
    } else {
      setSelectedPhoto(photo);
      setIsFullScreenVisible(true);
    }
  }, [isSelectMode]);

  const toggleSelectMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSelectMode(!isSelectMode);
    setSelectedPhotos([]);
  }, [isSelectMode]);

  const handlePhotoLongPress = useCallback((photo: ProgressPhoto) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this progress photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePhoto(photo),
        },
      ]
    );
  }, [handleDeletePhoto]);

  const handleShareTransformation = useCallback(() => {
    const b = selectedPhotos.length === 2 ? selectedPhotos[0] : beforePhoto;
    const a = selectedPhotos.length === 2 ? selectedPhotos[1] : afterPhoto;

    if (!b || !a) {
      Alert.alert('Not Ready', 'You need at least two photos to generate a transformation story.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPreviewVisible(true);
  }, [beforePhoto, afterPhoto, selectedPhotos]);

  const handleShareMomentum = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsMomentumPreviewVisible(true);
  }, []);

  const performFinalShare = useCallback(async (type: 'transformation' | 'momentum' = 'transformation') => {
    setIsSharing(true);
    setIsPreviewVisible(false);
    setIsMomentumPreviewVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setTimeout(async () => {
      try {
        const ref = type === 'transformation' ? storyViewShotRef : momentumViewShotRef;
        if (ref.current?.capture) {
          const uri = await ref.current.capture();
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/jpeg',
              dialogTitle: type === 'transformation' ? 'My Transformation' : 'Weekly Momentum',
            });
          }
        }
      } catch (err) {
        console.error('Sharing Error:', err);
        Alert.alert('Share Failed', 'Unable to generate your shareable story.');
      } finally {
        setIsSharing(false);
      }
    }, 1000);
  }, []);

  // Filter weight history based on selected timeframe
  const filteredWeightHistory = useMemo(() => {
    if (weightHistory.length === 0) return [];
    if (weightTimeframe === 'ALL') return weightHistory;

    const cutoff = subDays(new Date(), weightTimeframe === '7D' ? 7 : weightTimeframe === '1M' ? 30 : 90);
    const cutoffStr = format(cutoff, 'yyyy-MM-dd');
    
    return weightHistory.filter(h => h.date >= cutoffStr);
  }, [weightHistory, weightTimeframe]);

  const totalConsumed = useMemo(() => dailyConsumed.reduce((a, b) => a + b, 0), [dailyConsumed]);
  const totalBurned = useMemo(() => dailyBurned.reduce((a, b) => a + b, 0), [dailyBurned]);
  const netEnergy = useMemo(() => totalConsumed - totalBurned, [totalConsumed, totalBurned]);
  const maxEnergyValue = useMemo(() => Math.max(...dailyConsumed, ...dailyBurned, 1), [dailyConsumed, dailyBurned]);
  const avgConsumed = useMemo(() => totalConsumed / 7, [totalConsumed]);
  const avgBurned = useMemo(() => totalBurned / 7, [totalBurned]);

  const waterChartData = useMemo(() => ({
    labels: weekDayLabels,
    datasets: [
      {
        data: dailyWater.some(val => val > 0) ? dailyWater : [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(49, 130, 206, ${opacity})`,
        strokeWidth: 3
      }
    ]
  }), [dailyWater, weekDayLabels]);

  const chartConfig = useMemo(() => ({
    backgroundGradientFrom: colors.chartBg || colors.card,
    backgroundGradientTo: colors.chartBg || colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => isDark ? `rgba(226, 232, 240, ${opacity})` : `rgba(45, 55, 72, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(160, 174, 192, ${opacity})` : `rgba(113, 128, 150, ${opacity})`,
    barPercentage: 0.4,
    barRadius: 4,
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: colors.border,
    },
  }), [colors, isDark]);

  const targetWeight = userData?.profile?.measurements?.targetWeightKg || null;

  const currentHealthScore = useMemo(() => {
    if (!userData?.profile?.macros) return 0;
    const targets = userData.profile.macros;
    const score = calculateUnifiedHealthScore({
      consumed: {
        calories: currentConsumedMacros.calories,
        protein: currentConsumedMacros.protein,
        carbs: currentConsumedMacros.carbs,
        fat: currentConsumedMacros.fats,
        water: currentConsumedMacros.water,
        exerciseMinutes: currentConsumedMacros.exerciseMinutes
      },
      targets: {
        dailyCalories: targets.dailyCalories || 2000,
        proteinGrams: targets.proteinGrams || 150,
        carbsGrams: targets.carbsGrams || 200,
        fatsGrams: targets.fatsGrams || 65,
        dailySteps: targets.dailySteps || 10000,
        waterIntakeLiters: targets.waterIntakeLiters || 2.5,
        exerciseMinutes: targets.exerciseMinutes || 30,
        sleepHours: targets.sleepHours || 8
      },
      todaySteps: health.data.steps,
      todaySleep: health.data.sleepHours || 0
    });
    return score.total;
  }, [currentConsumedMacros, userData, health.data]);

  if (isLoading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009050" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AnalyticsHeader 
        userData={userData}
        healthScore={currentHealthScore}
        onUpdateWeight={() => router.push('/update-weight' as any)}
      />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Segmented Control */}
        <View style={[styles.segmentedContainer, { backgroundColor: isDark ? '#1A202C' : '#EDF2F7' }]}>
          <TouchableOpacity 
            style={[
              styles.segmentItem, 
              activeSegment === 'visual' && [styles.segmentActive, { backgroundColor: colors.card, shadowColor: '#000' }]
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveSegment('visual');
            }}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.segmentText, 
              { color: activeSegment === 'visual' ? colors.text : colors.textMuted },
              activeSegment === 'visual' && styles.segmentTextActive
            ]}>Visual</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.segmentItem, 
              activeSegment === 'data' && [styles.segmentActive, { backgroundColor: colors.card, shadowColor: '#000' }]
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveSegment('data');
            }}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.segmentText, 
              { color: activeSegment === 'data' ? colors.text : colors.textMuted },
              activeSegment === 'data' && styles.segmentTextActive
            ]}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {activeSegment === 'visual' ? (
          <Animated.View layout={Layout.springify()} entering={FadeInDown.duration(400)}>
            <BeforeAfterSlider
              beforePhoto={selectedPhotos.length === 2 ? selectedPhotos[0] : beforePhoto}
              afterPhoto={selectedPhotos.length === 2 ? selectedPhotos[1] : afterPhoto}
              firstPhoto={firstPhoto}
            />

            {(beforePhoto || selectedPhotos.length === 2) && (afterPhoto || selectedPhotos.length === 2) && (
              <View style={styles.shareRow}>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: colors.accent, flex: 1 }]}
                  onPress={handleShareTransformation}
                  activeOpacity={0.8}
                >
                  <Text style={styles.shareButtonText}>📤 Transformation</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: colors.blue, flex: 1 }]}
                  onPress={handleShareMomentum}
                  activeOpacity={0.8}
                >
                  <Text style={styles.shareButtonText}>📊 Weekly Wrap</Text>
                </TouchableOpacity>
              </View>
            )}

            <TransformationInsight
              photos={progressPhotos}
              streakCount={streakCount}
            />

            <PhotoTimeline
              photos={progressPhotos}
              onPhotoPress={handlePhotoPress}
              onPhotoLongPress={handlePhotoLongPress}
              onAddPress={handleAddProgressPhoto}
              isSelectMode={isSelectMode}
              selectedPhotos={selectedPhotos}
              toggleSelectMode={toggleSelectMode}
            />
          </Animated.View>
        ) : (
          <Animated.View layout={Layout.springify()} entering={FadeInDown.duration(400)}>
            <ConsistencyHeatmap 
              activeDays={weekActivity}
            />

            {filteredWeightHistory.length > 0 ? (
              (() => {
                const firstWeight = filteredWeightHistory[0].weight;
                const latestWeight = filteredWeightHistory[filteredWeightHistory.length - 1].weight;
                const weightChange = latestWeight - firstWeight;
                const isLoss = weightChange < 0;
                const isGain = weightChange > 0;
                const firstDate = filteredWeightHistory[0].date;
                const lastDate = filteredWeightHistory[filteredWeightHistory.length - 1].date;

                const trendData = {
                  labels: filteredWeightHistory.length <= 1
                    ? ["Today"]
                    : filteredWeightHistory.map((h: any, i: number) => {
                      const isFirst = i === 0;
                      const isLast = i === filteredWeightHistory.length - 1;
                      const isMid = i === Math.floor(filteredWeightHistory.length / 2);
                      if (isFirst || isLast || (isMid && filteredWeightHistory.length > 3)) {
                        return format(new Date(h.date), 'MMM d');
                      }
                      return "";
                    }),
                  datasets: [
                    {
                      data: (filteredWeightHistory || []).length === 1
                        ? [(filteredWeightHistory || [])[0].weight, (filteredWeightHistory || [])[0].weight]
                        : ((filteredWeightHistory || []).length > 0 ? (filteredWeightHistory || []).map((h: any) => h?.weight || 0) : [0]),
                      color: (opacity = 1) => `rgba(0, 144, 80, ${opacity})`,
                      strokeWidth: 3
                    },
                    ...(targetWeight ? [{
                      data: filteredWeightHistory.length <= 1 ? [targetWeight, targetWeight] : filteredWeightHistory.map((h: any) => targetWeight),
                      color: (opacity = 1) => isDark ? `rgba(214, 158, 46, 0.4)` : `rgba(214, 158, 46, 0.3)`,
                      strokeWidth: 1,
                      withDots: false,
                    }] : []),
                  ]
                };

                const minWeight = (filteredWeightHistory || []).length > 0 ? Math.min(...(filteredWeightHistory || []).map(h => h?.weight || 0)) : 50;
                const maxWeight = (filteredWeightHistory || []).length > 0 ? Math.max(...(filteredWeightHistory || []).map(h => h?.weight || 100)) : 100;
                const dataMin = targetWeight ? Math.min(minWeight, targetWeight) : minWeight;
                const dataMax = targetWeight ? Math.max(maxWeight, targetWeight) : maxWeight;
                const range = dataMax - dataMin;
                const padding = Math.max(range * 0.2, 1.25);

                const firstDateTime = new Date(firstDate).getTime();
                const lastDateTime = new Date(lastDate).getTime();
                const daysDiff = Math.max(1, Math.round((lastDateTime - firstDateTime) / (1000 * 60 * 60 * 24)));
                const weeklyRate = (weightChange / daysDiff) * 7;

                let weeksToGoal = null;
                if (targetWeight && Math.abs(weeklyRate) > 0.01) {
                  const remaining = targetWeight - latestWeight;
                  if ((remaining < 0 && weeklyRate < 0) || (remaining > 0 && weeklyRate > 0)) {
                    weeksToGoal = Math.abs(remaining / weeklyRate);
                  }
                }

                return (
                  <View style={[styles.card, styles.energyCard, { backgroundColor: colors.card, marginTop: 16 }]}>
                    <View style={styles.energyHeaderRow}>
                      <View>
                        <Text style={[styles.cardHeaderTitle, { color: colors.text, marginBottom: 0 }]}>Weight Trend</Text>
                        <Text style={[styles.energySubtitle, { color: colors.textMuted }]}>
                          {weightHistory.length} {weightHistory.length === 1 ? 'entry' : 'entries'} tracked
                        </Text>
                      </View>
                      {targetWeight && (
                        <View style={[styles.targetBadge, { backgroundColor: isDark ? '#2D2914' : '#FFFFF0' }]}>
                          <Text style={[styles.targetBadgeText, { color: colors.warning }]}>Goal: {targetWeight}kg</Text>
                        </View>
                      )}
                    </View>

                    <View style={[styles.timeframeContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                      {[
                        { label: '7 D', value: '7D' },
                        { label: '1 M', value: '1M' },
                        { label: '3 M', value: '3M' },
                        { label: 'All', value: 'ALL' },
                      ].map((tf) => (
                        <TouchableOpacity
                          key={tf.value}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setWeightTimeframe(tf.value as any);
                          }}
                          style={[
                            styles.timeframeButton,
                            weightTimeframe === tf.value && { backgroundColor: isDark ? colors.border : '#E2E8F0' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timeframeText,
                              { color: weightTimeframe === tf.value ? colors.text : colors.textMuted },
                            ]}
                          >
                            {tf.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.energyPillsRow}>
                      <View style={[styles.energyPill, { backgroundColor: isDark ? '#1A2A3B' : '#EBF8FF' }]}>
                        <View style={[styles.pillDot, { backgroundColor: colors.blue }]} />
                        <View>
                          <AnimatedCounter 
                            value={latestWeight} 
                            suffix=""
                            style={[styles.pillValue, { color: colors.blue }]} 
                          />
                          <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Current</Text>
                        </View>
                      </View>
                      <View style={[styles.energyPill, { backgroundColor: isLoss ? (isDark ? '#1C3829' : '#F0FFF4') : isGain ? (isDark ? '#3B1A1A' : '#FFF5F5') : (isDark ? '#22262F' : '#F7FAFC') }]}>
                        <View style={[styles.pillDot, { backgroundColor: isLoss ? colors.accent : isGain ? colors.danger : colors.textMuted }]} />
                        <View>
                          <AnimatedCounter 
                            value={weightChange} 
                            prefix={weightChange > 0 ? '+' : ''}
                            style={[styles.pillValue, { color: isLoss ? colors.accent : isGain ? colors.danger : colors.textMuted }]} 
                          />
                          <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Change</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.chartWrapper, { marginTop: 10 }]}>
                      <LineChart
                        data={trendData}
                        width={SCREEN_WIDTH - 88}
                        height={200}
                        chartConfig={{
                          ...chartConfig,
                          decimalPlaces: 1,
                          color: (opacity = 1) => isDark ? `rgba(99, 179, 237, ${opacity})` : `rgba(49, 130, 206, ${opacity})`,
                          fillShadowGradientFrom: isDark ? '#63B3ED' : '#3182CE',
                          fillShadowGradientFromOpacity: 0.2,
                          fillShadowGradientTo: isDark ? '#63B3ED' : '#3182CE',
                          fillShadowGradientToOpacity: 0.01,
                          propsForDots: {
                            r: '5',
                            strokeWidth: '2',
                            stroke: isDark ? '#63B3ED' : '#3182CE',
                            fill: colors.card,
                          },
                        }}
                        style={styles.energyChart}
                        fromZero={false}
                        segments={4}
                        formatYLabel={(yValue) => `${parseFloat(yValue).toFixed(1)}`}
                        bezier
                        withInnerLines={true}
                        withOuterLines={false}
                        withVerticalLines={false}
                      />
                    </View>

                    <View style={[styles.weightTrendFooter, { borderTopColor: colors.border, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
                      <View style={styles.flexRowAlignCenter}>
                        <HugeiconsIcon icon={FireIcon} size={14} color={colors.accent} />
                        <Text style={[styles.mathInsightText, { color: colors.textSecondary, marginLeft: 6 }]}>
                          Rate: <Text style={{ fontWeight: '700', color: weeklyRate <= 0 ? colors.accent : colors.danger }}>
                            {weeklyRate > 0 ? '+' : ''}{weeklyRate.toFixed(2)}kg / week
                          </Text>
                        </Text>
                      </View>
                      
                      {weeksToGoal !== null && (
                        <View style={styles.flexRowAlignCenter}>
                          <HugeiconsIcon icon={ChampionIcon} size={14} color={colors.warning} />
                          <Text style={[styles.mathInsightText, { color: colors.textSecondary, marginLeft: 6 }]}>
                            Est. Goal: <Text style={{ fontWeight: '700', color: colors.warning }}>
                              {Math.ceil(weeksToGoal)} weeks ({format(addDays(new Date(), Math.ceil(weeksToGoal) * 7), 'MMM yyyy')})
                            </Text>
                          </Text>
                        </View>
                      )}

                      <Text style={[styles.weightTrendFooterText, { color: colors.textMuted, marginTop: 4 }]}>
                        Data span: {format(new Date(firstDate), 'MMM d')} — {format(new Date(lastDate), 'MMM d')} ({daysDiff} days)
                      </Text>
                    </View>
                  </View>
                );
              })()
            ) : (
              <TouchableOpacity
                style={[styles.card, styles.unlockCard, { backgroundColor: colors.card, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.border }]}
                onPress={() => router.push('/update-weight' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.unlockIconContainer, { backgroundColor: colors.accentLight }]}>
                  <HugeiconsIcon icon={ChampionIcon} size={28} color={colors.accent} />
                </View>
                <Text style={[styles.unlockTitle, { color: colors.text }]}>Unlock Your Weight Trend</Text>
                <Text style={[styles.unlockSubtitle, { color: colors.textMuted }]}>Log your weight to start visualizing your transformation journey.</Text>
                <View style={[styles.unlockButton, { backgroundColor: colors.accent }]}>
                  <Text style={styles.unlockButtonText}>Update Weight</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={[styles.card, styles.energyCard, { backgroundColor: colors.card, marginTop: 16 }]}>
              <View style={styles.energyHeaderRow}>
                <View>
                  <Text style={[styles.cardHeaderTitle, { color: colors.text, marginBottom: 0 }]}>Weekly Energy</Text>
                  <Text style={[styles.energySubtitle, { color: colors.textMuted }]}>This week's calorie breakdown</Text>
                </View>
                <View style={[styles.energyHeaderBadge, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }]}>
                  <Text style={[styles.energyHeaderBadgeText, { color: colors.accent }]}>kcal</Text>
                </View>
              </View>

              <View style={styles.energyPillsRow}>
                <View style={[styles.energyPill, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }]}>
                  <View style={[styles.pillDot, { backgroundColor: colors.accent }]} />
                  <View>
                    <Text style={[styles.pillValue, { color: colors.accent }]}>{totalConsumed.toLocaleString()}</Text>
                    <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Consumed</Text>
                  </View>
                </View>
                <View style={[styles.energyPill, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
                  <View style={[styles.pillDot, { backgroundColor: colors.danger }]} />
                  <View>
                    <Text style={[styles.pillValue, { color: colors.danger }]}>{totalBurned.toLocaleString()}</Text>
                    <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Burned</Text>
                  </View>
                </View>
                <View style={[styles.energyPill, { backgroundColor: isDark ? '#2D2914' : '#FFFFF0' }]}>
                  <View style={[styles.pillDot, { backgroundColor: colors.warning }]} />
                  <View>
                    <Text style={[styles.pillValue, { color: colors.warning }]}>
                      {netEnergy > 0 ? `+${netEnergy.toLocaleString()}` : netEnergy.toLocaleString()}
                    </Text>
                    <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Net</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.customChartArea, { borderColor: colors.border }]}>
                <View style={styles.yAxisContainer}>
                  {[1, 0.75, 0.5, 0.25, 0].map((fraction, idx) => {
                    const val = Math.round(maxEnergyValue * fraction);
                    return (
                      <View key={idx} style={[styles.gridRow, { top: `${(1 - fraction) * 100}%` }]}>
                        <Text style={[styles.yLabel, { color: colors.textMuted }]}>
                          {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        </Text>
                        <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                      </View>
                    );
                  })}
                </View>

                <View style={styles.barsContainer}>
                  {weekDays.map((date, index) => {
                    const consumed = dailyConsumed[index];
                    const burned = dailyBurned[index];
                    const chartHeight = 160;
                    const consumedH = maxEnergyValue > 0 ? (consumed / maxEnergyValue) * chartHeight : 0;
                    const burnedH = maxEnergyValue > 0 ? (burned / maxEnergyValue) * chartHeight : 0;
                    const isToday = isSameDay(date, today);

                    return (
                      <View key={index} style={styles.barGroup}>
                        <View style={[styles.barPair, { height: chartHeight }]}>
                          <View style={[styles.barWrapper]}>
                            <View
                              style={[
                                styles.bar,
                                { height: Math.max(consumedH, 3), backgroundColor: isToday ? colors.accent : (isDark ? '#2D6B4A' : '#68D391') },
                              ]}
                            />
                          </View>
                          <View style={[styles.barWrapper]}>
                            <View
                              style={[
                                styles.bar,
                                { height: Math.max(burnedH, 3), backgroundColor: isToday ? colors.danger : (isDark ? '#9B4343' : '#FC8181') },
                              ]}
                            />
                          </View>
                        </View>
                        <Text style={[
                          styles.barLabel,
                          { color: isToday ? colors.accent : colors.textMuted },
                          isToday && styles.barLabelToday
                        ]}>
                          {weekDayLabels[index]}
                        </Text>
                        {isToday && <View style={[styles.todayDot, { backgroundColor: colors.accent }]} />}
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.legendContainer, { borderTopColor: colors.border }]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendIndicator, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Consumed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendIndicator, { backgroundColor: colors.danger }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Burned</Text>
                </View>
                <View style={[styles.legendAvgItem]}>
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Avg: {Math.round(avgConsumed)} / {Math.round(avgBurned)}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, styles.energyCard, { backgroundColor: colors.card, marginTop: 16 }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Water Consumption</Text>
              <View style={styles.energyStatsRow}>
                <View style={styles.energyStatItem}>
                  <Text style={[styles.energyStatValue, { color: colors.blue }]}>
                    {dailyWater.reduce((a, b) => a + b, 0).toFixed(1)} L
                  </Text>
                  <Text style={[styles.energyStatLabel, { color: colors.textTertiary }]}>Total This Week</Text>
                </View>

                <View style={styles.energyStatItem}>
                  <Text style={[styles.energyStatValue, { color: colors.text }]}>
                    {(dailyWater.reduce((a, b) => a + b, 0) / 7).toFixed(1)} L
                  </Text>
                  <Text style={[styles.energyStatLabel, { color: colors.textTertiary }]}>Daily Average</Text>
                </View>
              </View>

              <View style={styles.chartWrapper}>
                <LineChart
                  data={waterChartData}
                  width={SCREEN_WIDTH - 88}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    decimalPlaces: 1,
                  }}
                  style={styles.energyChart}
                  fromZero
                  bezier
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
                  yAxisSuffix="L"
                  yAxisLabel=""
                />
              </View>
            </View>

          </Animated.View>
        )}

        <StreakModal
          isVisible={isStreakModalVisible}
          onClose={() => setIsStreakModalVisible(false)}
          streakCount={streakCount}
          activeDays={weekActivity}
          weekDays={weekDays}
          weekDayLabels={weekDayLabels}
        />

        <FullScreenPhoto
          visible={isFullScreenVisible}
          photo={selectedPhoto}
          firstPhoto={firstPhoto}
          onClose={() => setIsFullScreenVisible(false)}
          onDelete={handleDeletePhoto}
          onShare={handleShareTransformation}
        />
      </ScrollView>

      {/* Hidden high-res template for social sharing */}
      {beforePhoto && afterPhoto && firstPhoto && (
        <View 
          collapsable={false}
          style={{ position: 'absolute', left: -5000, top: 0, opacity: 0 }}
        >
          <ViewShot
            ref={storyViewShotRef}
            options={{ format: 'jpg', quality: 0.9 }}
            style={{ width: 1080, height: 1920 }}
          >
            <ShareStoryTemplate
              beforePhoto={selectedPhotos.length === 2 ? selectedPhotos[0] : beforePhoto}
              afterPhoto={selectedPhotos.length === 2 ? selectedPhotos[1] : afterPhoto}
              firstPhoto={firstPhoto}
              totalWeightChange={Math.abs(weightHistory[weightHistory.length - 1]?.weight - weightHistory[0]?.weight || 0).toFixed(1)}
            />
          </ViewShot>
        </View>
      )}

      {/* Global Sharing Overlay */}
      {isSharing && (
        <View style={[StyleSheet.absoluteFill, styles.shareModalOverlay]}>
          <ActivityIndicator size="large" color="#00F5D4" />
          <Text style={{ color: '#FFFFFF', marginTop: 16, fontWeight: '700' }}>CREATING YOUR STORY...</Text>
        </View>
      )}

      {/* Share Preview Modal */}
      <Modal
        visible={isPreviewVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.previewModalOverlay}>
          <View style={[styles.previewContent, { backgroundColor: colors.background }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewHeaderTitle, { color: colors.text }]}>Story Preview</Text>
              <TouchableOpacity onPress={() => setIsPreviewVisible(false)}>
                 <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewTemplateContainer}>
              <View 
                style={{ 
                  width: 1080, 
                  height: 1920, 
                  transform: [
                    { scale: (SCREEN_WIDTH * 0.75) / 1080 },
                    { translateX: 0 },
                    { translateY: 0 }
                  ],
                  overflow: 'hidden',
                  borderRadius: 40,
                }}
              >
                {beforePhoto && afterPhoto && firstPhoto && (
                  <ShareStoryTemplate
                    beforePhoto={selectedPhotos.length === 2 ? selectedPhotos[0] : beforePhoto}
                    afterPhoto={selectedPhotos.length === 2 ? selectedPhotos[1] : afterPhoto}
                    firstPhoto={firstPhoto}
                    totalWeightChange={Math.abs(weightHistory[weightHistory.length - 1]?.weight - weightHistory[0]?.weight || 0).toFixed(1)}
                  />
                )}
              </View>
            </View>

            <View style={styles.previewFooter}>
              <Text style={[styles.previewHint, { color: colors.textMuted }]}>This is how your story will look on Instagram 💪</Text>
              <TouchableOpacity
                style={[styles.confirmShareButton, { backgroundColor: colors.accent }]}
                onPress={() => performFinalShare('transformation')}
              >
                <Text style={styles.confirmShareButtonText}>📤 Confirm & Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weekly Momentum Preview Modal */}
      <Modal
        visible={isMomentumPreviewVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.previewModalOverlay}>
          <View style={[styles.previewContent, { backgroundColor: colors.background }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewHeaderTitle, { color: colors.text }]}>Weekly Wrap Preview</Text>
              <TouchableOpacity onPress={() => setIsMomentumPreviewVisible(false)}>
                 <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewTemplateContainer}>
              <View 
                style={{ 
                  width: 1080, 
                  height: 1920, 
                  transform: [
                    { scale: (SCREEN_WIDTH * 0.7) / 1080 },
                  ],
                  overflow: 'hidden',
                  borderRadius: 40,
                }}
              >
                <WeeklyReportTemplate
                  userName={user?.firstName || "Fitness Hero"}
                  startDate={format(weekDays[0], 'MMM dd')}
                  endDate={format(weekDays[6], 'MMM dd')}
                  totalCalories={totalConsumed}
                  totalBurned={totalBurned}
                  totalWater={dailyWater.reduce((a, b) => a + b, 0)}
                  weightChange={weightHistory.length > 1 ? weightHistory[weightHistory.length - 1].weight - weightHistory[Math.max(0, weightHistory.length - 7)].weight : 0}
                  streak={streakCount}
                />
              </View>
            </View>

            <View style={styles.previewFooter}>
              <Text style={[styles.previewHint, { color: colors.textMuted }]}>Your Weekly Momentum infographic is ready!</Text>
              <TouchableOpacity
                style={[styles.confirmShareButton, { backgroundColor: colors.blue }]}
                onPress={() => performFinalShare('momentum')}
              >
                <Text style={styles.confirmShareButtonText}>📤 Confirm & Share Wrap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hidden viewshots */}
      <View style={{ position: 'absolute', left: -5000, top: 0, opacity: 0 }}>
        {beforePhoto && afterPhoto && firstPhoto && (
          <ViewShot
            ref={storyViewShotRef}
            options={{ format: 'jpg', quality: 0.9 }}
            style={{ width: 1080, height: 1920 }}
          >
            <ShareStoryTemplate
              beforePhoto={selectedPhotos.length === 2 ? selectedPhotos[0] : beforePhoto}
              afterPhoto={selectedPhotos.length === 2 ? selectedPhotos[1] : afterPhoto}
              firstPhoto={firstPhoto}
              totalWeightChange={Math.abs(weightHistory[weightHistory.length - 1]?.weight - weightHistory[0]?.weight || 0).toFixed(1)}
            />
          </ViewShot>
        )}
        
        <ViewShot
          ref={momentumViewShotRef}
          options={{ format: 'jpg', quality: 0.9 }}
          style={{ width: 1080, height: 1920 }}
        >
          <WeeklyReportTemplate
            userName={user?.firstName || "Fitness Hero"}
            startDate={format(weekDays[0], 'MMM dd')}
            endDate={format(weekDays[6], 'MMM dd')}
            totalCalories={totalConsumed}
            totalBurned={totalBurned}
            totalWater={dailyWater.reduce((a, b) => a + b, 0)}
            weightChange={weightHistory.length > 1 ? weightHistory[weightHistory.length - 1].weight - weightHistory[Math.max(0, weightHistory.length - 7)].weight : 0}
            streak={streakCount}
          />
        </ViewShot>
      </View>
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
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
  },
  shareRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  halfCard: {
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  weightValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  weightValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  weightSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  energyCard: {
    padding: 20,
  },
  energyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  energySubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  energyHeaderBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  energyHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  energyPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  energyPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  customChartArea: {
    height: 200,
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 8,
    paddingLeft: 36,
  },
  yAxisContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 20,
    width: '100%',
    zIndex: 0,
  },
  gridRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  yLabel: {
    fontSize: 10,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
    marginRight: 4,
  },
  gridLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 20,
    zIndex: 1,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barWrapper: {
    alignItems: 'center',
  },
  bar: {
    width: 10,
    borderRadius: 5,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  barLabelToday: {
    fontWeight: '900',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendAvgItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  energyChart: {
    borderRadius: 16,
  },
  weightTrendFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  weightTrendFooterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  energyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  energyStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  energyStatValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  energyStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  flexRowAlignCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  shareButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shareButtonSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
  },
  shareModalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  segmentedContainer: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 20,
    marginBottom: 24,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  segmentActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  segmentText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
  },
  segmentTextActive: {
    opacity: 1,
    fontWeight: '700',
  },
  unlockCard: {
    marginTop: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  unlockTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  unlockSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  unlockButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Preview Modal Styles
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    width: '90%',
    maxHeight: '90%',
    borderRadius: 32,
    overflow: 'hidden',
    padding: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  previewTemplateContainer: {
    height: (SCREEN_WIDTH * 0.75 * 1920) / 1080,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 24,
    overflow: 'hidden',
  },
  previewFooter: {
    marginTop: 24,
    alignItems: 'center',
  },
  previewHint: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmShareButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  confirmShareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mathInsightText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 9,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
