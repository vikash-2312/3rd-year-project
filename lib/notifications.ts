import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { db } from './firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
 */
export async function scheduleDailyReminders() {
  // Cancel all existing scheduled notifications to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 1. Lunch Reminder (12:00 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Lunch Time! 🍱",
      body: "Don't forget to log your lunch to stay on track.",
      data: { url: '/(tabs)' }
    },
    trigger: {
      hour: 12,
      minute: 0,
      repeats: true,
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
      hour: 16,
      minute: 0,
      repeats: true,
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
      hour: 20,
      minute: 0,
      repeats: true,
    } as any,
  });

  console.log('[Notifications] Daily reminders scheduled.');
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
