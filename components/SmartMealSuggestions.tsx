import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Add01Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';
import { FrequentMeal } from '../services/mealService';

interface SmartMealSuggestionsProps {
  meals: FrequentMeal[];
  onLogMeal: (meal: FrequentMeal) => Promise<void>;
  isLogging: boolean;
  loggedMealName?: string;
  title?: string;
  subtitle?: string;
}

export const SmartMealSuggestions: React.FC<SmartMealSuggestionsProps> = ({
  meals,
  onLogMeal,
  isLogging,
  loggedMealName,
  title = "Smart Suggestions",
  subtitle = "Frequently eaten meals",
}) => {
  const { colors, isDark } = useTheme();

  if (meals.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <HugeiconsIcon icon={SparklesIcon} size={16} color={colors.accent} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {meals.map((meal, index) => {
          const isThisMealLogging = isLogging && loggedMealName === meal.name;

          return (
            <Animated.View
              key={meal.name}
              entering={FadeInRight.delay(index * 100).duration(400)}
            >
              <TouchableOpacity
                style={[
                  styles.mealChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
                disabled={isLogging}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onLogMeal(meal);
                }}
              >
                <View style={styles.mealInfo}>
                  <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <Text style={[styles.mealCals, { color: colors.textMuted }]}>
                    {Math.round(meal.calories)} kcal
                  </Text>
                </View>
                
                <View style={[styles.plusButton, { backgroundColor: colors.accentLight }]}>
                  {isThisMealLogging ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <HugeiconsIcon icon={Add01Icon} size={14} color={colors.accent} />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mealInfo: {
    marginRight: 12,
    flexShrink: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  mealCals: {
    fontSize: 12,
    fontWeight: '600',
  },
  plusButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
