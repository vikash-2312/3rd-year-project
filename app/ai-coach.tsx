/**
 * ai-coach.tsx
 *
 * Premium AI Fitness Coach chat screen.
 * Features: smart formatted bubbles, contextual quick-action buttons,
 * animated typing indicator, action badges, and suggested prompts.
 */

import {
  ArrowLeft01Icon,
  SentIcon,
  SparklesIcon,
  Delete02Icon,
  PencilEdit02Icon,
  Camera01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { FadeInRight, FadeInLeft, Layout } from 'react-native-reanimated';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/ThemeContext';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from '../services/aiService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Suggested Prompts (shown in empty state) ---
const SUGGESTED_PROMPTS = [
  { text: "How are my macros? 📊", icon: "📊" },
  { text: "Suggest a meal 🍽️", icon: "🍽️" },
  { text: "Fix my protein 💪", icon: "💪" },
  { text: "Generate meal plan 📋", icon: "📋" },
  { text: "Set calorie goal 🎯", icon: "🎯" },
  { text: "Water status 💧", icon: "💧" },
];

// --- Typing Indicator Component ---
function TypingIndicator({ colors }: { colors: any }) {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: RNAnimated.Value, delay: number) => {
      return RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          RNAnimated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  const dotStyle = (anim: RNAnimated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={[styles.typingRow]}>
      <View style={[styles.aiAvatar, { backgroundColor: colors.accentLight }]}>
        <HugeiconsIcon icon={SparklesIcon} size={14} color={colors.accent} />
      </View>
      <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <RNAnimated.View style={[styles.dot, { backgroundColor: colors.accent }, dotStyle(dot1)]} />
        <RNAnimated.View style={[styles.dot, { backgroundColor: colors.accent }, dotStyle(dot2)]} />
        <RNAnimated.View style={[styles.dot, { backgroundColor: colors.accent }, dotStyle(dot3)]} />
      </View>
    </View>
  );
}

// --- Smart Text Formatter ---
// Renders AI response text with proper formatting: bold sections, bullet points, spacing
function FormattedText({ text, color }: { text: string; color: string }) {
  const lines = text.split('\n');

  const renderContent = (content: string, isHeader = false) => {
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={{ fontWeight: '800', ...(isHeader && { fontSize: 18 }) }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return (
          <Text key={index} style={{ fontStyle: 'italic', ...(isHeader && { fontSize: 18 }) }}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return <Text key={index} style={isHeader ? { fontSize: 18 } : {}}>{part}</Text>;
    });
  };

  return (
    <View>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={i} style={{ height: 12 }} />;

        // Header detection
        let isHeader = false;
        let headerPrefixLength = 0;
        if (trimmed.startsWith('### ')) { isHeader = true; headerPrefixLength = 4; }
        else if (trimmed.startsWith('## ')) { isHeader = true; headerPrefixLength = 3; }
        else if (trimmed.startsWith('# ')) { isHeader = true; headerPrefixLength = 2; }

        // Heading lines (start with emoji + text, like "👉 Quick fixes:")
        const isHeading = /^[👉💧⚡🔥💪🎯⚠️📋🌅🌞🌙🍎✅]/.test(trimmed) || isHeader;
        // Bullet points
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');

        if (isBullet) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color }]}>•</Text>
              <Text style={[styles.bulletText, { color }]}>
                {renderContent(trimmed.replace(/^[•\-]\s*/, '').replace(/^\*\s*/, ''))}
              </Text>
            </View>
          );
        }

        const rawText = isHeader ? trimmed.substring(headerPrefixLength) : trimmed;

        return (
          <Text
            key={i}
            style={[
              styles.messageText,
              { color },
              isHeading && styles.messageHeading,
              isHeader && { fontSize: 18, marginBottom: 4 }
            ]}>
            {renderContent(rawText, isHeader)}
          </Text>
        );
      })}
    </View>
  );
}

