import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Keyboard,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { format, subDays } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { 
  ArrowLeft01Icon, 
  Settings02Icon, 
  Camera01Icon, 
  ArrowRight01Icon, 
  SparklesIcon, 
  CheckmarkCircle02Icon,
  FlashIcon,
  ArtificialIntelligence01Icon,
  VolumeHighIcon,
  VolumeMute01Icon,
  Note01Icon // Using Note01Icon as a stable 'Copy' alternative for build compatibility
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import Animated, { 
  FadeInDown, 
  FadeOutDown,
  FadeInUp, 
  Layout, 
  useAnimatedStyle, 
  withSpring, 
  withSequence, 
  withTiming,
  withRepeat,
  withDelay,
  useSharedValue
} from 'react-native-reanimated';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  addDoc,
  setDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

import { db } from '../../lib/firebase';
import { useTheme } from '../../lib/ThemeContext';
import { processMessageStreaming, ProcessedResult } from '../../services/chatService';
import { ChatMessage } from '../../services/aiService';
import { uploadChatImage } from '../../services/chatStorageService';

// Fixed Type for local use
interface LocalChatMessage extends ChatMessage {
  image?: string;
  actionMetadata?: {
    id?: string;
    type?: string;
    status: string;
    data?: any;
  }[];
}

const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/### (.*?)\n/g, '$1. ') // Header 3
    .replace(/## (.*?)\n/g, '$1. ') // Header 2
    .replace(/# (.*?)\n/g, '$1. ') // Header 1
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Code
    .replace(/^[\s]*[\*\-\+]\s+/gm, '') // Bullet points (*, -, +)
    .replace(/^[\s]*\d+\.\s+/gm, '') // Numbered lists (1., 2., etc)
    .trim();
};

// --- High Fidelity Markdown Formatter (Custom) ---
const FormattedText = ({ text, color }: { text: string; color: string }) => {
  if (!text) return null;
  
  // Split by line to handle block-level elements like bullets and headers
  const lines = text.split('\n');
  
  return (
    <View style={styles.formattedContainer}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={lineIdx} style={{ height: 8 }} />;

        // 1. Headers (###)
        if (line.startsWith('### ')) {
          return (
            <Text key={lineIdx} style={[styles.header3, { color }]}>
              {line.replace('### ', '')}
            </Text>
          );
        }

        // 2. Bullet Points (* or -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.substring(2);
          const segments = content.split(/(\*\*.*?\*\*)/g);
          return (
            <View key={lineIdx} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: color + '80' }]}>•</Text>
              <Text style={[styles.messageText, { color, flex: 1 }]}>
                {segments.map((segment, i) => {
                  if (segment.startsWith('**') && segment.endsWith('**')) {
                    return <Text key={i} style={{ fontWeight: '800' }}>{segment.slice(2, -2)}</Text>;
                  }
                  return <Text key={i}>{segment}</Text>;
                })}
              </Text>
            </View>
          );
        }

        // 3. Regular Paragraph with Bolding
        const segments = line.split(/(\*\*.*?\*\*)/g);
        return (
          <Text key={lineIdx} style={[styles.messageText, { color, marginBottom: 4 }]}>
            {segments.map((segment, i) => {
              if (segment.startsWith('**') && segment.endsWith('**')) {
                return <Text key={i} style={{ fontWeight: '800' }}>{segment.slice(2, -2)}</Text>;
              }
              return <Text key={i}>{segment}</Text>;
            })}
          </Text>
        );
      })}
    </View>
  );
};

// --- High Fidelity Typing Indicator Component ---
const TypingIndicator = ({ color }: { color: string }) => {
  const Dot = ({ delay }: { delay: number }) => {
    const scale = useSharedValue(1);
    useEffect(() => {
      scale.value = withRepeat(
        withSequence(
          withDelay(delay, withSpring(1.5, { damping: 2 })),
          withSpring(1, { damping: 2 })
        ),
        -1,
        false
      );
    }, []);
    const style = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: (scale.value - 1) * 2 + 0.5
    }));
    return <Animated.View style={[styles.typingDot, { backgroundColor: color }, style]} />;
  };

  return (
    <View style={styles.typingContainer}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
};

