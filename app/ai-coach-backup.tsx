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
import * as FileSystem from 'expo-file-system';
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
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import Animated, { 
  FadeInDown, 
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
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import { useTheme } from '../lib/ThemeContext';
import { processMessageStreaming, ProcessedResult } from '../services/chatService';
import { ChatMessage } from '../services/aiService';
import { uploadChatImage } from '../services/chatStorageService';

// Fixed Type for local use
interface LocalChatMessage extends ChatMessage {
  image?: string;
}

// --- High Fidelity Markdown Formatter (Custom) ---
const FormattedText = ({ text, color }: { text: string; color: string }) => {
  if (!text) return null;
  
  // High-performance regex to split by bold (**text**)
  const segments = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <Text style={[styles.messageText, { color }]}>
      {segments.map((segment, i) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return (
            <Text key={i} style={{ fontWeight: '800' }}>
              {segment.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{segment}</Text>;
      })}
    </Text>
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

  const flatListRef = useRef<FlatList>(null);
  const isAutoStarted = useRef(false);
  const isNearBottom = useRef(true);
  const isFirstLoad = useRef(true);
  const lastFailedMessage = useRef<string>('');
  const isStreamingRef = useRef(false);

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
    const q = query(chatRef, orderBy('timestamp', 'asc'), limit(50));

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
      // Don't override local state during active AI streaming to prevent
      // optimistic updates (placeholder messages) from being clobbered
      if (!isStreamingRef.current) {
        setMessages(historyItems);
      }
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

    const todayStr = format(new Date(), 'yyyy-MM-dd');
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

  // --- Voice Lifecycle Cleanup ---
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // --- Keyboard UX Fix ---
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (isNearBottom.current) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    });

    return () => {
      showSubscription.remove();
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

  const handleSendMessage = async (text: string = inputText, imageUri?: string) => {
    // Interrupt current speech if user sends new message
    Speech.stop();
    
    // If no imageUri passed explicitly, check selectedImage state
    const resolvedImageUri = imageUri || selectedImage || undefined;
    
    const messageToSend = text.trim();
    if (!messageToSend && !resolvedImageUri) return;
    if (!user || !userData) return;
    
    // Store for retry in case of failure
    lastFailedMessage.current = messageToSend;

    // --- Adaptive IQ Logic ---
    let currentIntelligence = intelligenceMode;
    if (currentIntelligence === 'lightning' && detectComplexity(messageToSend)) {
      currentIntelligence = 'pro';
      setIntelligenceMode('pro');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // We don't need to await the history fetch here because processMessageStreaming
      // will be called with the updated mode and we pass historicalLogs directly.
      // However, we should fetch immediately if logs are empty.
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
      }
    }

    const userMsg: LocalChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: Date.now(),
      image: resolvedImageUri || undefined,
    };

    setMessages(prev => [...prev, userMsg]);
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
    try {
      await addDoc(collection(db, 'users', user.id, 'chat_history'), {
        role: 'user',
        content: messageToSend,
        timestamp: serverTimestamp(),
        image: cloudImageUrl || resolvedImageUri || null
      });
    } catch (err) {
      console.error('[AICoach] User msg save failed:', err);
    }

    // 2. Call AI and Stream
    try {
      const result = await processMessageStreaming(
        messageToSend,
        { ...userData, ...liveContext, todayLogs, historicalLogs, weeklySummary },
        messages,
        (chunk) => {
          accumulatedText += chunk;
          setMessages(prev => prev.map(m => 
            m.id === aiMsgId ? { ...m, content: accumulatedText } : m
          ));
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
          quickActions: result.aiMessage.quickActions 
        } : m
      ));

      // 3. Save AI Response to Firestore
      await addDoc(collection(db, 'users', user.id, 'chat_history'), {
        role: 'ai',
        content: result.aiMessage.content || accumulatedText,
        timestamp: serverTimestamp(),
        actionStatus: result.aiMessage.actionStatus,
        quickActions: result.aiMessage.quickActions
      });
      
      if (isVoiceEnabled) {
        Speech.speak(result.aiMessage.content || accumulatedText, { pitch: 1.0, rate: 0.9 });
      }

    } catch (error) {
      console.error('[AICoach] Chat error:', error);
      setHasError(true);
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      isStreamingRef.current = false;
    }
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
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
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
          
          <View style={[
            styles.messageBubble,
            isAi ? 
              [styles.aiBubble, { backgroundColor: isDark ? '#2D3748' : '#FFF', borderColor: isDark ? '#4A5568' : '#E2E8F0' }] : 
              [styles.userBubble, { backgroundColor: colors.accent }]
          ]}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.messageImage} />
            )}
            
            {isAi ? (
              <FormattedText text={item.content} color={colors.text} />
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
                <View style={[styles.actionBadge, isAi ? {} : { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.actionBadgeText, isAi ? {} : { color: '#FFF' }]}>{item.actionStatus}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.copyBtn, isAi ? { marginLeft: 8 } : { marginLeft: 8 }]}
                onPress={() => handleCopyMessage(item)}
              >
                <HugeiconsIcon 
                  icon={copiedMessageId === item.id ? CheckmarkCircle02Icon : Note01Icon} 
                  size={14} 
                  color={isAi ? colors.textMuted : 'rgba(255,255,255,0.7)'} 
                />
              </TouchableOpacity>
            </View>
          </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.card }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coach</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIntelligenceMode('lightning');
              }}
              style={[
                styles.modeBtn, 
                intelligenceMode === 'lightning' && { backgroundColor: `${colors.accent}15` }
              ]}
            >
              <HugeiconsIcon icon={FlashIcon} size={14} color={intelligenceMode === 'lightning' ? colors.accent : colors.textMuted} />
              <Text style={[styles.modeText, { color: intelligenceMode === 'lightning' ? colors.accent : colors.textMuted }]}>Lightning</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIntelligenceMode('pro');
              }}
              style={[
                styles.modeBtn, 
                intelligenceMode === 'pro' && { backgroundColor: `${colors.accent}15` }
              ]}
            >
              <HugeiconsIcon icon={ArtificialIntelligence01Icon} size={14} color={intelligenceMode === 'pro' ? colors.accent : colors.textMuted} />
              <Text style={[styles.modeText, { color: intelligenceMode === 'pro' ? colors.accent : colors.textMuted }]}>Pro</Text>
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
          initialNumToRender={50} // Render more initially to ensure the bottom is reachable
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
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

      {/* Footer / Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.typingWrapper}>
          {isTyping && (
            <View style={styles.typingOuter}>
              <TypingIndicator color={colors.accent} />
              <Text style={[styles.typingInfo, { color: colors.textMuted }]}>
                {intelligenceMode === 'pro' ? 'Elite Pro Engine analyzing history...' : 'Lightning Engine calculating...'}
              </Text>
            </View>
          )}
        </View>

        {hasError && !isLoading && (
          <Animated.View entering={FadeInUp} style={[styles.errorBar, { backgroundColor: isDark ? '#422121' : '#FFF5F5' }]}>
            <TouchableOpacity 
              style={styles.retryBtn} 
              onPress={() => {
                setHasError(false);
                handleSendMessage(lastFailedMessage.current);
              }}
            >
              <Text style={[styles.retryText, { color: '#E53E3E' }]}>⚠️ Analysis failed. Tap to retry now.</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.mediaBtn} onPress={handlePickImage}>
              <HugeiconsIcon icon={Camera01Icon} size={24} color={colors.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Message your coach..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <TouchableOpacity 
              style={[
                styles.sendBtn, 
                { backgroundColor: inputText.trim() || selectedImage ? colors.accent : colors.border }
              ]}
              onPress={() => handleSendMessage(inputText, selectedImage || undefined)}
              disabled={isLoading || (!inputText.trim() && !selectedImage)}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  headerTitle: { fontSize: 16, fontWeight: '800' },
  modeToggle: { flexDirection: 'row', marginTop: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20, padding: 2 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 18 },
  modeText: { fontSize: 10, fontWeight: '700' },
  configBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  chatContent: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 100 },
  messageWrapper: { marginBottom: 20 },
  aiWrapper: { alignSelf: 'stretch', width: '100%', maxWidth: '100%' },
  userWrapper: { alignSelf: 'flex-end', maxWidth: '85%' },
  messageBubble: { padding: 14, borderRadius: 18, flexShrink: 1 },
  aiBubble: { borderBottomLeftRadius: 4, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, flex: 1 },
  userBubble: { borderBottomRightRadius: 4 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, width: '100%' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 12, flexWrap: 'wrap' },
  timestamp: { fontSize: 9, fontWeight: '600' },
  messageText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  messageImage: { width: 240, height: 180, borderRadius: 12, marginBottom: 8 },
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
  copyBtn: {
    padding: 2,
  },
  quickActionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginLeft: 36 },
  quickActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  quickActionLabel: { fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  footer: { padding: 12, paddingBottom: Platform.OS === 'ios' ? 12 : 12, borderTopWidth: 1 },
  imagePreviewContainer: { position: 'relative', marginBottom: 12, marginLeft: 12 },
  imagePreview: { width: 60, height: 60, borderRadius: 12 },
  removeImage: { position: 'absolute', top: -5, right: -5, backgroundColor: '#E53E3E', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mediaBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, maxHeight: 100, fontSize: 15, fontWeight: '500', paddingVertical: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  typingWrapper: { height: 28, paddingLeft: 20, justifyContent: 'center' },
  errorBar: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 62, 62, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: { width: '100%', alignItems: 'center', paddingVertical: 4 },
  retryText: { fontSize: 13, fontWeight: '700', letterSpacing: -0.3 },
  typingOuter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingInfo: { fontSize: 11, fontStyle: 'italic' },
  typingContainer: { flexDirection: 'row', gap: 4, width: 30 },
  typingDot: { width: 5, height: 5, borderRadius: 2.5 },
  proBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 12, 
    borderWidth: 1, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 20 
  },
  proBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sparkContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 30, justifyContent: 'center' },
  sparkCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sparkText: { fontSize: 12, fontWeight: '700' },
});
