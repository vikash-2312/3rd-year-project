import { ClerkLoaded, ClerkProvider, useAuth, useUser } from '@clerk/expo';
import * as Notifications from 'expo-notifications';
import { Redirect, Stack, useSegments, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authBridge } from '../lib/auth-bridge';
import { 
  registerForPushNotificationsAsync, 
  saveNotificationHistory, 
  scheduleDailyReminders, 
  seedAdminSettings 
} from '../lib/notifications';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ThemeProvider } from '../lib/ThemeContext';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
}

const InitialLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const [isSigningIn, setIsSigningIn] = useState(authBridge.isSigningIn);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const checkSigningIn = async () => {
      try {
        const val = await AsyncStorage.getItem('is_signing_in');
        const isCurrentlySigningIn = val === 'true';
        setIsSigningIn(isCurrentlySigningIn);

        // [BRIDGED CLEANUP] 
        if (isSignedIn && (isCurrentlySigningIn || authBridge.isSigningIn)) {
          console.log('[InitialLayout] Bridged Cleanup: User is signed in, clearing transition flags');
          await AsyncStorage.removeItem('is_signing_in');
          authBridge.isSigningIn = false;
          setIsSigningIn(false);
        }
      } catch (e) {
        setIsSigningIn(false);
      } finally {
        setIsHydrated(true);
      }
    };
    checkSigningIn();
    
    const interval = setInterval(checkSigningIn, 2000);
    return () => clearInterval(interval);
  }, [segments, isSignedIn]);

  const effectiveSigningIn = isSigningIn || authBridge.isSigningIn;

  console.log('[InitialLayout] isLoaded:', isLoaded, 'isSignedIn:', isSignedIn, 'isSigningIn:', effectiveSigningIn, 'isHydrated:', isHydrated);

  // Push Notification Setup
  useEffect(() => {
    if (isSignedIn && user?.id) {
      console.log('[Notifications] Setting up for user:', user.id);
      registerForPushNotificationsAsync(user.id).then(token => {
        console.log('[Notifications] Registration complete, token:', token);
      }).catch(err => {
        console.error('[Notifications] Registration error:', err);
      });

      getDoc(doc(db, 'users', user.id, 'settings', 'preferences')).then(prefSnap => {
        const prefs = prefSnap.data();
        const enabled = prefs?.notificationsEnabled ?? true;
        scheduleDailyReminders(enabled);
      }).catch(err => {
        console.error('[Notifications] Error fetching preferences:', err);
        scheduleDailyReminders(true);
      });

      seedAdminSettings();

      const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
        saveNotificationHistory(
          user.id,
          notification.request.content.title || 'Notification',
          notification.request.content.body || ''
        );
      });

      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('[Notifications] Response:', response);
      });

      return () => {
        notificationSubscription.remove();
        responseSubscription.remove();
      };
    }
  }, [isSignedIn, user?.id]);

  const inAuthGroup = segments[0] === '(auth)';

  // ── Imperative Routing Monitor ──────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isHydrated) return;

    // [LOGOUT SWEEP]
    // If the user is definitively signed out, ensure no residual flags persist
    if (!isSignedIn && !effectiveSigningIn) {
      AsyncStorage.removeItem('is_signing_in').catch(() => {});
      authBridge.isSigningIn = false;
    }

    if (effectiveSigningIn) return;

    // Stabilization delay to avoid micro-flickers
    const timer = setTimeout(() => {
      if (!isSignedIn && !inAuthGroup) {
        console.log('[RoutingMonitor] NO SESSION DETECTED: Routing to Welcome');
        router.replace('/(auth)/welcome');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isSignedIn, isLoaded, isHydrated, effectiveSigningIn, inAuthGroup]);

  // ── Loading Overlay Component ────────────────────────────────────
  const LoadingGate = ({ message }: { message?: string }) => (
    <View style={styles.overlayContainer}>
      <ActivityIndicator size="large" color="#FF6B6B" />
      {message && <Text style={styles.overlayText}>{message}</Text>}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="index" />
        <Stack.Screen
          name="food-search"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="log-food"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="preferences"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="notifications"
          options={{ presentation: 'modal', animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="add-progress-photo"
          options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen
          name="ai-coach"
          options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen
          name="expo-auth-session"
          options={{ presentation: 'modal', animation: 'fade' }}
        />
      </Stack>

      {/* ── THE SILENT BOOT SHIELD (Loading app state) ── */}
      {(!isLoaded || !isHydrated) && <LoadingGate />}

      {/* ── THE TRANSITION BLANKET (Hiding the profile flash during logout) ── */}
      {(!isSignedIn && !inAuthGroup && !effectiveSigningIn && isLoaded) && (
        <LoadingGate />
      )}

      {/* ── THE HANDSHAKE SHIELD (Active login process) ── */}
      {(() => {
        const isHandshakeRoute = segments[1] === 'sign-in' || segments[1] === 'sign-up';
        // Keep the shield up until we have definitively exited the auth group
        if (effectiveSigningIn && inAuthGroup && (isSignedIn || isHandshakeRoute)) {
          return <LoadingGate message="Finalizing Secure Login..." />;
        }
        return null;
      })()}
    </View>
  );
};

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <InitialLayout />
          </GestureHandlerRootView>
        </ThemeProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayText: {
    marginTop: 16,
    color: '#718096',
    fontSize: 16,
    fontWeight: '600',
  },
});
