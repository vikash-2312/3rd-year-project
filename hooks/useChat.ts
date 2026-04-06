/**
 * useChat.ts
 * 
 * Custom hook that manages all chat state, message persistence,
 * and user data fetching. This is the bridge between the ChatScreen UI
 * and the chatService orchestration layer.
 */

import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../lib/firebase';
import { ChatMessage } from '../services/aiService';
import { processMessage } from '../services/chatService';

// --- Constants ---

const getChatHistoryKey = (userId: string) => `@ai_chat_history_${userId}`;
const LEGACY_CHAT_KEY = '@ai_chat_history'; // Migration handle
const CHAT_IMAGE_DIR = `${(FileSystem as any).documentDirectory}chat_assets/`;
const MAX_STORED_MESSAGES = 50;

// --- Hook ---

export function useChat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const isInitialized = useRef(false);

  // --- Load persisted chat history on mount or user change ---
  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      try {
        const key = getChatHistoryKey(user.id);
        let raw = await AsyncStorage.getItem(key);
        
        // --- LATE-MIGRATION BRIDGE (Identity-Lock Patch) ---
        if (!raw) {
          const legacyRaw = await AsyncStorage.getItem(LEGACY_CHAT_KEY);
          if (legacyRaw) {
            console.log(`[useChat] 🏹 Migrating legacy chat history to vault for ${user.id}`);
            await AsyncStorage.setItem(key, legacyRaw); 
            await AsyncStorage.removeItem(LEGACY_CHAT_KEY);
            raw = legacyRaw;
          }
        }

        if (raw) {
          const parsed = JSON.parse(raw) as ChatMessage[];
          setMessages(parsed);
        } else {
          setMessages([]); // Reset for new user
        }
      } catch (error) {
        console.error('[useChat] Error loading chat history:', error);
      }
      isInitialized.current = true;
    };

    loadHistory();
  }, [user?.id]);

  // --- Persist messages when they change ---
  useEffect(() => {
    if (!isInitialized.current || !user) return; // Don't save before initial load or no user

    const persist = async () => {
      try {
        // STRIP out base64 to protect AsyncStorage limits (approx 5-10MB limit)
        const toSave = messages.slice(-MAX_STORED_MESSAGES).map(msg => {
          if (msg.imageBase64) {
            const { imageBase64, ...rest } = msg;
            return rest;
          }
          return msg;
        });
        const key = getChatHistoryKey(user.id);
        await AsyncStorage.setItem(key, JSON.stringify(toSave));
      } catch (error) {
        console.error('[useChat] Error saving chat history:', error);
      }
    };

    persist();
  }, [messages, user?.id]);

  // --- Fetch user data from Firestore ---
  const fetchUserData = useCallback(async () => {
    if (!user) return null;

    try {
      // 1. Get user profile
      const userSnap = await getDoc(doc(db, 'users', user.id));
      const profile = userSnap.exists() ? userSnap.data()?.profile || {} : {};

      // 2. Get today's logs + Last 7 days for historical context
      const today = new Date();
      const sevenDaysAgo = subDays(today, 7);
      const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');
      
      const historyQuery = query(
        collection(db, 'logs'),
        where('userId', '==', user.id),
        where('date', '>=', sevenDaysAgoStr),
      );
      const historySnap = await getDocs(historyQuery);
      const allLogs = historySnap.docs.map(d => d.data());

      // 3. Aggregate history by day (Target vs Actual)
      const weeklySummary = [];
      // 4. Get latest weight
      const weightQuery = query(
        collection(db, 'weight_logs'),
        where('userId', '==', user.id),
      );
      const weightSnap = await getDocs(weightQuery);
      let latestWeight = profile?.measurements?.weightKg || 70;
      if (!weightSnap.empty) {
        const sorted = weightSnap.docs
          .map((d) => d.data())
          .sort((a, b) => b.date.localeCompare(a.date));
        latestWeight = sorted[0].weightKg || latestWeight;
      }

      const macros = profile?.macros || { dailyCalories: 2000, targetProtein: 150, targetCarbs: 200, targetFats: 60 };
      
      for (let i = 0; i < 7; i++) {
        const d = subDays(today, i);
        const dStr = format(d, 'yyyy-MM-dd');
        const dayLogs = allLogs.filter(log => log.date === dStr);
        
        const dayTotal = dayLogs.reduce((acc, log) => ({
          calories: acc.calories + (log.type === 'food' ? (log.calories || 0) : 0),
          protein: acc.protein + (log.protein || 0),
          carbs: acc.carbs + (log.carbs || 0),
          fats: acc.fats + (log.fat || 0),
          water: acc.water + (log.waterLiters || 0),
          exerciseMinutes: acc.exerciseMinutes + (log.type === 'exercise' ? (log.duration || 0) : 0),
        }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exerciseMinutes: 0 });

        weeklySummary.push({
          date: dStr,
          actualCalories: dayTotal.calories,
          targetCalories: macros.dailyCalories,
          actualProtein: dayTotal.protein,
          targetProtein: macros.targetProtein || Math.round(latestWeight * 2), // Fallback
        });
      }

    
      const dateStr = format(today, 'yyyy-MM-dd');
      const realTodayLogs = allLogs.filter(log => log.date === dateStr);
      
      const realTodayData = realTodayLogs.reduce((acc, log) => ({
        calories: acc.calories + (log.type === 'food' ? (log.calories || 0) : 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fats: acc.fats + (log.fat || 0),
        water: acc.water + (log.waterLiters || 0),
        exerciseMinutes: acc.exerciseMinutes + (log.type === 'exercise' ? (log.duration || 0) : 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exerciseMinutes: 0 });

      const data = {
        userId: user.id,
        goal: profile?.goal || 'General Health',
        weight: latestWeight,
        dailyCalories: macros.dailyCalories || 2000,
        consumedCalories: realTodayData.calories,
        protein: realTodayData.protein,
        carbs: realTodayData.carbs,
        fats: realTodayData.fats,
        water: realTodayData.water,
        exerciseMinutes: realTodayData.exerciseMinutes,
        onboarding: profile,
        todayLogs: realTodayLogs,
        weeklySummary: [...weeklySummary].reverse(), // Send chronologically (safe copy)
      };

      setUserData(data);
      return data;
    } catch (error) {
      console.error('[useChat] Error fetching user data:', error);
      return null;
    }
  }, [user]);

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // --- Send a message ---
  const sendMessage = useCallback(
    async (text: string, imageUri?: string, imageBase64?: string) => {
      // Allow sending if there is either text or an image
      if ((!text.trim() && !imageBase64) || isLoading || !user) return;

      let finalImageUri = imageUri;

      // Persistence: Copy to permanent document storage so OS doesn't wipe cache
      if (imageUri) {
        try {
          const dirInfo = await FileSystem.getInfoAsync(CHAT_IMAGE_DIR);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(CHAT_IMAGE_DIR, { intermediates: true });
          }
          const filename = imageUri.split('/').pop();
          finalImageUri = `${CHAT_IMAGE_DIR}${filename}`;
          await FileSystem.copyAsync({ from: imageUri, to: finalImageUri });
        } catch (err) {
          console.error('[useChat] Failed to copy image to persistence:', err);
        }
      }

      // Add user message immediately
      const userMsg: ChatMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
        imageUri: finalImageUri,
        imageBase64,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Refresh user data before sending (ensures fresh calorie counts etc.)
        const freshData = await fetchUserData();
        const dataToUse = freshData || userData || {
          userId: user.id,
          goal: 'General Health',
          weight: 70,
          dailyCalories: 2000,
          consumedCalories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          water: 0,
          exerciseMinutes: 0,
        };

        // Process via chatService (AI call + action engine + memory)
        const result = await processMessage(
          text.trim(),
          dataToUse,
          [...messages, userMsg], // Include the new message in history
          imageBase64
        );

        setMessages((prev) => [...prev, result.aiMessage]);
      } catch (error: any) {
        console.error('[useChat] Error processing message:', error);

        // Add error message to chat
        const errorMsg: ChatMessage = {
          role: 'ai',
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment. 🔄",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, user, messages, userData, fetchUserData],
  );

  // --- Clear chat ---
  const clearChat = useCallback(async () => {
    if (!user) return;
    setMessages([]);
    try {
      const key = getChatHistoryKey(user.id);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[useChat] Error clearing chat history:', error);
    }
  }, [user?.id]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
  };
}
