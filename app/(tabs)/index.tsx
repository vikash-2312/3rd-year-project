import { useAuth, useUser } from "@clerk/expo";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { HomeHeader } from "../../components/HomeHeader";
import { WeeklyCalendar } from "../../components/WeeklyCalendar";
import { CaloriesCard } from "../../components/CaloriesCard";
import { RecentActivity } from "../../components/RecentActivity";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function Home() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingProps, setIsLoadingProps] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user macros:", error);
      } finally {
        setIsLoadingProps(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  // Safely extract macro values with fallback defaults
  const macros = userData?.profile?.macros || {};
  const dailyCalories = macros.dailyCalories || 2000;
  // Temporary consumed logic: assuming the user hasn't eaten yet, or we'd load this from a daily log
  const consumedCalories = 0; 
  const remainingCalories = Math.max(0, dailyCalories - consumedCalories);
  const progress = dailyCalories > 0 ? (dailyCalories - remainingCalories) / dailyCalories : 0;

  const proteinGrams = macros.proteinGrams || 0;
  const carbsGrams = macros.carbsGrams || 0;
  const fatsGrams = macros.fatsGrams || 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <HomeHeader />
        <WeeklyCalendar />

        {isLoadingProps ? (
          <ActivityIndicator size="large" color="#009050" style={{ marginVertical: 40 }} />
        ) : (
          <CaloriesCard 
            remaining={remainingCalories} 
            progress={progress} 
            protein={proteinGrams} 
            carbs={carbsGrams} 
            fats={fatsGrams} 
          />
        )}

        {/* Recent Activity Section */}
        <RecentActivity activities={[]} />

        <View style={styles.testSection}>
          <Text style={styles.title}>Welcome Home!</Text>
          <Text style={styles.subtitle}>
            {user?.fullName ? `Hello, ${user.fullName}!` : "You are successfully authenticated."}
          </Text>

          {/* Temporary clear button for testing */}
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
          />

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
