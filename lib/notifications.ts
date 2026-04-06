import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

/**
 * Register for push notifications and save token to Firestore
 */
export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // Get the token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('[Notifications] Token:', token);

    // Save token to user document
    if (userId && token) {
      await setDoc(doc(db, 'users', userId), {
        pushToken: token,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Schedule daily reminders for Lunch, Afternoon, and Dinner
 * If enabled is false, it clears all existing reminders and exits.
 */
export async function scheduleDailyReminders(enabled: boolean = true) {
  // Cancel all existing scheduled notifications to avoid duplicates (and respect opt-outs)
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!enabled) {
    console.log('[Notifications] Reminders disabled by user preference.');
    return;
  }

  // 1. Lunch Reminder (12:00 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Lunch Time! 🍱",
      body: "Don't forget to log your lunch to stay on track.",
      data: { url: '/(tabs)' }
    },
    trigger: {
      type: 'daily',
      hour: 12,
      minute: 0,
    } as any,
  });

  // 2. Afternoon Reminder (4:00 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Afternoon Check-in 🕒",
      body: "How is your day going? Log any snacks or water intake!",
      data: { url: '/(tabs)' }
    },
    trigger: {
      type: 'daily',
      hour: 16,
      minute: 0,
    } as any,
  });

  // 3. Dinner Reminder (8:00 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Dinner Time! 🍽️",
      body: "Final stretch! Log your dinner and wrap up your day.",
      data: { url: '/(tabs)' }
    },
    trigger: {
      type: 'daily',
      hour: 19,
      minute: 35,
    } as any,
  });

  // 4. Sleep Reminder (2:30 AM)
  //   await Notifications.scheduleNotificationAsync({
  //     content: {
  //       title: "Time to Sleep 🌙",
  //       body: "Good rest is crucial for your health and recovery. Have a good night!",
  //       data: { url: '/(tabs)' }
  //     },
  //     trigger: {
  //       type: 'daily',
  //       hour: 2,
  //       minute: 43,
  //     } as any,
  //   });

  //   console.log('[Notifications] Daily reminders scheduled.');
}

/**
 * Save a notification to the user's history in Firestore
 */
export async function saveNotificationHistory(userId: string, title: string, body: string) {
  if (!userId) return;

  try {
    await addDoc(collection(db, 'users', userId, 'notifications'), {
      title,
      body,
      createdAt: serverTimestamp(),
      read: false,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('[Notifications] Error saving history:', error);
  }
}

/**
 * Seed initial Admin notification settings if they don't exist
 */
export async function seedAdminSettings() {
  const settings = [
    {
      id: 'lunch_rem',
      title: "Lunch Time! 🍱",
      body: "Don't forget to log your lunch to stay on track.",
      type: 'reminder',
      schedule: '12:00'
    },
    {
      id: 'afternoon_rem',
      title: "Afternoon Check-in 🕒",
      body: "How is your day going? Log any snacks or water intake!",
      type: 'reminder',
      schedule: '16:00'
    },
    {
      id: 'dinner_rem',
      title: "Dinner Time! 🍽️",
      body: "Final stretch! Log your dinner and wrap up your day.",
      type: 'reminder',
      schedule: '20:00'
    },
    {
      id: 'daily_encouragement',
      title: "Keep it up! ✨",
      body: "Small steps lead to big changes. You're doing great!",
      type: 'encouragement',
      schedule: '09:00'
    }
  ];

  try {
    for (const s of settings) {
      await setDoc(doc(db, 'admin', 'notification_templates', 'items', s.id), s, { merge: true });
    }
    console.log('[Notifications] Admin settings seeded.');
  } catch (error) {
    console.error('[Notifications] Error seeding admin settings:', error);
  }
}

/**
 * Seed an initial welcome notification to new users
 */
export async function seedWelcomeNotification(userId: string) {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);

  try {
    // Check if we've already sent it
    const snap = await getDoc(userRef);
    
    // Safety check: If document doesn't exist yet, we can't reliably check
    // However, in the onboarding flow, we call this AFTER setDoc, so it SHOULD exist.
    if (!snap.exists()) {
      console.log('[Notifications] User document not found, skipping welcome seed for now');
      return;
    }

    const data = snap.data() || {};
    if (!data.welcomeNotifSent) {
      console.log('[Notifications] Seeding welcome notification...');
      // Write the welcome notification
      await saveNotificationHistory(
        userId,
        "Welcome to AiCalTrack! 🎉",
        "We're excited to help you hit your nutrition goals. Your daily reminders are set up!"
      );
      // Mark as sent
      await setDoc(userRef, { welcomeNotifSent: true }, { merge: true });
    }
  } catch (error) {
    console.error('[Notifications] Error seeding welcome notification:', error);
  }
}