export default function AICoachScreen() {
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [intelligenceMode, setIntelligenceMode] = useState<'lightning' | 'pro'>('lightning');
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [historicalLogs, setHistoricalLogs] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<any[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isListReady, setIsListReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const isAutoStarted = useRef(false);
  const isNearBottom = useRef(true);
  const isFirstLoad = useRef(true);
  const lastFailedMessage = useRef<string>('');
  const isStreamingRef = useRef(false);
  const recentlySentMsgIds = useRef<Set<string>>(new Set());
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // --- Fetch User Context for AI ---
  useEffect(() => {
    if (!user) return;

    // Listen to profile
    const unsubUser = onSnapshot(doc(db, 'users', user.id), (docSnap) => {
      if (docSnap.exists()) {
        const fullData = docSnap.data();
        setUserData({
          userId: user.id,
          goal: fullData.profile?.goal || 'maintain',
          weight: fullData.profile?.measurements?.weightKg || 70,
          dailyCalories: fullData.profile?.macros?.dailyCalories || 2000,
          protein: fullData.profile?.macros?.proteinGrams || 150,
          carbs: fullData.profile?.macros?.carbsGrams || 200,
          fats: fullData.profile?.macros?.fatsGrams || 60,
          water: fullData.profile?.macros?.waterIntakeLiters || 2.5,
          onboarding: fullData.onboarding || {},
        });
      }
    });

    return () => unsubUser();
  }, [user]);

  // --- Global Chat Persistence Loader ---
  useEffect(() => {
    if (!user) return;

    const chatRef = collection(db, 'users', user.id, 'chat_history');
    const q = query(chatRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubChat = onSnapshot(q, (snapshot) => {
      const historyItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          role: data.role,
          content: data.content,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          image: data.image,
          actionStatus: data.actionStatus,
          quickActions: data.quickActions,
        } as LocalChatMessage;
      });

      setMessages(prev => {
        const messageMap = new Map();
        
        // Populate with incoming history (which is source-of-truth for IDs)
        historyItems.forEach(item => {
          messageMap.set(item.id, item);
        });

        // Overlay optimistic local messages that haven't hit Firestore yet,
        // are currently being streamed, or are in the sync buffer window.
        prev.forEach(msg => {
          const matchedInHistory = messageMap.has(msg.id);
          const isCurrentlySyncing = recentlySentMsgIds.current.has(msg.id);
          
          if (isStreamingRef.current && msg.id.startsWith('ai-')) {
            // High priority: Keep streaming content alive
            messageMap.set(msg.id, msg);
          } else if (isCurrentlySyncing || !matchedInHistory) {
            // Medium priority: Maintain local state for a few seconds during the handshake
            messageMap.set(msg.id, msg);
          }
        });

        const sorted = Array.from(messageMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        return sorted;
      });
    });

    return () => unsubChat();
  }, [user]);

  // --- Fetch Historical Context for PRO mode ---
  useEffect(() => {
    if (!user || intelligenceMode !== 'pro') {
      setHistoricalLogs([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const thirtyDaysAgo = subDays(new Date(), 21); // 3 weeks is often better for immediate trends
        const q = query(
          collection(db, 'logs'),
          where('userId', '==', user.id),
          where('date', '>=', format(thirtyDaysAgo, 'yyyy-MM-dd')),
          orderBy('date', 'desc'),
          limit(50) // Strong limit for ultra-fast prompt processing
        );
        const snap = await getDocs(q);
        const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistoricalLogs(logs);
      } catch (error) {
        console.error('[AICoach] History fetch failed:', error);
      }
    };

    fetchHistory();
  }, [user, intelligenceMode]);

  // --- Real-time Todays Logs for Live Context ---
  useEffect(() => {
    if (!user) return;

    // We use a refresh key to trigger midnight updates
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const q = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      where('date', '==', todayStr)
    );

    const unsubLogs = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTodayLogs(logs);
    });

    return () => unsubLogs();
  }, [user]);

  // --- 7-Day Consistency Snapshot for AI awareness ---
  useEffect(() => {
    if (!user) return;

    // We fetch last 7 days of logs to build a consistency map
    const sevenDaysAgo = subDays(new Date(), 7);
    const q = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      where('date', '>=', format(sevenDaysAgo, 'yyyy-MM-dd'))
    );

    const unsubWeekly = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => doc.data());
      const summaryMap: Record<string, any> = {};

      // Initialize last 7 days
      for (let i = 0; i < 7; i++) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
        summaryMap[d] = { date: d, actualCalories: 0, actualProtein: 0, targetCalories: userData?.dailyCalories || 2000, targetProtein: userData?.protein || 150, hasLogs: false };
      }

      logs.forEach(log => {
        if (summaryMap[log.date] && log.type === 'food') {
          summaryMap[log.date].actualCalories += Number(log.calories || 0);
          summaryMap[log.date].actualProtein += Number(log.protein || 0);
          summaryMap[log.date].hasLogs = true;
        }
      });

      setWeeklySummary(Object.values(summaryMap).sort((a, b) => b.date.localeCompare(a.date)));
    });

    return () => unsubWeekly();
  }, [user, userData?.dailyCalories]);

  // --- Derived Live Stats for AI ---
  const liveContext = useMemo(() => {
    const stats = {
      consumedCalories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      water: 0,
      exerciseMinutes: 0,
    };

    todayLogs.forEach(log => {
      if (log.type === 'food') {
        stats.consumedCalories += Number(log.calories || 0);
        stats.protein += Number(log.protein || 0);
        stats.carbs += Number(log.carbs || 0);
        stats.fats += Number(log.fat || 0);
      } else if (log.type === 'water') {
        stats.water += Number(log.waterLiters || 0);
      } else if (log.type === 'exercise') {
        stats.exerciseMinutes += Number(log.duration || 0);
      }
    });

    return stats;
  }, [todayLogs]);

  // --- Handle Auto-Message from Dashboard ---
  useEffect(() => {
    if (initialMessage && userData && !isAutoStarted.current) {
      isAutoStarted.current = true;
      handleSendMessage(initialMessage);
    }
  }, [initialMessage, userData]);

  // --- Auto-scroll to bottom as AI types ---
  useEffect(() => {
    if (isNearBottom.current && messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, isTyping]);

  // --- Voice Lifecycle Cleanup ---
  useEffect(() => {
    return () => {
      Speech.stop();
      setIsSpeaking(false);
    };
  }, []);

  // --- Keyboard UX Fix ---
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      if (isNearBottom.current) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Ensure we are at the bottom on first data load
  useEffect(() => {
    if (messages.length > 0 && isFirstLoad.current) {
      // Jump immediately without animation
      flatListRef.current?.scrollToEnd({ animated: false });
      
      // Secondary jump to ensure we caught the full layout
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        isFirstLoad.current = false;
        setIsListReady(true);
      }, 32); // ~2 frames
      
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // --- Adaptive Intelligence Toggling ---
  const detectComplexity = (text: string): boolean => {
    const complexKeywords = [
      'trend', 'average', 'weekly', 'monthly', 'last 7 days', 'last 30 days',
      'stall', 'plateau', 'comparison', 'history', 'progress', 'consistent',
      'patterns', 'breakdown', 'why', 'analyze', 'audit'
    ];
    const lowercase = text.toLowerCase();
    return complexKeywords.some(kw => lowercase.includes(kw));
  };

  const handleSendMessage = async (text: string = inputText, imageUri?: string, isRetry: boolean = false) => {
    // Interrupt current speech if user sends new message
    Speech.stop();
    setIsSpeaking(false);
    
    // If no imageUri passed explicitly, check selectedImage state
    const resolvedImageUri = imageUri || selectedImage || undefined;
    
    const messageToSend = text.trim();
    if (!messageToSend && !resolvedImageUri) return;
    if (isLoading) return; // SEC-05: Spam Guard prevents concurrent AI overlaps
    if (!user || !userData) return;
    
    // Store for retry in case of failure
    lastFailedMessage.current = messageToSend;

    // --- 📥 Memory Consolidation Check ---
    // If conversation is long, remind AI to update memory
    const recentConvo = messages.filter(m => m.role !== 'system').length;
    let consolidationPrompt = "";
    if (recentConvo > 0 && recentConvo % 12 === 0) {
      consolidationPrompt = "\n[SYSTEM]: We've shared a lot. Please use this turn to update your permanent 'unstructured_bio' memory with a summary of my recent progress/struggles.";
    }

    // --- Adaptive IQ Logic ---
    let currentIntelligence = intelligenceMode;
    let currentHistoricalLogs = [...historicalLogs];

    if (currentIntelligence === 'lightning' && detectComplexity(messageToSend)) {
      currentIntelligence = 'pro';
      setIntelligenceMode('pro');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (historicalLogs.length === 0) {
        const thirtyDaysAgo = subDays(new Date(), 30);
        const q = query(
          collection(db, 'logs'),
          where('userId', '==', user.id),
          where('date', '>=', format(thirtyDaysAgo, 'yyyy-MM-dd')),
          orderBy('date', 'desc'),
          limit(100)
        );
        const snap = await getDocs(q);
        const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistoricalLogs(logs);
        currentHistoricalLogs = logs;
      }
    }

    const userMsgId = Date.now().toString();
    
    if (!isRetry) {
      const userMsg: LocalChatMessage = {
        id: userMsgId,
        role: 'user',
        content: messageToSend,
        timestamp: Date.now(),
        image: resolvedImageUri || undefined,
      };

      setMessages(prev => [...prev, userMsg]);
    }
    
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);
    isStreamingRef.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Placeholder for AI 
    const aiMsgId = `ai-${Date.now()}`;
    const aiMsgPlaceholder: LocalChatMessage = {
      id: aiMsgId,
      role: 'ai',
      content: '',
      timestamp: Date.now(),
    };

    // Track for sync buffer
    recentlySentMsgIds.current.add(userMsgId);
    recentlySentMsgIds.current.add(aiMsgId);

    setMessages(prev => [...prev, aiMsgPlaceholder]);

    let accumulatedText = '';
    let imageBase64: string | undefined;
    let cloudImageUrl: string | undefined;

    if (resolvedImageUri) {
      try {
        // Read as base64 for the AI engine immediately (so it stays fast)
        imageBase64 = await FileSystem.readAsStringAsync(resolvedImageUri, {
          encoding: 'base64',
        });

        // BACKGROUND: Start uploading to Supabase for permanent persistence
        // We'll wait for this before saving the Firestore record
        cloudImageUrl = await uploadChatImage(user.id, resolvedImageUri);
      } catch (e) {
        console.error('[AICoach] Image processing/upload failed:', e);
      }
    }
    
    // Clear image ONLY after conversion is attempted
    setSelectedImage(null);

    // 1. Save User Message to Firestore (Natively persistent)
    if (!isRetry) {
      try {
        // SEC-04: Ensure we only save reachable cloud URLs or gracefully handle local-only fallback
        const finalImageToSave = cloudImageUrl?.startsWith('http') ? cloudImageUrl : null;
        
        await setDoc(doc(db, 'users', user.id, 'chat_history', userMsgId), {
          role: 'user',
          content: messageToSend,
          timestamp: serverTimestamp(),
          image: finalImageToSave || null
        });
      } catch (err) {
        console.error('[AICoach] User msg save failed:', err);
      }
    }

    // 2. Call AI and Stream
    try {
      const result = await processMessageStreaming(
        messageToSend + consolidationPrompt,
        { ...userData, ...liveContext, todayLogs, historicalLogs: currentHistoricalLogs, weeklySummary },
        messages,
        (chunk) => {
          accumulatedText = chunk;
          setMessages(prev => prev.map(m => 
            m.id === aiMsgId ? { ...m, content: accumulatedText } : m
          ));
          
          if (isNearBottom.current) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        },
        imageBase64,
        currentIntelligence
      );

      // Finalize metadata locally
      setMessages(prev => prev.map(m => 
        m.id === aiMsgId ? { 
          ...m, 
          content: result.aiMessage.content || accumulatedText || "I've processed your request.",
          actionStatus: result.aiMessage.actionStatus,
          actionMetadata: result.actionMetadata?.map(meta => ({
            id: meta.id,
            type: meta.type,
            status: meta.status || result.aiMessage.actionStatus || 'Success',
            data: meta.data
          })),
          quickActions: result.aiMessage.quickActions 
        } : m
      ));

      // 3. Save AI Response to Firestore
      await setDoc(doc(db, 'users', user.id, 'chat_history', aiMsgId), {
        role: 'ai',
        content: result.aiMessage.content || accumulatedText,
        timestamp: serverTimestamp(),
        actionStatus: result.actionStatus || null,
        actionMetadata: result.actionMetadata?.map(meta => ({
          id: meta.id,
          type: meta.type,
          status: meta.status || result.actionStatus || 'Success',
          data: meta.data || null
        })) || null,
        quickActions: result.aiMessage.quickActions || null
      });
      
      if (isVoiceEnabled) {
        const cleanText = stripMarkdown(result.aiMessage.content || accumulatedText);
        setIsSpeaking(true);
        Speech.speak(cleanText, { 
          rate: 1.1,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
      }

      // Haptic feedback on completion
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (error) {
      console.error('[AICoach] Chat error:', error);
      setHasError(true);
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      isStreamingRef.current = false;
      
      // Keep IDs in buffer for 5s to allow Firestore onSnapshot to catch up
      setTimeout(() => {
        recentlySentMsgIds.current.delete(userMsgId);
        recentlySentMsgIds.current.delete(aiMsgId);
      }, 5000);
    }
  };
  
  const handleActionDetail = (item: LocalChatMessage) => {
    if (!item.actionStatus) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const details = item.actionMetadata?.map(m => {
       if (m.type === 'food' && m.data) {
         return `${m.data.name}: ${m.data.calories} kcal (${m.data.protein}g P, ${m.data.carbs}g C, ${m.data.fat}g F)`;
       }
       return m.status || 'Success';
    }).join('\n') || item.actionStatus;

    Alert.alert('Action Details', details);
  };

  const handleCopyMessage = async (message: LocalChatMessage) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Clipboard.setStringAsync(message.content);
      setCopiedMessageId(message.id);
      
      // Reset confirmation icon after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      console.error('[AICoach] Failed to copy:', err);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
    isNearBottom.current = isAtBottom;
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is needed to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', // Bug 11 fix: MediaTypeOptions.Images is deprecated
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const renderMessage = ({ item, index }: { item: LocalChatMessage, index: number }) => {
    const isAi = item.role === 'ai';
    const isLatest = index === messages.length - 1;
    const ts = typeof item.timestamp === 'number' ? item.timestamp : (item.timestamp as any)?.toMillis?.() || Date.now();
    const timeStr = format(ts, 'HH:mm');

    return (
      <Animated.View 
        entering={isAi ? FadeInUp : FadeInDown}
        style={[
          styles.messageWrapper,
          isAi ? styles.aiWrapper : styles.userWrapper
        ]}
      >
        <View style={styles.bubbleRow}>
          {isAi && (
            <View style={[styles.aiAvatar, { backgroundColor: colors.accentLight }]}>
              <HugeiconsIcon icon={ArtificialIntelligence01Icon} size={16} color={colors.accent} />
            </View>
          )}
          
          <LinearGradient
            colors={isAi ? [colors.card, isDark ? '#2D3748' : '#F8F9FA'] : [colors.accent, '#006B3C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.messageBubble,
              isAi ? 
                [styles.aiBubble, { borderColor: isDark ? '#4A5568' : '#E2E8F0' }] : 
                styles.userBubble
            ]}
          >
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.messageImage} />
            )}
            
            {isAi ? (
              item.content ? (
                <FormattedText text={item.content} color={colors.text} />
              ) : (
                <View style={{ height: 24, paddingHorizontal: 4, justifyContent: 'center' }}>
                  <TypingIndicator color={colors.textMuted} />
                </View>
              )
            ) : (
              <Text style={[styles.messageText, { color: '#FFF' }]}>
                {item.content}
              </Text>
            )}
            
            <View style={styles.bubbleFooter}>
              <Text style={[styles.timestamp, isAi ? { color: colors.textMuted } : { color: 'rgba(255,255,255,0.7)' }]}>
                {timeStr}
              </Text>
              {item.actionStatus && (
                <TouchableOpacity 
                  onPress={() => handleActionDetail(item)}
                  style={[styles.actionBadge, isAi ? {} : { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                >
                  <Text style={[styles.actionBadgeText, isAi ? {} : { color: '#FFF' }]}>{item.actionStatus}</Text>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={10} color={isAi ? colors.textMuted : '#FFF'} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.copyBtn, { marginLeft: 8 }]}
                onPress={() => handleCopyMessage(item)}
              >
                <HugeiconsIcon 
                  icon={copiedMessageId === item.id ? CheckmarkCircle02Icon : Note01Icon} 
                  size={14} 
                  color={isAi ? colors.textMuted : 'rgba(255,255,255,0.7)'} 
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {isAi && isLatest && item.quickActions && item.quickActions.length > 0 && (
          <View style={styles.quickActionsContainer}>
            {item.quickActions.map((qa, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.quickActionBtn, { borderColor: colors.accent, backgroundColor: isDark ? 'transparent' : '#FFF' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleSendMessage(qa.message);
                }}
              >
                <Text style={[styles.quickActionLabel, { color: colors.accent }]}>
                  {qa.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {/* Spacer to balance header layout (replaces back button since this is a tab) */}
        <View style={styles.backButton} />

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coach</Text>
          <View style={[styles.modeToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIntelligenceMode('lightning');
              }}
              style={[
                styles.modeBtn, 
                intelligenceMode === 'lightning' && { backgroundColor: colors.accent, ...styles.activeModeShadow }
              ]}
            >
              <HugeiconsIcon icon={FlashIcon} size={13} color={intelligenceMode === 'lightning' ? '#FFF' : colors.textTertiary} />
              <Text style={[styles.modeText, { color: intelligenceMode === 'lightning' ? '#FFF' : colors.textTertiary }]}>Lightning</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIntelligenceMode('pro');
              }}
              style={[
                styles.modeBtn, 
                intelligenceMode === 'pro' && { backgroundColor: colors.accent, ...styles.activeModeShadow }
              ]}
            >
              <HugeiconsIcon icon={SparklesIcon} size={13} color={intelligenceMode === 'pro' ? '#FFF' : colors.textTertiary} />
              <Text style={[styles.modeText, { color: intelligenceMode === 'pro' ? '#FFF' : colors.textTertiary }]}>Elite Pro</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.configBtn, { backgroundColor: isDark ? '#2D3748' : '#FFF' }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsVoiceEnabled(!isVoiceEnabled);
          }}
        >
          <HugeiconsIcon 
            icon={isVoiceEnabled ? VolumeHighIcon : VolumeMute01Icon} 
            size={22} 
            color={isVoiceEnabled ? colors.accent : colors.textMuted} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.configBtn, { backgroundColor: colors.card, marginLeft: 8 }]} onPress={() => router.push('/bio-memory')}>
          <HugeiconsIcon icon={Settings02Icon} size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
      >
        {/* Messages */}
        <View style={{ flex: 1, opacity: isListReady || messages.length === 0 ? 1 : 0 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatContent}
            onScroll={handleScroll}
            onContentSizeChange={() => {
              if (isFirstLoad.current) return; 
              if (isNearBottom.current) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            // performance optimizations
            initialNumToRender={50}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListHeaderComponent={
              <View style={styles.disclaimerBox}>
                <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                  AI can provide inaccurate info. Consult a doctor before starting a new diet or exercise plan.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconBox, { backgroundColor: colors.accentLight }]}>
                  <HugeiconsIcon icon={SparklesIcon} size={40} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Your Elite AI Partner</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Ask me anything about your nutrition, workouts, or performance. I'm learning your habits in real-time.
                </Text>
                
                {intelligenceMode === 'pro' && (
                  <Animated.View entering={FadeInUp} style={[styles.proBadge, { borderColor: colors.accent }]}>
                    <HugeiconsIcon icon={ArtificialIntelligence01Icon} size={12} color={colors.accent} />
                    <Text style={[styles.proBadgeText, { color: colors.accent }]}>Deep Analysis Mode Active</Text>
                  </Animated.View>
                )}
                
                <View style={styles.sparkContainer}>
                  <TouchableOpacity style={[styles.sparkCard, { backgroundColor: isDark ? '#2D3748' : '#FFF' }]} onPress={() => handleSendMessage("📊 Analyze my last 7 days")}>
                    <Text style={styles.sparkText}>📊 Trends Audit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sparkCard, { backgroundColor: isDark ? '#2D3748' : '#FFF' }]} onPress={() => handleSendMessage("🥗 Suggest a high-protein dinner")}>
                    <Text style={styles.sparkText}>🥗 Fast Macros</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sparkCard, { backgroundColor: isDark ? '#2D3748' : '#FFF' }]} onPress={() => handleSendMessage("💧 Remind me about my water goal")}>
                    <Text style={[styles.sparkText, { color: colors.text }]}>💧 Hydration</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
          />
        </View>

        {/* Typing & Error indicators */}
        <View style={styles.typingWrapper}>
          {isTyping && (
            <Animated.View entering={FadeInDown} style={styles.typingOuter}>
              <HugeiconsIcon 
                icon={intelligenceMode === 'pro' ? SparklesIcon : FlashIcon} 
                size={14} 
                color={colors.accent} 
              />
              <Text style={[styles.typingInfo, { color: colors.accent }]}>
                {intelligenceMode === 'pro' ? 'Elite Pro Engine analyzing...' : 'Lightning Engine calculating...'}
              </Text>
            </Animated.View>
          )}
        </View>

        {hasError && !isLoading && lastFailedMessage.current && (
          <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={[styles.errorBar, { backgroundColor: isDark ? '#422121' : '#FFF5F5', borderWidth: 1, borderColor: isDark ? '#C53030' : '#FEC5C5' }]}>
            <TouchableOpacity 
              style={styles.retryBtn} 
              onPress={() => {
                setHasError(false);
                handleSendMessage(lastFailedMessage.current, undefined, true);
              }}
            >
              <Text style={[styles.retryText, { color: '#E53E3E' }]}>⚠️ Message failed — Tap to retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setHasError(false); lastFailedMessage.current = ''; }}
              style={{ paddingHorizontal: 8 }}
            >
              <Text style={{ color: '#E53E3E', fontSize: 16, fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

      {/* Speaking Indicator & Stop Button */}
      {isSpeaking && (
        <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={styles.speakingOverlay}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <View style={styles.speakingContent}>
            <HugeiconsIcon icon={VolumeHighIcon} size={20} color={colors.accent} />
            <Text style={[styles.speakingText, { color: colors.text }]}>AI is speaking...</Text>
            <TouchableOpacity 
              onPress={() => {
                Speech.stop();
                setIsSpeaking(false);
              }}
              style={[styles.stopSpeakingBtn, { backgroundColor: colors.danger + '20' }]}
            >
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Stop</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Input Bar */}
      <BlurView
        intensity={isDark ? 80 : 100}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.footer, { borderTopColor: colors.border, paddingBottom: isKeyboardVisible ? 8 : (60 + 24 + Math.max(insets.bottom - 20, 0)) }]}
      >
          {selectedImage && (
            <Animated.View 
              entering={FadeInDown.springify().damping(15)}
              exiting={FadeOutDown}
              style={styles.imagePreviewContainer}
            >
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 10 }}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} onPress={handlePickImage}>
              <HugeiconsIcon icon={Camera01Icon} size={22} color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.inputSubWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Message your coach..."
                placeholderTextColor={colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              <TouchableOpacity 
                onPress={() => handleSendMessage()}
                disabled={isLoading || (!inputText.trim() && !selectedImage)}
                style={[
                  styles.sendBtn, 
                  { backgroundColor: colors.accent },
                  (isLoading || (!inputText.trim() && !selectedImage)) && { opacity: 0.5 }
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 24, padding: 3 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  modeText: { fontSize: 11, fontWeight: '800' },
  activeModeShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  configBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  chatContent: { padding: 20, paddingBottom: 20 },
  messageWrapper: { marginBottom: 20 },
  aiWrapper: { alignSelf: 'stretch', width: '100%', maxWidth: '100%' },
  userWrapper: { alignSelf: 'flex-end', maxWidth: '85%' },
  messageBubble: { padding: 14, borderRadius: 22, flexShrink: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  aiBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  userBubble: { borderBottomRightRadius: 4 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, width: '100%' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 12, flexWrap: 'wrap' },
  timestamp: { fontSize: 9, fontWeight: '600', opacity: 0.6 },
  messageText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  messageImage: { width: 240, height: 180, borderRadius: 16, marginBottom: 8 },
  disclaimerBox: { padding: 20, alignItems: 'center', opacity: 0.6 },
  disclaimerText: { fontSize: 10, textAlign: 'center', fontStyle: 'italic', lineHeight: 14 },
  actionBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,144,80,0.1)', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6 
  },
  actionBadgeText: { fontSize: 10, color: '#009050', fontWeight: '700' },
  copyBtn: { padding: 4, opacity: 0.8 },
  quickActionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginLeft: 40 },
  quickActionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  quickActionLabel: { fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  emptyTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, opacity: 0.7 },
  footer: { 
    padding: 16, 
    borderTopWidth: 1,
  },
  imagePreviewContainer: { position: 'relative', marginBottom: 12, marginLeft: 8 },
  imagePreview: { width: 56, height: 56, borderRadius: 12 },
  removeImage: { position: 'absolute', top: -6, right: -6, backgroundColor: '#E53E3E', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputSubWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 10,
    gap: 8,
  },
  formattedContainer: { gap: 4 },
  header3: { fontSize: 16, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', gap: 8, paddingLeft: 4, marginBottom: 4 },
  bulletDot: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
  },
  mediaBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  typingWrapper: { height: 32, paddingLeft: 24, justifyContent: 'center', marginBottom: 4 },
  errorBar: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 62, 62, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: { width: '100%', alignItems: 'center', paddingVertical: 6 },
  retryText: { fontSize: 13, fontWeight: '700', letterSpacing: -0.3 },
  typingOuter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typingInfo: { fontSize: 11, fontStyle: 'italic', fontWeight: '500' },
  typingContainer: { flexDirection: 'row', gap: 4, width: 32 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  proBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 16, 
    borderWidth: 1.5, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    backgroundColor: 'rgba(0,144,80,0.05)'
  },
  proBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  sparkContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 40, justifyContent: 'center' },
  sparkCard: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  sparkText: { fontSize: 13, fontWeight: '800' },
  speakingOverlay: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 1000,
  },
  speakingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  speakingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  stopSpeakingBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
});
