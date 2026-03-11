import { useAuth, useUser } from "@clerk/expo";
import { collection, doc, getDoc, limit, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { CaloriesCard } from "../../components/CaloriesCard";
import { HomeHeader } from "../../components/HomeHeader";
import { RecentActivity } from "../../components/RecentActivity";
import { WaterCard } from "../../components/WaterCard";
import { WeeklyCalendar } from "../../components/WeeklyCalendar";
import { db } from "../../lib/firebase";

export default function Home() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch user profile data
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoadingProps(false);
      }
    };

    fetchUserData();

    // Listen for logs for the user (completely simple query to avoid index requirement)
    const today = new Date().toISOString().split('T')[0];
    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      // orderBy removed to avoid ANY index requirement during development
      limit(50)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.timestamp,
          date: data.date,
          name: data.name,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          waterLiters: data.waterLiters,
          time: data.timestamp?.toDate()
            ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now'
        };
      });

      // Sort and filter client-side to be 100% safe
      const dailyLogs = allLogs
        .filter((log: any) => log.date === today)
        .sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || 0;
          const timeB = b.timestamp?.toMillis?.() || 0;
          return timeB - timeA;
        })
        .slice(0, 5);

      setLogs(dailyLogs);
    }, (error) => {
      console.error("Firestore Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Aggregate macros from logs
  const consumedMacros = logs.reduce((acc, log) => ({
    calories: acc.calories + (log.calories || 0),
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fats: acc.fats + (log.fat || 0),
    water: acc.water + (log.waterLiters || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0 });

  // Safely extract target macro values
  const targets = userData?.profile?.macros || {};
  const dailyCalories = targets.dailyCalories || 2000;
  const targetWaterLiters = targets.waterIntakeLiters || 2.5;

  const remainingCalories = Math.max(0, dailyCalories - consumedMacros.calories);
  const progress = dailyCalories > 0 ? consumedMacros.calories / dailyCalories : 0;

  const consumedWaterLiters = consumedMacros.water;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <HomeHeader />
        <WeeklyCalendar />

        {isLoadingProps ? (
          <ActivityIndicator size="large" color="#009050" style={{ marginVertical: 40 }} />
        ) : (
          <>
            <CaloriesCard
              targetCalories={dailyCalories}
              targetProtein={targets.proteinGrams || 150}
              targetCarbs={targets.carbsGrams || 200}
              targetFats={targets.fatsGrams || 60}
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
          </>
        )}

        <RecentActivity activities={logs} />

        <View style={styles.testSection}>
          {/* <Text style={styles.title}>Welcome Home!</Text>
          <Text style={styles.subtitle}>
            {user?.fullName ? `Hello, ${user.fullName}!` : "You are successfully authenticated."}
          </Text> */}
          {/* 
          <Button
            title="Reset Onboarding (Debug)"
            variant="outline"
            style={{ marginBottom: 16, width: '100%' }}
            onPress={async () => {
              await AsyncStorage.removeItem('has_onboarded');
              await AsyncStorage.removeItem('onboarding_gender');
              await AsyncStorage.removeItem('onboarding_goal');
              await AsyncStorage.removeItem('onboarding_activity');
              await AsyncStorage.removeItem('onboarding_birthdate');
              await AsyncStorage.removeItem('onboarding_weight');
              await AsyncStorage.removeItem('onboarding_height_ft');
              await AsyncStorage.removeItem('onboarding_height_in');
              alert('Cleared! Quit the app to re-onboard');
            }}
          /> */}

          <Button
            title="Sign Out"
            onPress={() => signOut()}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECFDF5', // Light green background matching the image top gradient
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100, // padding for the floating tab bar
  },
  testSection: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    width: '100%',
  }
});
