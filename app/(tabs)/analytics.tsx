import { useUser } from "@clerk/expo";
import { CheckmarkCircle02Icon, ChampionIcon, Cancel01Icon, FireIcon, Apple01Icon, Activity01Icon, DropletIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { addDays, format, isSameDay, startOfWeek, subDays } from "date-fns";
import { useRouter } from "expo-router";
import { collection, doc, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, View, TouchableOpacity, Modal, Pressable } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { db } from "../../lib/firebase";
import { useTheme } from "../../lib/ThemeContext";
import { BeforeAfterSlider } from "../../components/progress/BeforeAfterSlider";
import { PhotoTimeline } from "../../components/progress/PhotoTimeline";
import { FullScreenPhoto } from "../../components/progress/FullScreenPhoto";
import { ShareCard } from "../../components/progress/ShareCard";
import { TransformationInsight } from "../../components/progress/TransformationInsight";
import {
  ProgressPhoto,
  subscribeToUserPhotos,
  deleteProgressPhoto,
  getDayNumber,
  getTimeLabel,
  getBeforeAfterPhotos,
} from "../../services/progressPhotoService";
import { StreakModal } from "../../components/StreakModal";
import { subscribeToActiveDays, getWeekDays, calculateStreak } from "../../services/streakService";

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
  const [weightHistory, setWeightHistory] = useState<{date: string, weight: number}[]>([]);

  // Progress Photo State
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const shareCaptureFn = useRef<(() => Promise<void>) | null>(null);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  useEffect(() => {
    if (!user) return;

    // 1. Fetch User Data (Weight)
    const userRef = doc(db, 'users', user.id);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    // 2. Fetch Weekly Logs for Streak and Energy
    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id)
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
    // Simplified query (no orderBy) to avoid composite index requirement
    const weightQuery = query(
      collection(db, 'weight_logs'),
      where('userId', '==', user.id)
    );

    const unsubscribeWeight = onSnapshot(weightQuery, (snapshot) => {
      const history = snapshot.docs
        .map(doc => ({
          date: doc.data().date,
          weight: doc.data().weightKg
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // Chronological order
      
      // Limit to last 30 entries
      setWeightHistory(history.slice(-30));
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
      unsubscribeWeight();
      unsubscribePhotos();
      unsubscribeStreak();
    };
  }, [user]);

  // Calculate Streak Count (Consecutive days ending today or yesterday)
  // Streak Logic
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
    setSelectedPhoto(photo);
    setIsFullScreenVisible(true);
  }, []);

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

  const handleShareTransformation = useCallback(async () => {
    setIsShareModalVisible(true);
    // Small delay to let the modal render, then capture
    setTimeout(async () => {
      if (shareCaptureFn.current) {
        await shareCaptureFn.current();
        setIsShareModalVisible(false);
      }
    }, 500);
  }, []);
  const latestLoggedWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null;
  const weight = latestLoggedWeight || userData?.profile?.measurements?.weightKg || userData?.onboarding_weight || "--";
  
  const totalConsumed = dailyConsumed.reduce((a, b) => a + b, 0);
  const totalBurned = dailyBurned.reduce((a, b) => a + b, 0);
  const netEnergy = totalConsumed - totalBurned;

  // Prepare data for custom energy bars
  const maxEnergyValue = Math.max(
    ...dailyConsumed,
    ...dailyBurned,
    1 // prevent division by zero
  );

  const avgConsumed = dailyConsumed.reduce((a, b) => a + b, 0) / 7;
  const avgBurned = dailyBurned.reduce((a, b) => a + b, 0) / 7;

  const waterChartData = {
    labels: weekDayLabels,
    datasets: [
      {
        data: dailyWater.some(val => val > 0) ? dailyWater : [0, 0, 0, 0, 0, 0, 0], // avoid min curve rendering issues if completely 0
        color: (opacity = 1) => `rgba(49, 130, 206, ${opacity})`, // Blue Line (#3182CE)
        strokeWidth: 3
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: colors.chartBg,
    backgroundGradientTo: colors.chartBg,
    decimalPlaces: 0,
    color: (opacity = 1) => isDark ? `rgba(226, 232, 240, ${opacity})` : `rgba(45, 55, 72, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(160, 174, 192, ${opacity})` : `rgba(113, 128, 150, ${opacity})`,
    barPercentage: 0.4, // Reduced to prevent overlap for interleaved 14 bars
    barRadius: 4, 
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: colors.border,
    },
  };

  const minWeight = weightHistory.length > 0 ? Math.min(...weightHistory.map(h => h.weight)) : 50;
  const maxWeight = weightHistory.length > 0 ? Math.max(...weightHistory.map(h => h.weight)) : 100;
  const weightRange = maxWeight - minWeight;
  // If the range is too small (e.g. all 60.0), the Y-axis repeats labels. 
  // We force it to have at least a 2kg range to ensure unique labels.
  const padding = weightRange < 2 ? 1 : 0.5;

  const weightTrendData = {
    labels: weightHistory.length === 1
      ? ["Baseline", format(new Date(weightHistory[0].date), 'MMM d')]
      : (weightHistory.length > 1
          ? weightHistory.map((h, i) =>
              i % Math.max(1, Math.floor(weightHistory.length / 5)) === 0
                ? format(new Date(h.date), 'MMM d')
                : ""
            )
          : ["No Data"]),
    datasets: [
      {
        data: weightHistory.length === 1
          ? [weightHistory[0].weight, weightHistory[0].weight]
          : (weightHistory.length > 0 ? weightHistory.map(h => h.weight) : [0]),
        color: (opacity = 1) => `rgba(0, 144, 80, ${opacity})`,
        strokeWidth: 2
      },
      // Invisible dataset to force a minimum Y-axis range
      {
        data: [minWeight - padding, maxWeight + padding],
        withDots: false,
        color: () => 'transparent',
        strokeWidth: 0,
      }
    ]
  };

  if (isLoading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009050" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>

        {/* === HERO SECTION: Before/After Slider === */}
        <BeforeAfterSlider
          beforePhoto={beforePhoto}
          afterPhoto={afterPhoto}
          firstPhoto={firstPhoto}
        />

        {/* Share Transformation Button */}
        {beforePhoto && afterPhoto && (
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.accent }]}
            onPress={handleShareTransformation}
            activeOpacity={0.8}
          >
            <Text style={styles.shareButtonText}>📤 Share Transformation</Text>
            <Text style={styles.shareButtonSubtext}>Show your transformation 💪</Text>
          </TouchableOpacity>
        )}

        {/* === Transformation Insights === */}
        <TransformationInsight
          photos={progressPhotos}
          streakCount={streakCount}
        />

        {/* === Photo Timeline === */}
        <PhotoTimeline
          photos={progressPhotos}
          onPhotoPress={handlePhotoPress}
          onPhotoLongPress={handlePhotoLongPress}
          onAddPress={handleAddProgressPhoto}
        />

        {/* Weight Trend Card */}
        {weightHistory.length > 0 && (() => {
          const firstWeight = weightHistory[0].weight;
          const latestWeight = weightHistory[weightHistory.length - 1].weight;
          const weightChange = latestWeight - firstWeight;
          const isLoss = weightChange < 0;
          const isGain = weightChange > 0;
          const firstDate = weightHistory[0].date;
          const lastDate = weightHistory[weightHistory.length - 1].date;

          return (
          <View style={[styles.card, styles.energyCard, { backgroundColor: colors.card, marginTop: 16 }]}>
            {/* Header Row */}
            <View style={styles.energyHeaderRow}>
              <View>
                <Text style={[styles.cardHeaderTitle, { color: colors.text, marginBottom: 0 }]}>Weight Trend</Text>
                <Text style={[styles.energySubtitle, { color: colors.textMuted }]}>
                  {weightHistory.length} {weightHistory.length === 1 ? 'entry' : 'entries'} tracked
                </Text>
              </View>
              <View style={[styles.energyHeaderBadge, { backgroundColor: isDark ? '#1A2A3B' : '#EBF8FF' }]}>
                <Text style={[styles.energyHeaderBadgeText, { color: colors.blue }]}>kg</Text>
              </View>
            </View>

            {/* Stat Pills */}
            <View style={styles.energyPillsRow}>
              <View style={[styles.energyPill, { backgroundColor: isDark ? '#1A2A3B' : '#EBF8FF' }]}>
                <View style={[styles.pillDot, { backgroundColor: colors.blue }]} />
                <View>
                  <Text style={[styles.pillValue, { color: colors.blue }]}>{latestWeight.toFixed(1)}</Text>
                  <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Current</Text>
                </View>
              </View>
              <View style={[styles.energyPill, { backgroundColor: isLoss ? (isDark ? '#1C3829' : '#F0FFF4') : isGain ? (isDark ? '#3B1A1A' : '#FFF5F5') : (isDark ? '#22262F' : '#F7FAFC') }]}>
                <View style={[styles.pillDot, { backgroundColor: isLoss ? colors.accent : isGain ? colors.danger : colors.textMuted }]} />
                <View>
                  <Text style={[styles.pillValue, { color: isLoss ? colors.accent : isGain ? colors.danger : colors.textMuted }]}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                  </Text>
                  <Text style={[styles.pillLabel, { color: colors.textTertiary }]}>Change</Text>
                </View>
              </View>
            </View>

            <View style={styles.chartWrapper}>
              <LineChart
                data={weightTrendData}
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
                    r: '4',
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

            {/* Footer with date range */}
            <View style={[styles.weightTrendFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.weightTrendFooterText, { color: colors.textMuted }]}>
                {format(new Date(firstDate), 'MMM d, yyyy')} — {format(new Date(lastDate), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>
          );
        })()}

        {/* Weekly Energy Card */}
        <View style={[styles.card, styles.energyCard, { backgroundColor: colors.card }]}>
          {/* Header Row */}
          <View style={styles.energyHeaderRow}>
            <View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text, marginBottom: 0 }]}>Weekly Energy</Text>
              <Text style={[styles.energySubtitle, { color: colors.textMuted }]}>This week's calorie breakdown</Text>
            </View>
            <View style={[styles.energyHeaderBadge, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }]}>
              <Text style={[styles.energyHeaderBadgeText, { color: colors.accent }]}>kcal</Text>
            </View>
          </View>

          {/* Stat Pills */}
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

          {/* Custom Bar Chart */}
          <View style={[styles.customChartArea, { borderColor: colors.border }]}>
            {/* Y-axis gridlines and labels */}
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

            {/* Bars */}
            <View style={styles.barsContainer}>
              {weekDays.map((date, index) => {
                const consumed = dailyConsumed[index];
                const burned = dailyBurned[index];
                const chartHeight = 160; // usable bar height in px
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

          {/* Footer Legend */}
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

        {/* Water Consumption Card */}
        <View style={[styles.card, styles.energyCard, { backgroundColor: colors.card }]}>
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

        <View style={[styles.row, { marginTop: 16 }]}>
          <TouchableOpacity
            style={[styles.card, styles.halfCard, { justifyContent: 'space-between', backgroundColor: colors.card }]}
            onPress={() => router.push('/update-weight' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.cardHeaderRow, SCREEN_WIDTH < 400 && { gap: 4 }]}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: colors.accentLight, width: SCREEN_WIDTH < 400 ? 36 : 44, height: SCREEN_WIDTH < 400 ? 36 : 44, borderRadius: 12, marginBottom: 0 }
              ]}>
                <HugeiconsIcon icon={ChampionIcon} size={SCREEN_WIDTH < 400 ? 18 : 24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[styles.cardTitle, SCREEN_WIDTH < 400 && { fontSize: 13 }, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>My Weight</Text>
                <View style={[styles.weightValueContainer, SCREEN_WIDTH < 400 && { marginTop: 0 }]}>
                  <Text style={[styles.weightValue, SCREEN_WIDTH < 400 && { fontSize: 20 }, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{weight}</Text>
                  <Text style={[styles.weightUnit, SCREEN_WIDTH < 400 && { fontSize: 11 }, { color: colors.textTertiary }]} numberOfLines={1}>kg</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.weightSubtitle, { marginBottom: 8, color: colors.textMuted }]}>Current Status</Text>
          </TouchableOpacity>
        </View>

        {/* AI Health Insights Card */}
        <TouchableOpacity 
          style={[styles.card, styles.aiCard, { backgroundColor: colors.purpleLight, borderColor: colors.purpleBorder }]}
          onPress={() => router.push('/ai-insights' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.aiCardContent}>
            <View style={[styles.aiIconContainer, { backgroundColor: colors.purple }]}>
              <HugeiconsIcon icon={Activity01Icon} size={28} color="#FFFFFF" />
            </View>
            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiTitle, { color: colors.purpleText }]}>AI Health Insights</Text>
              <Text style={[styles.aiSubtitle, { color: colors.purpleSubtext }]}>Discover how your weekly meals affect your long-term health.</Text>
            </View>
          </View>
        </TouchableOpacity>


        {/* Streak Detail Modal */}
        <StreakModal
          isVisible={isStreakModalVisible}
          onClose={() => setIsStreakModalVisible(false)}
          streakCount={streakCount}
          activeDays={weekActivity}
          weekDays={weekDays}
          weekDayLabels={weekDayLabels}
        />

        {/* Full Screen Photo Viewer */}
        <FullScreenPhoto
          visible={isFullScreenVisible}
          photo={selectedPhoto}
          firstPhoto={firstPhoto}
          onClose={() => setIsFullScreenVisible(false)}
          onDelete={handleDeletePhoto}
          onShare={handleShareTransformation}
        />

        {/* Share Card (rendered off-screen for capture) */}
        {isShareModalVisible && beforePhoto && afterPhoto && firstPhoto && (
          <Modal visible={isShareModalVisible} transparent animationType="fade">
            <Pressable
              style={styles.shareModalOverlay}
              onPress={() => setIsShareModalVisible(false)}
            >
              <ShareCard
                beforePhoto={beforePhoto}
                afterPhoto={afterPhoto}
                firstPhoto={firstPhoto}
                onCaptureReady={(fn) => { shareCaptureFn.current = fn; }}
              />
            </Pressable>
          </Modal>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECFDF5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12, // Reduced padding to prevent overlap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  halfCard: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  fireIcon: {
    width: 24,
    height: 24,
  },
  weightEmoji: {
    fontSize: 24,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
  },
  streakGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 2, 
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  circleIndicator: {
    width: 14, 
    height: 14,
    borderRadius: 7, 
    borderWidth: 1.5,
    borderColor: '#EDF2F7',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIndicatorActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  circleIndicatorToday: {
    borderColor: '#009050',
    borderStyle: 'dashed',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A0AEC0',
  },
  dayLabelToday: {
    color: '#009050',
  },
  weightValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  weightValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3748',
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 4,
  },
  weightSubtitle: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 4,
    fontWeight: '500',
  },
  streakValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  streakValue: {
    fontSize: 28, 
    fontWeight: '900', 
    color: '#2D3748',
  },
  streakUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 4,
  },

  // AI Insights Card Styles
  aiCard: {
    marginTop: 20,
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D8FD',
    borderWidth: 1,
  },
  aiCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 8,
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#805AD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTextContainer: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#322659',
    marginBottom: 4,
  },
  aiSubtitle: {
    fontSize: 13,
    color: '#553C9A',
    fontWeight: '500',
    lineHeight: 18,
  },

  // Chart Card Styles
  chartCard: {
    marginTop: 16,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
    marginTop: 2,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -16,
  },

  // Energy Card Styles
  energyCard: {
    marginTop: 20,
    padding: 20,
  },
  cardHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 20,
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
    marginTop: 4,
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
    letterSpacing: 0.5,
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
    letterSpacing: 0.3,
    marginTop: 1,
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
    color: '#2D3748',
  },
  burnedValue: {
    color: '#E53E3E',
  },
  consumedValue: {
    color: '#009050',
  },
  netValue: {
    color: '#D69E2E', 
  },
  energyStatLabel: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // Custom Chart Styles
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
    opacity: 0.5,
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
  consumedBar: {
    backgroundColor: '#68D391',
  },
  burnedBar: {
    backgroundColor: '#FC8181',
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
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
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
    color: '#4A5568',
    fontWeight: '600',
  },

  // Progress Photo styles
  shareButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  shareButtonSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
