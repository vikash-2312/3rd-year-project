import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  CheckmarkCircle02Icon, 
  CircleIcon, 
  ArrowRight01Icon,
  Flag01Icon,
  AvocadoIcon,
  Camera01Icon,
  SmartWatch01Icon,
  Cancel01Icon
} from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeOut, Layout } from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';

export interface OnboardingTask {
  id: string;
  title: string;
  isCompleted: boolean;
  onPress: () => void;
  icon: any;
  color: string;
}

interface OnboardingChecklistProps {
  tasks: OnboardingTask[];
  onDismiss: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  tasks,
  onDismiss,
}) => {
  const { colors, isDark } = useTheme();
  
  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progress = completedCount / tasks.length;

  return (
    <Animated.View 
      entering={FadeInUp.duration(600).springify()}
      exiting={FadeOut.duration(400)}
      layout={Layout.springify()}
      style={[
        styles.container, 
        { 
          backgroundColor: colors.card,
          borderColor: colors.border,
        }
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Getting Started</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {completedCount} of {tasks.length} tasks completed
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
          style={styles.dismissBtn}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
        <Animated.View 
          style={[
            styles.progressBarFill, 
            { 
              backgroundColor: colors.accent,
              width: `${progress * 100}%` 
            }
          ]} 
        />
      </View>

      <View style={styles.taskList}>
        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              task.onPress();
            }}
            style={styles.taskItem}
            activeOpacity={0.7}
          >
            <View style={styles.taskLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${task.color}15` }]}>
                <HugeiconsIcon icon={task.icon} size={18} color={task.color} />
              </View>
              <Text 
                style={[
                  styles.taskTitle, 
                  { 
                    color: task.isCompleted ? colors.textMuted : colors.text,
                    textDecorationLine: task.isCompleted ? 'line-through' : 'none'
                  }
                ]}
              >
                {task.title}
              </Text>
            </View>
            
            <View style={styles.taskRight}>
              {task.isCompleted ? (
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} color={colors.accent} />
              ) : (
                <HugeiconsIcon icon={CircleIcon} size={22} color={colors.textMuted} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  dismissBtn: {
    padding: 4,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarBg: {
    ...StyleSheet.absoluteFillObject,
  },
  progressBarFill: {
    height: '100%',
  },
  taskList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  taskRight: {
    marginLeft: 12,
  },
});
