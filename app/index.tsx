import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { Button } from "../components/Button";
import { useEffect, useState } from "react";
import { saveUserToFirestore, db } from "../lib/firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";

export default function Index() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        // 1. Check local storage first for speed
        const hasOnboardedLocal = await AsyncStorage.getItem('has_onboarded');
        
        if (hasOnboardedLocal === 'true') {
          // @ts-ignore
          router.replace('/(tabs)');
          return;
        }

        // 2. If not in local storage, check Firestore (e.g., user logged in on a new device)
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().hasOnboarded) {
          // User has onboarded before, save to local storage for next time
          await AsyncStorage.setItem('has_onboarded', 'true');
          // @ts-ignore
          router.replace('/(tabs)');
        } else {
          // User has never onboarded, redirect to the flow
          router.replace('/(onboarding)/1');
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        // @ts-ignore
        router.replace('/(tabs)'); // Fallback to tabs to prevent getting stuck
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

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF6B6B" />
      <Text style={styles.loadingText}>Setting up your profile...</Text>
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