// --- Quick Action Buttons ---
function QuickActionButtons({
  actions,
  onPress,
  colors,
  isDark,
}: {
  actions: { label: string; message: string }[];
  onPress: (message: string) => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={styles.quickActionsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsScroll}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.quickActionBtn,
              {
                backgroundColor: isDark ? colors.cardAlt : '#FFFFFF',
                borderColor: isDark ? colors.border : colors.accent + '20',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => onPress(action.message)}>
            <Text
              style={[
                styles.quickActionText,
                { color: colors.accent },
              ]}
              numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// --- Message Bubble ---
function MessageBubble({
  message,
  colors,
  isDark,
  onQuickAction,
  isLastAI,
  onEdit,
}: {
  message: ChatMessage;
  colors: any;
  isDark: boolean;
  onQuickAction: (msg: string) => void;
  isLastAI: boolean;
  onEdit: (text: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <Reanimated.View 
      entering={(isUser ? FadeInRight : FadeInLeft).springify()}
      layout={Layout.springify()}
      style={styles.messageGroup}>
      <View
        style={[
          styles.bubbleRow,
          isUser ? styles.bubbleRowUser : styles.bubbleRowAI,
        ]}>
        {/* AI Avatar */}
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: colors.accentLight }]}>
            <HugeiconsIcon icon={SparklesIcon} size={14} color={colors.accent} />
          </View>
        )}

        <View style={{ maxWidth: SCREEN_WIDTH * 0.76 }}>
          {/* Bubble */}
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.userBubble, { backgroundColor: colors.accent }]
                : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }],
            ]}>
            {message.imageUri && (
               <Image source={{ uri: message.imageUri }} style={styles.bubbleImage} />
            )}
            {isUser ? (
              <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
                {message.content}
              </Text>
            ) : (
              <FormattedText text={message.content} color={colors.text} />
            )}
          </View>

          {/* Action Status Badge */}
          {message.actionStatus && (
            <View
              style={[
                styles.actionBadge,
                {
                  backgroundColor: isDark ? 'rgba(56,161,105,0.12)' : '#F0FFF4',
                  borderColor: isDark ? 'rgba(56,161,105,0.25)' : '#C6F6D5',
                },
              ]}>
              <Text style={[styles.actionBadgeText, { color: colors.accent }]}>
                {message.actionStatus}
              </Text>
            </View>
          )}

          {/* Timestamp & User Actions */}
          <View style={[styles.timestampRow, isUser && { justifyContent: 'flex-end' }]}>
            <Text
              style={[
                styles.timestamp,
                isUser ? styles.timestampUser : styles.timestampAI,
                { color: colors.textMuted },
              ]}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            {isUser && (
              <View style={styles.userActions}>
                <TouchableOpacity
                  onPress={() => onEdit(message.content)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <HugeiconsIcon icon={PencilEdit02Icon} size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Quick Action Buttons (only on the last AI message) */}
      {!isUser && isLastAI && message.quickActions && message.quickActions.length > 0 && (
        <QuickActionButtons
          actions={message.quickActions}
          onPress={onQuickAction}
          colors={colors}
          isDark={isDark}
        />
      )}
    </Reanimated.View>
  );
}

