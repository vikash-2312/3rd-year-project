import { Activity01Icon, FireIcon, Timer02Icon, OrganicFoodIcon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';

type ActivityItem = {
  id: string;
  type: 'food' | 'exercise' | 'water';
  name: string;
  calories: number;
  time: string;
  intensity?: string;
  duration?: string;
  description?: string;
  serving?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  brand?: string;
};

type RecentActivityProps = {
  activities?: ActivityItem[];
  onDelete?: (id: string, name: string) => void;
  isToday?: boolean;
};

export const RecentActivity = React.memo(({ activities = [], onDelete, isToday = false }: RecentActivityProps) => {
  const isEmpty = activities.length === 0;
  const { colors, isDark } = useTheme();

  const getExerciseIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('run') || n.includes('cardio')) return 'fitness';
    if (n.includes('lift') || n.includes('gym') || n.includes('weight')) return 'barbell';
    return 'flash';
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
      </View>

      {isEmpty ? (
        <View style={[styles.emptyStateCard, { backgroundColor: colors.card }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.cardAlt }]}>
            <HugeiconsIcon icon={Activity01Icon} size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No activities logged yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Tap the + button to log your first meal or workout for the day!
          </Text>
        </View>
      ) : (
        (activities || []).filter(activity => activity && activity.type !== 'water').map((activity) => {
            if (activity.type === 'exercise') {
            return (
              <View key={activity.id} style={[styles.exerciseCard, { backgroundColor: colors.card }]}>
                <View style={styles.exerciseHeader}>
                  <View style={[styles.exerciseIconContainer, { backgroundColor: colors.accentLight }]}>
                    <Ionicons name={getExerciseIcon(activity.name)} size={32} color={colors.accent} />
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, { color: colors.text }]}>{activity.name}</Text>
                    <View style={styles.exerciseStats}>
                      <View style={styles.calorieRow}>
                        <HugeiconsIcon icon={FireIcon} size={14} color={colors.danger} />
                        <Text style={[styles.exerciseCalories, { color: colors.danger }]}>{activity.calories} kcal</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>{activity.intensity} Intensity</Text>
                        <View style={[styles.dot, { backgroundColor: colors.border }]} />
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>{activity.duration} min</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.rightContent}>
                    <Text style={[styles.logTime, { color: colors.textMuted }]}>{activity.time}</Text>
                    {isToday && (
                      <TouchableOpacity 
                        onPress={() => onDelete?.(activity.id, activity.name)}
                        style={styles.deleteButton}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }

          if (activity.type === 'food') {
            return (
              <View key={activity.id} style={[styles.foodCard, { backgroundColor: colors.card }]}>
                <View style={styles.foodHeader}>
                  <View style={[styles.foodIconContainer, { backgroundColor: colors.accentLight }]}>
                    <HugeiconsIcon icon={OrganicFoodIcon} size={30} color={colors.accent} />
                  </View>
                  <View style={styles.foodInfo}>
                    <Text style={[styles.foodName, { color: colors.text }]} numberOfLines={1}>{activity.name}</Text>
                    <View style={styles.foodStats}>
                      <View style={styles.calorieRow}>
                        <HugeiconsIcon icon={FireIcon} size={14} color={colors.danger} />
                        <Text style={[styles.foodCalories, { color: colors.danger }]}>{activity.calories} kcal</Text>
                      </View>
                      <View style={styles.macroRow}>
                        <Text style={[styles.macroText, { color: colors.textTertiary }]}>P: {Math.round(activity.protein || 0)}g</Text>
                        <View style={[styles.miniDot, { backgroundColor: colors.border }]} />
                        <Text style={[styles.macroText, { color: colors.textTertiary }]}>C: {Math.round(activity.carbs || 0)}g</Text>
                        <View style={[styles.miniDot, { backgroundColor: colors.border }]} />
                        <Text style={[styles.macroText, { color: colors.textTertiary }]}>F: {Math.round(activity.fat || 0)}g</Text>
                        {activity.serving ? (
                          <>
                            <View style={[styles.miniDot, { backgroundColor: colors.border }]} />
                            <Text style={[styles.macroText, { color: colors.textTertiary }]}>{activity.serving}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={styles.rightContent}>
                    <Text style={[styles.logTime, { color: colors.textMuted }]}>{activity.time}</Text>
                    {isToday && (
                      <TouchableOpacity 
                        onPress={() => onDelete?.(activity.id, activity.name)}
                        style={styles.deleteButton}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }

          return (
            <View key={activity.id} style={[styles.activityCard, { backgroundColor: colors.card }]}>
              <View style={[styles.activityIconCircle, { backgroundColor: colors.accentLight }]}>
                <HugeiconsIcon icon={Activity01Icon} size={20} color={colors.accent} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityName, { color: colors.text }]}>{activity.name}</Text>
                <Text style={[styles.activityTime, { color: colors.textMuted }]}>{activity.time}</Text>
              </View>
              <View style={styles.rightContentInline}>
                <Text style={[styles.activityCalories, { color: colors.accent }]}>{activity.calories} cal</Text>
                {isToday && (
                  <TouchableOpacity 
                    onPress={() => onDelete?.(activity.id, activity.name)}
                    style={styles.deleteButtonSmall}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },

  // Empty State
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Common Card Shadow/Style
  commonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  // Exercise Card Styling
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 6,
  },
  exerciseStats: {
    flexDirection: 'column',
    gap: 4,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E53E3E',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E0',
  },
  logTime: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '500',
    alignSelf: 'flex-start',
  },

  // Food Card Styling
  foodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  foodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  foodInfo: {
    flex: 1,
    marginRight: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 6,
  },
  foodStats: {
    flexDirection: 'column',
    gap: 4,
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E53E3E',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  macroText: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
  },
  miniDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#CBD5E0',
  },

  activityList: {
    // Wrapper no longer needs styling as items are cards
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  activityTime: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  activityCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: '#009050',
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 4,
    minHeight: 56,
  },
  rightContentInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 4,
    marginTop: 4,
  },
  deleteButtonSmall: {
    padding: 2,
  },
});
