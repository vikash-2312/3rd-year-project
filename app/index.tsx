import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { Button } from "../components/Button";
import { useEffect, useState } from "react";
import { saveUserToFirestore, db } from "../lib/firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";

export default function Index() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        // 1. Check local storage first for speed
        const hasOnboardedLocal = await AsyncStorage.getItem('has_onboarded');
        
        if (hasOnboardedLocal === 'true') {
          setIsCheckingOnboarding(false);
          return;
        }

        // 2. If not in local storage, check Firestore (e.g., user logged in on a new device)
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().hasOnboarded) {
          // User has onboarded before, save to local storage for next time
          await AsyncStorage.setItem('has_onboarded', 'true');
          setIsCheckingOnboarding(false);
        } else {
          // User has never onboarded, redirect to the flow
          router.replace('/(onboarding)/1');
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setIsCheckingOnboarding(false); // Fallback to showing home to prevent getting stuck
      }
    };

    checkOnboardingStatus();
  }, [user]);

  useEffect(() => {
    // Background sync of basic user info
    if (user) {
      const { id, primaryEmailAddress, fullName } = user;
      const email = primaryEmailAddress?.emailAddress || "";
      const name = fullName || email.split("@")[0];

      saveUserToFirestore(id, email, name).catch((err) => {
        console.error("Failed to sync user to Firestore", err);
      });
    }
  }, [user]);      

  if (isCheckingOnboarding) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Setting up your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
           alert('Cleared! Refresh app to re-onboard');
        }} 
      />

      <Button 
        title="Sign Out" 
        onPress={() => signOut()} 
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    color: '#718096',
    fontSize: 16,
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
