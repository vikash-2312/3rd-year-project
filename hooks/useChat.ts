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
import { getMemory, UserMemory } from '../services/memoryService';
import { getUserAnalysisContext } from '../services/healthAnalyzer';
import { processMessage, processMessageStreaming } from '../services/chatService';

// --- Constants ---

const getChatHistoryKey = (userId: string) => `@ai_chat_history_${userId}`;
const getModeKey = (userId: string) => `@ai_intelligence_mode_${userId}`;
const LEGACY_CHAT_KEY = '@ai_chat_history'; // Migration handle
const CHAT_IMAGE_DIR = `${(FileSystem as any).documentDirectory}chat_assets/`;
const MAX_STORED_MESSAGES = 50;

// --- Hook ---

export function useChat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [intelligenceMode, setIntelligenceMode] = useState<'lightning' | 'pro'>('lightning');
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
          // Migrate old messages to include IDs for stable keys
          const sanitized = parsed.map(msg => ({
            ...msg,
            id: msg.id || `hist-${msg.timestamp}-${Math.random().toString(36).substr(2, 4)}`
          }));
          setMessages(sanitized);
        } else {
          setMessages([]); // Reset for new user
        }

        // --- Load Intelligence Mode ---
        const modeKey = getModeKey(user.id);
        const savedMode = await AsyncStorage.getItem(modeKey);
        if (savedMode === 'pro' || savedMode === 'lightning') {
          setIntelligenceMode(savedMode as 'lightning' | 'pro');
        }
      } catch (error) {
        console.error('[useChat] Error loading chat history/mode:', error);
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

      // 2. Get today's logs + historical context based on mode (7 or 30 days)
      const data = await getUserAnalysisContext(user.id, profile, intelligenceMode === 'pro' ? 30 : 7);
      if (!data) return null;

      // Inject latest memory (already optimized in healthAnalyzer)
      data.memory = await getMemory(user.id);
      data.recentMessages = messages;

      setUserData(data);
      return data;
    } catch (error) {
      console.error('[useChat] Error fetching user data:', error);
      return null;
    }
  }, [user, intelligenceMode]);

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
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        const result = await processMessageStreaming(
          text.trim(),
          dataToUse,
          [...messages, userMsg], // Include the new message in history
          (chunkText) => {
            // Update the temporary AI message with the latest full text chunk
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'ai' && last.id.startsWith('streaming-')) {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, content: chunkText };
                return updated;
              } else {
                // First chunk: Create the streaming message
                return [...prev, {
                  id: `streaming-${Date.now()}`,
                  role: 'ai',
                  content: chunkText,
                  timestamp: Date.now(),
                }];
              }
            });
          },
          imageBase64,
          intelligenceMode
        );

        // Replace the floating streaming message with the final stable AI message
        setMessages((prev) => {
          const filtered = prev.filter(m => !m.id.startsWith('streaming-'));
          return [...filtered, {
            ...result.aiMessage,
            id: result.aiMessage.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }];
        });
        
        // Refresh again after action completion to sync the UI/Context immediately
        await fetchUserData();
      } catch (error: any) {
        console.error('[useChat] Error processing message:', error);

        // Add error message to chat
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
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

  const updateIntelligenceMode = useCallback(async (mode: 'lightning' | 'pro') => {
    setIntelligenceMode(mode);
    if (user) {
      try {
        await AsyncStorage.setItem(getModeKey(user.id), mode);
      } catch (e) {
        console.error('[useChat] Failed to save mode:', e);
      }
    }
  }, [user]);

  return {
    messages,
    isLoading,
    intelligenceMode,
    setIntelligenceMode: updateIntelligenceMode,
    sendMessage,
    clearChat,
    fetchUserData,
  };
}
