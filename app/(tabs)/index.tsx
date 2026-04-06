import { useUser } from "@clerk/expo";
import { collection, doc, getDoc, limit, onSnapshot, query, where, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, Text, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format, isToday as isDateToday, startOfDay } from "date-fns";
import * as Haptics from 'expo-haptics';
import { CaloriesCard } from "../../components/CaloriesCard";
import { HomeHeader } from "../../components/HomeHeader";
import { RecentActivity } from "../../components/RecentActivity";
import { WaterCard } from "../../components/WaterCard";
import { WeeklyCalendar } from "../../components/WeeklyCalendar";
import { HealthScoreCard } from "../../components/HealthScoreCard";
import { DailyInsightCard } from "../../components/DailyInsightCard";
import { AIWorkoutQuickCard } from "../../components/AIWorkoutQuickCard";
import { HealthScoreModal } from "../../components/HealthScoreModal";
import { useRouter } from "expo-router";
import { SparklesIcon, Activity01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Skeleton } from "../../components/Skeleton";
import { Confetti, ConfettiRef } from "../../components/Confetti";

import { db } from "../../lib/firebase";
import { useTheme } from "../../lib/ThemeContext";

const HomeSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={styles.skeletonContainer}>
      {/* Header Skeleton */}
      <View style={styles.skeletonHeader}>
        <Skeleton width="40%" height={24} />
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>
      
      {/* Calendar Skeleton */}
      <View style={styles.skeletonCalendar}>
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <Skeleton key={i} width={40} height={60} borderRadius={12} />
        ))}
      </View>

      {/* Insight Card Skeleton */}
      <Skeleton width="100%" height={100} borderRadius={24} style={{ marginBottom: 16 }} />

      {/* Main Card Skeleton */}
      <Skeleton width="100%" height={320} borderRadius={24} style={{ marginBottom: 16 }} />
      
      {/* Water Card Skeleton */}
      <Skeleton width="100%" height={80} borderRadius={24} style={{ marginBottom: 16 }} />

      {/* Activity List Skeleton */}
      <View style={{ gap: 12 }}>
        <Skeleton width="40%" height={20} style={{ marginBottom: 8 }} />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} width="100%" height={70} borderRadius={16} />
        ))}
      </View>
    </View>
  );
};

