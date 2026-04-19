import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { Button } from "../components/Button";
import { useEffect, useState, useRef } from "react";
import { saveUserToFirestore, db } from "../lib/firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { checkAndMigrateProfile } from "../hooks/useAuthCheck";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";

export default function Index() {
  const { user } = useUser();
  const router = useRouter();
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user || hasChecked.current) return;
      
      try {
        const isSigningIn = await AsyncStorage.getItem('is_signing_in');
        if (isSigningIn === 'true') {
          console.log('[Index] User is currently signing in, deferring routing to auth screens');
          return;
        }

        hasChecked.current = true;
        
        // 1. Centralized check & migrate
        const { route } = await checkAndMigrateProfile(
          user.id,
          user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
        );

        console.log('[Index] Routing to:', route);
        
        // Final sanity check: never replace '/' with '/' to avoid infinite remount loops
        if (route !== '/') {
          // @ts-ignore
          router.replace(route);
        } else {
          console.warn('[Index] Attempted to route to root, falling back to tabs');
          // @ts-ignore
          router.replace('/(tabs)');
        }

      } catch (error) {
        console.error("[Index] Error checking status:", error);
        // @ts-ignore
        router.replace('/(tabs)'); // Fallback
      }
    };

    checkStatus();
  }, [user?.id]); // Use ID dependency to prevent loops from user object identity changes

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
