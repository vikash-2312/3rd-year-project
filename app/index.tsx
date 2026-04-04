import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { Button } from "../components/Button";
import { useEffect, useState, useRef } from "react";
import { saveUserToFirestore, db } from "../lib/firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";

export default function Index() {
  const { user } = useUser();
  const router = useRouter();
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user || hasChecked.current) return;
      
      try {
        const isSigningIn = await AsyncStorage.getItem('is_signing_in');
        if (isSigningIn === 'true') {
          console.log('[Index] User is currently signing in, deferring routing to sign-in.tsx');
          return;
        }

        hasChecked.current = true;
        // 1. Check local storage first for speed (scoped to the specific user!)
        const hasOnboardedLocal = await AsyncStorage.getItem(`has_onboarded_${user.id}`);
        console.log('[Index] Local onboarding status:', hasOnboardedLocal);
        
        if (hasOnboardedLocal === 'true') {
          console.log('[Index] User already onboarded (local), redirecting to tabs');
          // @ts-ignore
          router.replace('/(tabs)');
          return;
        }

        // 2. If not in local storage, check Firestore (e.g., user logged in on a new device)
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);
        console.log('[Index] Firestore doc exists:', userDoc.exists());

        const checkOnboardingData = (data: any) => {
          if (!data) return false;
          
          // 1. Explicit flags
          if (data.hasOnboarded === true || data.onboardingCompleted === true) return true;

          // 2. Strict field verification (nested in 'profile' OR legacy flat)
          const profile = data.profile || {};
          const measurements = profile.measurements || data.measurements || {};
          
          const hasGender = profile.gender || data.gender;
          const hasGoal = profile.goal || data.goal;
          const hasActivity = profile.activityLevel || data.activityLevel;
          const hasWeight = measurements.weightKg || data.weight || data.weightKg;
          const hasHeight = measurements.heightFt || data.heightFt || data.height;

          return !!(hasGender && hasGoal && hasActivity && hasWeight && hasHeight);
        };

        if (userDoc.exists() && checkOnboardingData(userDoc.data())) {
          console.log('[Index] Profile complete, saving local and redirecting to tabs');
          
          await AsyncStorage.setItem(`has_onboarded_${user.id}`, 'true');
          
          // Safe background sync for verified native profiles
          const rawEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
          const emailStr = rawEmail.trim().toLowerCase();
          const name = user.fullName || emailStr.split('@')[0];
          saveUserToFirestore(user.id, emailStr, name).catch(err => console.error(err));

          // @ts-ignore
          router.replace('/(tabs)');
        } else {
          // Doc missing or incomplete — try email-based fallback
          const rawEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
          const userEmail = rawEmail.trim().toLowerCase();
          console.log('[Index] Trying email-based fallback for:', userEmail);
          let foundProfile = false;

          if (userEmail) {
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', userEmail));
              const snap = await getDocs(q);

              for (const docSnap of snap.docs) {
                if (docSnap.id !== user.id && checkOnboardingData(docSnap.data())) {
                  console.log('[Index] Found profile under old ID:', docSnap.id, '→ migrating to', user.id);
                  const oldData = docSnap.data();
                  await setDoc(doc(db, 'users', user.id), oldData, { merge: true });
                  await AsyncStorage.setItem(`has_onboarded_${user.id}`, 'true');
                  
                  // Safe background sync for newly migrated profiles
                  const name = user.fullName || userEmail.split('@')[0];
                  saveUserToFirestore(user.id, userEmail, name).catch(err => console.error(err));

                  // @ts-ignore
                  router.replace('/(tabs)');
                  foundProfile = true;
                  break;
                }
              }
            } catch (emailErr) {
              console.error('[Index] Email-based lookup failed:', emailErr);
            }
          }

          if (!foundProfile) {
            console.log('[Index] No onboarding data found, redirecting to onboarding');
            router.replace('/(onboarding)/1');
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        // @ts-ignore
        router.replace('/(tabs)'); // Fallback to tabs to prevent getting stuck
      }
    };

    checkOnboardingStatus();
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
