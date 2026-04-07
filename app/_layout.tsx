import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/expo';
import * as Notifications from 'expo-notifications';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerForPushNotificationsAsync, saveNotificationHistory, scheduleDailyReminders, seedAdminSettings, seedWelcomeNotification } from '../lib/notifications';

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
console.log('[RootLayout] Publishable Key exists:', !!publishableKey);

if (!publishableKey) {
  throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
}

import { useUser } from '@clerk/expo';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ThemeProvider } from '../lib/ThemeContext';

const InitialLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const segments = useSegments();

  console.log('[InitialLayout] isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);

  // Push Notification Setup — MUST be before any early returns (React Hook rules)
  useEffect(() => {
    if (isSignedIn && user?.id) {
      console.log('[Notifications] Setting up for user:', user.id);

      // 1. Register for push tokens
      registerForPushNotificationsAsync(user.id).then(token => {
        console.log('[Notifications] Registration complete, token:', token);
      }).catch(err => {
        console.error('[Notifications] Registration error:', err);
      });

      // 2. Fetch User Preferences, and Schedule local reminders
      getDoc(doc(db, 'users', user.id, 'settings', 'preferences')).then(prefSnap => {
        const prefs = prefSnap.data();
        const enabled = prefs?.notificationsEnabled ?? true;
        scheduleDailyReminders(enabled);
      }).catch(err => {
        console.error('[Notifications] Error fetching preferences:', err);
        scheduleDailyReminders(true); // default fallback
      });

      // 3. Seed Admin Settings and Welcome Message (Initial Setup)
      seedAdminSettings();
      seedWelcomeNotification(user.id);

      // 4. Listen for notifications
      const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('[Notifications] Received:', notification);
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

  // Allow sign-in / sign-up auth components to manage their own success redirects instead of forcefully aborting their navigation
  // if (isSignedIn && inAuthGroup) {
  //   return <Redirect href="/" />;
  // }

  if (!isSignedIn && !inAuthGroup) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(auth)" />

      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="index" />
      <Stack.Screen
        name="food-search"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="log-food"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="log-water"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          animation: 'slide_from_right',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add-progress-photo"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
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
