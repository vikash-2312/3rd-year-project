import { useUser } from "@clerk/expo";
import { collection, doc, getDoc, limit, onSnapshot, query, where, deleteDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, Text, Alert } from "react-native";
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
import { useRouter } from "expo-router";

import { db } from "../../lib/firebase";
import { useTheme } from "../../lib/ThemeContext";

export default function Home() {
  const { user } = useUser();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [userData, setUserData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // 1. Listen for user profile data (Real-time)
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

    // 2. Listen for logs for the user
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    console.log(`[Home] Fetching logs for ${user.id} on date: ${dateStr}`);
    
    setIsLogsLoading(true);

    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      where('date', '==', dateStr),
      limit(50)
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      console.log(`[Home] Received ${snapshot.docs.length} logs from Firestore`);
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

    // 3. Fetch Latest Weight Log
    const weightQuery = query(
      collection(db, 'weight_logs'),
      where('userId', '==', user.id)
    );

    const unsubscribeWeight = onSnapshot(weightQuery, (snapshot) => {
      if (!snapshot.empty) {
        // Sort in JS to avoid index requirement
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

  // Aggregate macros from logs
  const consumedMacros = logs.reduce((acc, log) => ({
    calories: acc.calories + (log.type === 'food' ? (log.calories || 0) : 0),
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fats: acc.fats + (log.fat || 0),
    water: acc.water + (log.waterLiters || 0),
    exerciseMinutes: acc.exerciseMinutes + (log.type === 'exercise' ? (log.duration || 0) : 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exerciseMinutes: 0 });

  // Safely extract target macro values
  const targets = userData?.profile?.macros || {};
  const dailyCalories = targets.dailyCalories || 2000;
  const targetWaterLiters = targets.waterIntakeLiters || 2.5;

  const remainingCalories = Math.max(0, dailyCalories - consumedMacros.calories);
  const progress = dailyCalories > 0 ? consumedMacros.calories / dailyCalories : 0;

  const consumedWaterLiters = consumedMacros.water;

    const handleDeleteLog = async (id: string, name: string) => {
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
  };

  const isToday = isDateToday(selectedDate);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <HomeHeader />
        <WeeklyCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

        {isToday && targets.dailyCalories > 0 && (
          <DailyInsightCard 
            consumedCalories={consumedMacros.calories} 
            targetCalories={dailyCalories} 
            protein={consumedMacros.protein} 
          />
        )}

        {(isProfileLoading || isLogsLoading) ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 40 }} />
        ) : (
          <>
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
            <WaterCard
              targetLiters={targetWaterLiters}
              consumedLiters={consumedWaterLiters}
            />


            <HealthScoreCard
              weightKg={latestWeight || userData?.profile?.measurements?.weightKg || userData?.onboarding_weight || 70}
              protein={consumedMacros.protein}
              carbs={consumedMacros.carbs}
              fat={consumedMacros.fats}
              exerciseMinutes={consumedMacros.exerciseMinutes}
              waterLiters={consumedMacros.water}
              caloriesConsumed={consumedMacros.calories}
              calorieGoal={dailyCalories}
            />

          </>
        )}

        <RecentActivity 
          activities={logs} 
          onDelete={handleDeleteLog}
          isToday={isToday}
        />

      </ScrollView>
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
  journalCard: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  journalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  journalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  journalPreview: {
    gap: 8,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  journalEntry: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  journalEmpty: {
    paddingVertical: 4,
  },
  journalEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
