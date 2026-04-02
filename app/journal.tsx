import { useUser } from '@clerk/expo';
import { AngryIcon, ArrowLeft01Icon, NeutralIcon, Sad01Icon, SaveIcon, SmileIcon, StarsIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../lib/firebase';
import { useTheme } from '../lib/ThemeContext';

export default function JournalScreen() {
  const MOODS = [
    { id: 'excited', icon: StarsIcon, label: 'Excited', color: '#F6E05E' },
    { id: 'happy', icon: SmileIcon, label: 'Happy', color: '#68D391' },
    { id: 'neutral', icon: NeutralIcon, label: 'Neutral', color: '#A0AEC0' },
    { id: 'sad', icon: Sad01Icon, label: 'Sad', color: '#63B3ED' },
    { id: 'angry', icon: AngryIcon, label: 'Angry', color: '#FC8181' },
  ];

  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useTheme();
  const { date: paramDate } = useLocalSearchParams<{ date?: string }>();

  const today = paramDate || format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(today), 'EEEE, MMMM do');

  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchJournal = async () => {
      try {
        const journalRef = doc(db, 'journals', `${user.id}_${today}`);
        const journalSnap = await getDoc(journalRef);

        if (journalSnap.exists()) {
          const data = journalSnap.data();
          setContent(data.content || '');
          setSelectedMood(data.mood || null);
        }
      } catch (error) {
        console.error("Error fetching journal:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJournal();
  }, [user, today]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const journalRef = doc(db, 'journals', `${user.id}_${today}`);
      await setDoc(journalRef, {
        userId: user.id,
        date: today,
        content: content.trim(),
        mood: selectedMood,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      router.back();
    } catch (error) {
      console.error("Error saving journal:", error);
      Alert.alert("Error", "Could not save your journal entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.card }]}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Journal</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>{displayDate}</Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.iconButton, { backgroundColor: colors.accent }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <HugeiconsIcon icon={SaveIcon} size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>HOW ARE YOU FEELING?</Text>
          <View style={styles.moodContainer}>
            {(MOODS || []).map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodItem,
                    isSelected && { backgroundColor: isDark ? `${mood.color}30` : `${mood.color}15`, borderColor: mood.color }
                  ]}
                  onPress={() => setSelectedMood(mood.id)}
                >
                  <View style={[
                    styles.moodIconContainer,
                    { backgroundColor: isSelected ? mood.color : (isDark ? '#2D3748' : '#F7FAFC') }
                  ]}>
                    <HugeiconsIcon
                      icon={mood.icon}
                      size={28}
                      color={isSelected ? '#FFF' : colors.textTertiary}
                    />
                  </View>
                  <Text style={[
                    styles.moodLabel,
                    { color: isSelected ? colors.text : colors.textTertiary },
                    isSelected && { fontWeight: '700' }
                  ]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 32 }]}>WHAT'S ON YOUR MIND?</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Write about your day, your wins, or anything else..."
              placeholderTextColor={colors.textTertiary}
              multiline
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
              autoFocus={content.length === 0}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 16,
    marginLeft: 4,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodItem: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    flex: 1,
  },
  moodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    height: '100%',
  },
});