export default function Home() {
  const { user } = useUser();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withSpring(1.05, { damping: 10 }),
        withSpring(1, { damping: 10 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const [userData, setUserData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [isScoreModalVisible, setIsScoreModalVisible] = useState(false);
  
  const confettiRef = useRef<ConfettiRef>(null);
  const lastCalorieCelebration = useRef<string | null>(null);
  const lastWaterCelebration = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.id);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
      setIsProfileLoading(false);
    }, (error) => {
      console.error("Error listening to user data:", error);
      setIsProfileLoading(false);
    });

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setIsLogsLoading(true);

    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      where('date', '==', dateStr),
      limit(50)
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const dailyLogs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'food',
          timestamp: data.timestamp,
          date: data.date,
          name: data.name,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          waterLiters: data.waterLiters,
          intensity: data.intensity,
          duration: data.duration,
          description: data.description,
          serving: data.serving,
          brand: data.brand,
          time: data.timestamp?.toDate()
            ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now'
        };
      }).sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setLogs(dailyLogs);
      setIsLogsLoading(false);
    }, (error) => {
      console.error("Firestore Logs Snapshot Error:", error);
      setIsLogsLoading(false);
    });

    const weightQuery = query(
      collection(db, 'weight_logs'),
      where('userId', '==', user.id)
    );

    const unsubscribeWeight = onSnapshot(weightQuery, (snapshot) => {
      if (!snapshot.empty) {
        const weightLogs = snapshot.docs.map(doc => doc.data());
        weightLogs.sort((a, b) => b.date.localeCompare(a.date));
        setLatestWeight(weightLogs[0].weightKg);
      }
    });

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeLogs) unsubscribeLogs();
      if (unsubscribeWeight) unsubscribeWeight();
    };
  }, [user, selectedDate]);

  useEffect(() => {
    if (!userData || logs.length === 0) return;
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    if (!isDateToday(selectedDate)) return;

    const targetCalories = userData.dailyCalories || 2000;
    const consumedCalories = logs
      .filter(l => (l.type === 'food' || l.type === 'ai_log'))
      .reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
    
    if (consumedCalories >= targetCalories && lastCalorieCelebration.current !== dateKey) {
      lastCalorieCelebration.current = dateKey;
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        confettiRef.current?.trigger();
      }, 500);
    }

    const targetWater = userData.targetWaterLiters || 2.0;
    const consumedWater = logs
      .filter(l => l.type === 'water')
      .reduce((acc, curr) => acc + (Number(curr.waterLiters) || 0), 0);

    if (consumedWater >= targetWater && lastWaterCelebration.current !== dateKey) {
      lastWaterCelebration.current = dateKey;
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        confettiRef.current?.trigger();
      }, 500);
    }
  }, [logs, userData, selectedDate]);

  const consumedMacros = useMemo(() => {
    return logs.reduce((acc, log) => ({
      calories: acc.calories + (log.type === 'food' ? (log.calories || 0) : 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fat || 0),
      water: acc.water + (log.waterLiters || 0),
      exerciseMinutes: acc.exerciseMinutes + (log.type === 'exercise' ? (log.duration || 0) : 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exerciseMinutes: 0 });
  }, [logs]);

  const targets = useMemo(() => userData?.profile?.macros || {}, [userData]);
  const dailyCalories = useMemo(() => targets.dailyCalories || 2000, [targets]);
  const targetWaterLiters = useMemo(() => targets.waterIntakeLiters || 2.5, [targets]);

  const remainingCalories = Math.max(0, dailyCalories - consumedMacros.calories);
  const progress = dailyCalories > 0 ? consumedMacros.calories / dailyCalories : 0;
  const consumedWaterLiters = consumedMacros.water;

  const currentHealthScoreBreakdown = useMemo(() => {
    const proteinScore = Math.min((consumedMacros.protein / (targets.proteinGrams || 150)) * 20, 20);
    const macroScore = Math.min(((consumedMacros.carbs + consumedMacros.fats) / 200) * 20, 20);
    const calorieScore = Math.min((consumedMacros.calories / dailyCalories) * 20, 20);
    const exerciseScore = Math.min(consumedMacros.exerciseMinutes / 30, 1) * 20;
    const waterScore = Math.min(consumedMacros.water / 2.5, 1) * 20;
    
    return {
      protein: Math.max(0, proteinScore),
      macros: Math.max(0, macroScore),
      calories: Math.max(0, calorieScore),
      exercise: Math.max(0, exerciseScore),
      water: Math.max(0, waterScore),
      total: Math.round(proteinScore + macroScore + exerciseScore + waterScore + calorieScore)
    };
  }, [consumedMacros, dailyCalories, targets]);

  const currentHealthScore = currentHealthScoreBreakdown.total;

  const scoreColor = currentHealthScore >= 70 ? '#009050' : currentHealthScore >= 40 ? '#D69E2E' : '#E53E3E';

  const handleDeleteLog = useCallback(async (id: string, name: string) => {
    Alert.alert(
      "Delete Activity",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'logs', id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Error deleting log:", error);
              Alert.alert("Error", "Failed to delete activity. Please try again.");
            }
          } 
        },
      ]
    );
  }, []);

  const handleQuickLogWater = useCallback(async (liters: number) => {
    if (!user) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addDoc(collection(db, 'logs'), {
        userId: user.id,
        type: 'water',
        waterLiters: liters,
        date: format(new Date(), 'yyyy-MM-dd'),
        name: 'Water',
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error quick logging water:", err);
    }
  }, [user]);

  const isToday = isDateToday(selectedDate);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <HomeHeader 
          userData={userData}
          healthScore={currentHealthScore} 
          scoreColor={scoreColor}
          pulseStyle={pulseStyle}
          onScorePress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsScoreModalVisible(true);
          }}
        />
        <WeeklyCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

        {targets.dailyCalories > 0 && user?.id && (
          <DailyInsightCard 
            consumedCalories={consumedMacros.calories} 
            targetCalories={dailyCalories} 
            protein={consumedMacros.protein} 
            date={selectedDate}
            userId={user.id}
          />
        )}

        <AIWorkoutQuickCard />

        {(isProfileLoading || isLogsLoading) ? (
          <HomeSkeleton />
        ) : (
          <Animated.View entering={FadeInDown.duration(600).springify().damping(12)}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <CaloriesCard
                targetCalories={dailyCalories}
                targetProtein={targets.proteinGrams || 150}
                targetCarbs={targets.carbsGrams || 200}
                targetFats={targets.fatsGrams || 60}
                targetWaterLiters={targetWaterLiters}
                remaining={remainingCalories}
                progress={progress}
                protein={Math.round(consumedMacros.protein)}
                carbs={Math.round(consumedMacros.carbs)}
                fats={Math.round(consumedMacros.fats)}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(600)}>
              <WaterCard
                targetLiters={targetWaterLiters}
                consumedLiters={consumedWaterLiters}
                onQuickLog={handleQuickLogWater}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <RecentActivity 
                activities={logs} 
                onDelete={handleDeleteLog}
                isToday={isToday}
              />
            </Animated.View>
          </Animated.View>
        )}

      </ScrollView>

      {!isProfileLoading && !isLogsLoading && (
        <Animated.View 
          entering={FadeInDown.delay(800).duration(600).springify()}
          style={styles.fabContainer}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/ai-coach' as any);
            }}
          >
            <LinearGradient
              colors={['#009050', '#00703C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}
            >
              <HugeiconsIcon icon={SparklesIcon} size={28} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Confetti ref={confettiRef} />

      <HealthScoreModal
        isVisible={isScoreModalVisible}
        onClose={() => setIsScoreModalVisible(false)}
        totalScore={currentHealthScore}
        breakdown={currentHealthScoreBreakdown}
        onProfilePress={() => router.push('/profile' as any)}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120, // padding for the floating tab bar
  },
  journalEmpty: {
    paddingVertical: 4,
  },
  journalEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skeletonContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  skeletonCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100, // Above the tab bar
    right: 24,
    zIndex: 100,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