// --- Main Screen ---
export default function AICoachScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const [inputText, setInputText] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const handlePickImage = async () => {
    Alert.alert(
      "Attach Photo",
      "Choose a source",
      [
        {
          text: "Camera 📸",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera access is required to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets[0]) {
              setSelectedImageUri(result.assets[0].uri);
              setSelectedImageBase64(result.assets[0].base64 || null);
            }
          }
        },
        {
          text: "Gallery 🖼️",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets[0]) {
              setSelectedImageUri(result.assets[0].uri);
              setSelectedImageBase64(result.assets[0].base64 || null);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleSend = useCallback(() => {
    if ((!inputText.trim() && !selectedImageBase64) || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(inputText, selectedImageUri || undefined, selectedImageBase64 || undefined);
    setInputText('');
    setSelectedImageUri(null);
    setSelectedImageBase64(null);
    Keyboard.dismiss();
  }, [inputText, isLoading, sendMessage, selectedImageUri, selectedImageBase64]);

  const handleQuickAction = useCallback(
    (message: string) => {
      if (isLoading) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendMessage(message);
    },
    [isLoading, sendMessage],
  );

  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear Chat',
      'This will delete your conversation history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearChat();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [clearChat]);

  // Find latest AI message in inverted list (index 0 is bottom)
  const lastAIIndex = [...messages].reverse().findIndex(m => m.role === 'ai');

  // --- Empty State ---
  const renderEmptyState = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={isDark ? ['#1A202C', '#2D3748'] : ['#F0FFF4', '#E6FFFA']}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: isDark ? colors.accentLight : '#E6FFFA' },
          ]}>
          <HugeiconsIcon icon={SparklesIcon} size={40} color={colors.accent} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Your AI Coach
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
          I analyze your data and give real advice — not just numbers. Try me out!
        </Text>

        <View style={styles.suggestedGrid}>
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.suggestedChip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => handleQuickAction(prompt.text)}>
              <Text
                style={[styles.suggestedChipText, { color: colors.textSecondary }]}
                numberOfLines={1}>
                {prompt.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );

  // --- Render ---
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: colors.cardAlt }]}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatarSmall, { backgroundColor: colors.accentLight }]}>
            <HugeiconsIcon icon={SparklesIcon} size={14} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coach</Text>
            <Text style={[styles.headerStatus, { color: colors.accent }]}>Online</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleClearChat}
          style={[styles.headerBtn, { backgroundColor: colors.cardAlt }]}
          disabled={messages.length === 0}>
          <HugeiconsIcon
            icon={Delete02Icon}
            size={20}
            color={messages.length === 0 ? colors.textMuted : colors.danger}
          />
        </TouchableOpacity>
      </View>

      {/* Chat Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {messages.length === 0 && !isLoading ? (
          renderEmptyState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            keyExtractor={(_, i) => i.toString()}
            inverted
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                colors={colors}
                isDark={isDark}
                onQuickAction={handleQuickAction}
                isLastAI={index === lastAIIndex}
                onEdit={(text) => {
                  setInputText(text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              />
            )}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={
              isLoading ? <TypingIndicator colors={colors} /> : null
            }
          />
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputArea,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}>
          
          {selectedImageUri && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.imagePreviewClose}
                onPress={() => {
                  setSelectedImageUri(null);
                  setSelectedImageBase64(null);
                }}>
                <HugeiconsIcon icon={Cancel01Icon} size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputAreaRow}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}>
              <TouchableOpacity onPress={handlePickImage} style={styles.cameraBtn}>
                <HugeiconsIcon icon={Camera01Icon} size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <TextInput
                style={[styles.textInput, { color: colors.text, flex: 1, paddingTop: 12 }]}
                placeholder="Ask or log food..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
              onSubmitEditing={handleSend}
              blurOnSubmit
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  (inputText.trim() || selectedImageUri) && !isLoading
                    ? colors.accent
                    : isDark
                    ? colors.cardAlt
                    : '#EDF2F7',
              },
            ]}
            onPress={handleSend}
            disabled={(!inputText.trim() && !selectedImageUri) || isLoading}
            activeOpacity={0.7}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <HugeiconsIcon
                icon={SentIcon}
                size={20}
                color={(inputText.trim() || selectedImageUri) ? '#FFFFFF' : colors.textMuted}
              />
            )}
          </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bubbleImage: {
    width: 220,
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  imagePreviewContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePreviewClose: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 2,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  inputAreaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  cameraBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerStatus: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Chat List
  chatList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Message Group (bubble + quick actions)
  messageGroup: {
    marginBottom: 16,
  },

  // Bubble Row
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAI: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 18,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },

  // Smart Text Formatting
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageHeading: {
    fontWeight: '700',
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
    marginVertical: 2,
  },
  bulletDot: {
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
    fontWeight: '600',
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },

  // Action Badge
  actionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Timestamp
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  timestampUser: {
    textAlign: 'right',
  },
  timestampAI: {
    textAlign: 'left',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  actionIconBtn: {
    opacity: 0.7,
  },

  // Quick Action Buttons
  quickActionsContainer: {
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 36,
  },
  quickActionsScroll: {
    gap: 10,
    paddingRight: 20,
    paddingBottom: 4,
  },
  quickActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Typing Indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  // Input Area
  inputArea: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 80,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  suggestedChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestedChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
