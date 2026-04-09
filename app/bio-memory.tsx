import { 
  ArrowLeft02Icon, 
  ArtificialIntelligence05Icon,
  Add01Icon,
  Cancel01Icon,
  NoteIcon,
  FireIcon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  UserEdit01Icon,
  Settings01Icon,
  ActivityIcon,
  ChefHatIcon,
  Clock01Icon
} from '@hugeicons/core-free-icons';
import { getMemory, updateMemory, UserMemory } from '../services/memoryService';
import * as Haptics from 'expo-haptics';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/ThemeContext";

export default function BioMemory() {
  const { user } = useUser();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [isMemoryLoading, setIsMemoryLoading] = useState(true);
  const [isEditingField, setIsEditingField] = useState<keyof UserMemory | null>(null);
  const [newTagValue, setNewTagValue] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchMemory = async () => {
      try {
        const data = await getMemory(user.id);
        setMemory(data);
      } finally {
        setIsMemoryLoading(false);
      }
    };
    fetchMemory();
  }, [user]);

  const handleUpdateMemory = async (field: keyof UserMemory, value: any) => {
    if (!user || !memory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await updateMemory(user.id, { [field]: value });
    setMemory(updated);
  };

  const addTag = async (field: keyof UserMemory) => {
    if (!newTagValue.trim() || !memory) return;
    const currentList = memory[field] as string[];
    if (!currentList.includes(newTagValue.trim().toLowerCase())) {
      const newList = [...currentList, newTagValue.trim().toLowerCase()];
      await handleUpdateMemory(field, newList);
    }
    setNewTagValue('');
    setIsEditingField(null);
  };

  const removeTag = async (field: keyof UserMemory, tag: string) => {
    if (!memory) return;
    const currentList = memory[field] as string[];
    const newList = currentList.filter(t => t !== tag);
    await handleUpdateMemory(field, newList);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.cardAlt }]}>
          <HugeiconsIcon icon={ArrowLeft02Icon} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bio-Memory</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <HugeiconsIcon icon={ArtificialIntelligence05Icon} size={24} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Life-Sync Database</Text>
        </View>

        <View style={[styles.memoryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.memoryCardDesc, { color: colors.textTertiary }]}>
            These are the biological and lifestyle variables your Proactive AI Coach uses to tailor its advice.
          </Text>

          {isMemoryLoading ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} />
          ) : memory ? (
            <>
              {/* SECTION 1: MEDICAL & DIETARY */}
              <View style={styles.groupContainer}>
                <View style={styles.groupHeader}>
                  <HugeiconsIcon icon={NoteIcon} size={18} color={colors.accent} />
                  <Text style={[styles.groupTitle, { color: colors.text }]}>Medical & Dietary</Text>
                </View>

                {/* Diet Preference */}
                <View style={styles.memoryItem}>
                  <Text style={[styles.memoryLabel, { color: colors.textSecondary }]}>DIETARY PREFERENCE</Text>
                  <View style={styles.dietRow}>
                    {['vegan', 'vegetarian', 'keto', 'paleo', 'none'].map((diet) => (
                      <TouchableOpacity
                        key={diet}
                        style={[
                          styles.dietBadge,
                          { backgroundColor: colors.cardAlt },
                          memory.diet_preference === diet && { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }
                        ]}
                        onPress={() => handleUpdateMemory('diet_preference', diet)}
                      >
                        <Text style={[
                          styles.dietText,
                          { color: colors.textTertiary },
                          memory.diet_preference === diet && { color: colors.accent, fontWeight: '700' }
                        ]}>
                          {diet.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* List-based: Allergies, Conditions, Dislikes */}
                {( [
                    { field: 'allergies', label: 'ALLERGIES' },
                    { field: 'conditions', label: 'HEALTH CONDITIONS' },
                    { field: 'disliked_foods', label: 'FOOD DISLIKES' }
                  ] as const).map(({ field, label }) => (
                  <View key={field} style={styles.memoryItem}>
                    <View style={styles.memoryItemHeader}>
                      <Text style={[styles.memoryLabel, { color: colors.textSecondary }]}>{label}</Text>
                      <TouchableOpacity onPress={() => setIsEditingField(field)}>
                        <HugeiconsIcon icon={Add01Icon} size={18} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.tagContainer}>
                      {(memory[field] as string[]).map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                          <Text style={[styles.tagText, { color: colors.text }]}>{tag}</Text>
                          <TouchableOpacity onPress={() => removeTag(field, tag)}>
                            <HugeiconsIcon icon={Cancel01Icon} size={12} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {(memory[field] as string[]).length === 0 && !isEditingField && (
                        <Text style={[styles.emptyTagText, { color: colors.textMuted }]}>None detected...</Text>
                      )}
                    </View>
                    {isEditingField === field && (
                      <View style={[styles.addTagInput, { borderColor: colors.accent }]}>
                        <TextInput
                          autoFocus
                          style={{ flex: 1, color: colors.text, padding: 8 }}
                          placeholder={`Add...`}
                          placeholderTextColor={colors.textMuted}
                          value={newTagValue}
                          onChangeText={setNewTagValue}
                          onSubmitEditing={() => addTag(field)}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* SECTION 2: LIFESTYLE & TIMING */}
              <View style={[styles.groupContainer, { marginTop: 24 }]}>
                <View style={styles.groupHeader}>
                  <HugeiconsIcon icon={ActivityIcon} size={18} color={colors.accent} />
                  <Text style={[styles.groupTitle, { color: colors.text }]}>Lifestyle & Timing</Text>
                </View>

                {/* Complexity Preference */}
                <View style={[styles.memoryItem, { marginBottom: 24 }]}>
                  <Text style={[styles.memoryLabel, { color: colors.textSecondary }]}>MEAL COMPLEXITY</Text>
                  <View style={styles.dietRow}>
                    {['Quick/Easy', 'Gourmet', 'Takeout-heavy'].map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.dietBadge,
                          { backgroundColor: colors.cardAlt },
                          memory.complexity_pref === opt && { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }
                        ]}
                        onPress={() => handleUpdateMemory('complexity_pref', opt)}
                      >
                        <Text style={[
                          styles.dietText,
                          { color: colors.textTertiary },
                          memory.complexity_pref === opt && { color: colors.accent, fontWeight: '700' }
                        ]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* List-based: Habits, Weak Points */}
                {( [
                    { field: 'habits', label: 'DAILY HABITS' },
                    { field: 'weak_points', label: 'CRAVINGS & TRIGGERS' }
                  ] as const).map(({ field, label }) => (
                  <View key={field} style={styles.memoryItem}>
                    <View style={styles.memoryItemHeader}>
                      <Text style={[styles.memoryLabel, { color: colors.textSecondary }]}>{label}</Text>
                      <TouchableOpacity onPress={() => setIsEditingField(field)}>
                        <HugeiconsIcon icon={Add01Icon} size={18} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.tagContainer}>
                      {(memory[field] as string[]).map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                          <Text style={[styles.tagText, { color: colors.text }]}>{tag}</Text>
                          <TouchableOpacity onPress={() => removeTag(field, tag)}>
                            <HugeiconsIcon icon={Cancel01Icon} size={12} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    {isEditingField === field && (
                      <View style={[styles.addTagInput, { borderColor: colors.accent }]}>
                        <TextInput
                          autoFocus
                          style={{ flex: 1, color: colors.text, padding: 8 }}
                          placeholder={`Add...`}
                          placeholderTextColor={colors.textMuted}
                          value={newTagValue}
                          onChangeText={setNewTagValue}
                          onSubmitEditing={() => addTag(field)}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* SECTION 3: COACHING STYLE */}
              <View style={[styles.groupContainer, { marginTop: 24 }]}>
                <View style={styles.groupHeader}>
                  <HugeiconsIcon icon={UserEdit01Icon} size={18} color={colors.accent} />
                  <Text style={[styles.groupTitle, { color: colors.text }]}>Coaching Personality</Text>
                </View>

                <View style={styles.memoryItem}>
                  <Text style={[styles.memoryLabel, { color: colors.textSecondary }]}>PREFERRED TONE</Text>
                  <View style={styles.dietRow}>
                    {['Strict', 'Supportive', 'Scientific', 'Direct'].map((tone) => (
                      <TouchableOpacity
                        key={tone}
                        style={[
                          styles.dietBadge,
                          { backgroundColor: colors.cardAlt },
                          memory.personality_pref === tone && { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }
                        ]}
                        onPress={() => handleUpdateMemory('personality_pref', tone)}
                      >
                        <Text style={[
                          styles.dietText,
                          { color: colors.textTertiary },
                          memory.personality_pref === tone && { color: colors.accent, fontWeight: '700' }
                        ]}>
                          {tone}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.fieldDesc, { color: colors.textMuted }]}>
                    The AI will adjust how it speaks to you based on this choice.
                  </Text>
                </View>
              </View>

              {/* SECTION 4: AI OBSERVATIONS */}
              {memory.unstructured_bio ? (
                <View style={[styles.groupContainer, { marginTop: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }]}>
                  <View style={styles.groupHeader}>
                    <HugeiconsIcon icon={ArtificialIntelligence05Icon} size={18} color={colors.accent} />
                    <Text style={[styles.groupTitle, { color: colors.text }]}>AI Reflections</Text>
                  </View>
                  <Text style={[styles.unstructuredText, { color: colors.textTertiary }]}>
                    "{memory.unstructured_bio}"
                  </Text>
                  <Text style={[styles.fieldDesc, { color: colors.textMuted }]}>
                    These are private observations the AI has synthesized from your past conversations.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  memoryCard: {
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  memoryCardDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  memoryItem: {
    marginBottom: 20,
  },
  memoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  memoryLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dietRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  dietBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dietText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyTagText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  addTagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderRadius: 16,
    paddingRight: 12,
  },
  groupContainer: {
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  fieldDesc: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
  },
  unstructuredText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  }
});
