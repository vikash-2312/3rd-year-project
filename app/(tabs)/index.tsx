import { useUser } from "@clerk/expo";
import { 
  collection, 
  doc, 
  getDoc, 
  limit, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  updateDoc,
  startAfter
} from "firebase/firestore";
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
import { HealthMetricsCard } from "../../components/HealthMetricsCard";
import { HealthScoreModal } from "../../components/HealthScoreModal";
import { AIProactiveAlert } from "../../components/AIProactiveAlert";
import { useRouter } from "expo-router";
import { SparklesIcon, Activity01Icon, Flag01Icon, AvocadoIcon, Camera01Icon, SmartWatch01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Skeleton } from "../../components/Skeleton";
import { Confetti, ConfettiRef } from "../../components/Confetti";
import { SmartMealSuggestions } from "../../components/SmartMealSuggestions";
import { OnboardingChecklist, OnboardingTask } from "../../components/OnboardingChecklist";
import { ManualHealthEntryModal } from "../../components/ManualHealthEntryModal";

import { db } from "../../lib/firebase";
import { useTheme } from "../../lib/ThemeContext";
import { getUserAnalysisContext } from "../../services/healthAnalyzer";
import { analyzeUserPerformance, AIInsight } from "../../services/decisionEngine";
import { getMemory } from "../../services/memoryService";
import { getFrequentMeals, quickLogMeal, FrequentMeal, getStarterMeals } from "../../services/mealService";
import { useHealthData } from "../../hooks/useHealthData";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateUnifiedHealthScore } from "../../services/healthScore";

const HomeSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={styles.skeletonContainer}>
      {/* Insight Card Skeleton */}
      <Skeleton width="100%" height={100} borderRadius={24} style={{ marginBottom: 16 }} />

      {/* Main Card Skeleton */}
      <Skeleton width="100%" height={320} borderRadius={24} style={{ marginBottom: 16 }} />
      
      {/* Water Card Skeleton */}
      <Skeleton width="100%" height={120} borderRadius={24} style={{ marginBottom: 16 }} />

      {/* Health Card Skeleton */}
      <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 16 }} />

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
  
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const health = useHealthData(user?.id, selectedDate);
  const healthData = health.data;

  const [userData, setUserData] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [isScoreModalVisible, setIsScoreModalVisible] = useState(false);
  const [activeInsights, setActiveInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frequentMeals, setFrequentMeals] = useState<FrequentMeal[]>([]);
  const [isQuickLogging, setIsQuickLogging] = useState(false);
  const [isStarterPack, setIsStarterPack] = useState(false);
  const [loggedMealName, setLoggedMealName] = useState<string | undefined>();
  const [isChecklistDismissed, setIsChecklistDismissed] = useState(false);
  const [hasLoggedAnyMeal, setHasLoggedAnyMeal] = useState(false);
  const [hasAnyPhoto, setHasAnyPhoto] = useState(false);
  const [isManualEntryVisible, setIsManualEntryVisible] = useState(false);
  
  // Pagination & Aggregation State
  const [logs, setLogs] = useState<any[]>([]);
  const [fullDayLogs, setFullDayLogs] = useState<any[]>([]); // New: For accurate daily totals
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [isMoreLogsLoading, setIsMoreLogsLoading] = useState(false);
  const lastDocRef = useRef<any>(null);
  
  const dismissedInsightIds = useRef<Set<string>>(new Set());
  
  const confettiRef = useRef<ConfettiRef>(null);
  const lastCalorieCelebration = useRef<string | null>(null);
  const lastWaterCelebration = useRef<string | null>(null);
  const isAnalyzingRef = useRef(false);
  const stepsRef = useRef(healthData.steps);
  
  // Sync ref with state
  useEffect(() => {
    stepsRef.current = healthData.steps;
  }, [healthData.steps]);

  const runProactiveAnalysis = useCallback(async (profile: any) => {
    if (!user || isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    try {
      const context = await getUserAnalysisContext(
        user.id, 
        profile, 
        7, 
        stepsRef.current, 
        profile?.macros?.dailySteps
      );
      if (context) {
        context.memory = await getMemory(user.id);
        const insights = analyzeUserPerformance(context);
        
        // Filter out insights that were dismissed in the current session
        // or identified by ID as already seen/ignored
        setActiveInsights(insights.filter(i => !dismissedInsightIds.current.has(i.id)));
      }
    } catch (e) {
      console.error("[Home] Analysis failed:", e);
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [user, healthData.steps]);

  const loadFrequentMeals = useCallback(async () => {
    if (!user) return;
    const meals = await getFrequentMeals(user.id);
    if (meals.length === 0) {
      setFrequentMeals(getStarterMeals());
      setIsStarterPack(true);
    } else {
      setFrequentMeals(meals);
      setIsStarterPack(false);
    }
  }, [user]);

  useEffect(() => {
    loadFrequentMeals();
  }, [user]);

  const handleQuickLogMeal = async (meal: FrequentMeal) => {
    if (!user || isQuickLogging) return;
    setIsQuickLogging(true);
    setLoggedMealName(meal.name);
    
    try {
      const success = await quickLogMeal(user.id, meal);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Celebration for first-ever log
        if (!hasLoggedAnyMeal) {
          setHasLoggedAnyMeal(true);
          confettiRef.current?.trigger();
          Alert.alert("First Log Completed! 🏆", "Welcome to the elite minority who actually tracks their fuel. Keep this up!");
        }

        loadFrequentMeals(); // Refresh the counts
      } else {
        Alert.alert('Error', 'Failed to log meal. Please try again.');
      }
    } catch (e) {
      console.error('[Home] QuickLog Error:', e);
    } finally {
      setIsQuickLogging(false);
      setLoggedMealName(undefined);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Check dismissal status
    AsyncStorage.getItem(`checklist_dismissed_${user.id}`).then(val => {
      if (val === 'true') setIsChecklistDismissed(true);
    });

    // Real-time listen for ANY logs (for checklist)
    const logQ = query(collection(db, 'logs'), where('userId', '==', user.id), limit(1));
    const unsubscribeAnyLogs = onSnapshot(logQ, (snap) => setHasLoggedAnyMeal(!snap.empty));

    // Real-time listen for ANY photos (for checklist)
    const photoQ = query(collection(db, 'progress_photos'), where('userId', '==', user.id), limit(1));
    const unsubscribeAnyPhotos = onSnapshot(photoQ, (snap) => setHasAnyPhoto(!snap.empty));

    return () => {
      unsubscribeAnyLogs();
      unsubscribeAnyPhotos();
    };
  }, [user]);

  // BUG-10 FIX: Split profile/weight listeners from date-dependent logs listener
  // Profile & weight don't depend on selectedDate, so they shouldn't re-subscribe on date change
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
      unsubscribeUser();
      unsubscribeWeight();
    };
  }, [user]);

  // Date-dependent logs listener (only re-subscribes when selectedDate changes)
  useEffect(() => {
    if (!user) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setIsLogsLoading(true);

    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      where('date', '==', dateStr)
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
      setHasMoreLogs(snapshot.docs.length === 15);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setIsLogsLoading(false);
    }, (error) => {
      console.error("Firestore Logs Snapshot Error:", error);
      setIsLogsLoading(false);
    });

    // 2. Full Day Aggregation Listener (Fix for Daily Totals Bug)
    const fullDayQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      where('date', '==', dateStr)
      // No limit here because we need all logs for accurate macros/health score
    );

    const unsubscribeFullDay = onSnapshot(fullDayQuery, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => doc.data());
      setFullDayLogs(allLogs);
    });

    return () => {
      unsubscribeLogs();
      unsubscribeFullDay();
    };
  }, [user, selectedDate]);

  // TRIGGER ANALYSIS REACTIVELY
  // This ensures that when steps or logs update, the AI re-evaluates insights
  useEffect(() => {
    if (!userData || isProfileLoading || isLogsLoading || health.loading) return;
    
    // Small delay to ensure all state updates have settled
    const timer = setTimeout(() => {
      runProactiveAnalysis(userData);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    userData, 
    health.data.steps,
    isProfileLoading,
    isLogsLoading,      // Re-run when logs are finished loading (calories updated)
    health.loading,     // Wait for health data to be fully fetched
    runProactiveAnalysis
  ]);

  useEffect(() => {
    if (!userData || logs.length === 0) return;
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    if (!isDateToday(selectedDate)) return;

    const targetCalories = userData?.profile?.macros?.dailyCalories || 2000;
    const consumedCalories = fullDayLogs
      .filter(l => (l.type === 'food' || l.type === 'ai_log'))
      .reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
    
    if (consumedCalories >= targetCalories && lastCalorieCelebration.current !== dateKey) {
      lastCalorieCelebration.current = dateKey;
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        confettiRef.current?.trigger();
      }, 500);
    }

    const targetWater = userData?.profile?.macros?.waterIntakeLiters || 2.0;
    const consumedWater = fullDayLogs
      .filter(l => l.type === 'water')
      .reduce((acc, curr) => acc + (Number(curr.waterLiters) || 0), 0);

    if (consumedWater >= targetWater && lastWaterCelebration.current !== dateKey) {
      lastWaterCelebration.current = dateKey;
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        confettiRef.current?.trigger();
      }, 500);
    }
  }, [fullDayLogs, userData, selectedDate]);

  const consumedMacros = useMemo(() => {
    return fullDayLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.type === 'food' || log.type === 'ai_log' ? (Number(log.calories) || 0) : 0),
      protein: acc.protein + (Number(log.protein) || 0),
      carbs: acc.carbs + (Number(log.carbs) || 0),
      fats: acc.fats + (Number(log.fat) || Number(log.fats) || 0),
      water: acc.water + (Number(log.waterLiters) || 0),
      exerciseMinutes: acc.exerciseMinutes + (log.type === 'exercise' ? (Number(log.duration) || 0) : 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exerciseMinutes: 0 });
  }, [fullDayLogs]);

  const targets = useMemo(() => userData?.profile?.macros || {}, [userData]);
  const dailyCalories = useMemo(() => targets.dailyCalories || 2000, [targets]);
  const targetWaterLiters = useMemo(() => targets.waterIntakeLiters || 2.5, [targets]);

  const remainingCalories = Math.max(0, dailyCalories - consumedMacros.calories);
  const progress = dailyCalories > 0 ? consumedMacros.calories / dailyCalories : 0;
  const consumedWaterLiters = consumedMacros.water;

  const currentHealthScoreBreakdown = useMemo(() => {
    return calculateUnifiedHealthScore({
      consumed: {
        calories: consumedMacros.calories,
        protein: consumedMacros.protein,
        carbs: consumedMacros.carbs,
        fat: consumedMacros.fats,
        water: consumedMacros.water,
        exerciseMinutes: consumedMacros.exerciseMinutes
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
  }, [consumedMacros, targets, health.data.steps, health.data.sleepHours]);

  const currentHealthScore = currentHealthScoreBreakdown.total;

  const scoreColor = currentHealthScore >= 70 ? '#009050' : currentHealthScore >= 40 ? '#D69E2E' : '#E53E3E';

  const loadMoreLogs = useCallback(async () => {
    if (!user || isMoreLogsLoading || !hasMoreLogs || !lastDocRef.current) return;

    setIsMoreLogsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // FOR PRODUCTION: This query requires a composite index on (userId, date, timestamp).
      // If the index isn't created yet, this will error. 
      // I'm adding startAfter to support millions of users as requested.
      const q = query(
        collection(db, 'logs'),
        where('userId', '==', user.id),
        where('date', '==', dateStr),
        // orderBy('timestamp', 'desc'), // Removing orderBy for now to ensure it works without custom index immediately
        startAfter(lastDocRef.current),
        limit(15)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setHasMoreLogs(false);
        return;
      }

      const nextLogs = snapshot.docs.map(doc => {
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
      });

      setLogs(prev => {
        // Filter out any logs that might have been added by the real-time listener already
        const existingIds = new Set(prev.map(l => l.id));
        const filteredNext = nextLogs.filter(l => !existingIds.has(l.id));
        return [...prev, ...filteredNext];
      });
      setHasMoreLogs(snapshot.docs.length === 15);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
    } catch (e: any) {
      console.error('[Home] LoadMore Error:', e);
      if (e.code === 'failed-precondition') {
        console.warn('⚠️ FIRESTORE INDEX MISSING: This query requires a composite index. Check the link in the Firebase console to create it.');
      }
    } finally {
      setIsMoreLogsLoading(false);
    }
  }, [user, isMoreLogsLoading, hasMoreLogs, selectedDate]);

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

  const isFuture = selectedDate > startOfDay(new Date());
  
  const handleQuickLogWater = useCallback(async (liters: number) => {
    if (!user || isFuture) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addDoc(collection(db, 'logs'), {
        userId: user.id,
        type: 'water',
        waterLiters: liters,
        date: format(selectedDate, 'yyyy-MM-dd'),
        name: 'Water',
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error quick logging water:", err);
    }
    // selectedDate is in deps to avoid stale closure writing to wrong day
  }, [user, selectedDate, isFuture]);
 
  const handleUndoWater = useCallback(async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const q = query(
        collection(db, 'logs'),
        where('userId', '==', user.id),
        where('type', '==', 'water'),
        where('date', '==', dateStr)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Find the most recent one
        const sortedDocs = snapshot.docs.sort((a, b) => {
          const timeA = a.data().timestamp?.toMillis?.() || 0;
          const timeB = b.data().timestamp?.toMillis?.() || 0;
          return timeB - timeA;
        });
        
        const latestDoc = sortedDocs[0];
        await deleteDoc(doc(db, 'logs', latestDoc.id));
      } else {
        Alert.alert("No logs", "No water logs found for today to undo.");
      }
    } catch (err) {
      console.error("Error undoing water:", err);
    }
  }, [user, selectedDate]);

  const isToday = isDateToday(selectedDate);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ backgroundColor: colors.background, zIndex: 10 }}>
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
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Proactive Alerts */}
        {activeInsights.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {activeInsights.slice(0, 1).map(insight => (
              <AIProactiveAlert
                key={insight.id}
                insight={insight}
                onAction={(msg) => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.push({
                    pathname: '/ai-coach',
                    params: { initialMessage: msg }
                  });
                }}
                onDismiss={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dismissedInsightIds.current.add(insight.id);
                  setActiveInsights(prev => prev.filter(i => i.id !== insight.id));
                }}
              />
            ))}
          </View>
        )}

        {(() => {
          if (isChecklistDismissed || isProfileLoading) return null;
          
          const tasks: OnboardingTask[] = [
            {
              id: 'goal',
              title: 'Set your Weight Goal',
              isCompleted: !!userData?.profile?.measurements?.targetWeightKg,
              icon: Flag01Icon,
              color: '#F6AD55',
              onPress: () => router.push('/personal-details'),
            },
            {
              id: 'meal',
              title: 'Log your first Meal',
              isCompleted: hasLoggedAnyMeal,
              icon: AvocadoIcon,
              color: '#009050',
              onPress: () => router.push('/log-food' as any),
            },
            {
              id: 'photo',
              title: 'Upload a Photo',
              isCompleted: hasAnyPhoto,
              icon: Camera01Icon,
              color: '#3182CE',
              onPress: () => router.push('/add-progress-photo' as any),
            }
          ];

          if (tasks.every(t => t.isCompleted)) return null;

          return (
            <OnboardingChecklist 
              tasks={tasks} 
              onDismiss={async () => {
                setIsChecklistDismissed(true);
                if (user) await AsyncStorage.setItem(`checklist_dismissed_${user.id}`, 'true');
              }}
            />
          );
        })()}

        {isToday && frequentMeals.length > 0 && (
          <SmartMealSuggestions
            meals={frequentMeals}
            onLogMeal={handleQuickLogMeal}
            isLogging={isQuickLogging}
            loggedMealName={loggedMealName}
            title={isStarterPack ? "Recommended For You" : "Smart Suggestions"}
            subtitle={isStarterPack ? "Starter pack for new users" : "Based on your recent history"}
          />
        )}


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

            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ marginBottom: 16 }}>
              <WaterCard
                targetLiters={targetWaterLiters}
                consumedLiters={consumedWaterLiters}
                onQuickLog={handleQuickLogWater}
                onUndo={handleUndoWater}
                isToday={isToday}
                isFuture={isFuture}
                dateLabel={format(selectedDate, 'MMM d')}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(600)}>
              <HealthMetricsCard 
                onPress={() => router.push('/profile?sync=true' as any)} 
                onManualEntry={() => setIsManualEntryVisible(true)}
                data={health.data}
                loading={health.loading}
                error={health.error}
                permissionGranted={health.permissionGranted}
                isAvailable={health.isAvailable}
                targets={targets}
                isFuture={isFuture}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <RecentActivity 
                activities={logs.filter(log => 
                  log.type !== 'steps' && 
                  log.type !== 'sleep' && 
                  log.type !== 'water'
                )} 
                onDelete={handleDeleteLog}
                isToday={isToday}
                hasMore={hasMoreLogs}
                isLoadingMore={isMoreLogsLoading}
                onLoadMore={loadMoreLogs}
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

      {user && (
        <ManualHealthEntryModal
          isVisible={isManualEntryVisible}
          onClose={() => {
            setIsManualEntryVisible(false);
            health.refresh();
          }}
          userId={user.id}
          date={format(selectedDate, 'yyyy-MM-dd')}
          initialSteps={healthData.steps}
          initialSleep={healthData.sleepHours}
        />
      )}

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
