import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  SparklesIcon, 
  Alert01Icon, 
  ChampionIcon, 
  DropletIcon as WaterIcon,
  TickDouble02Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInUp, 
  FadeOutDown,
  Layout
} from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';
import { AIInsight } from '../services/decisionEngine';

const { width } = Dimensions.get('window');

interface AIProactiveAlertProps {
  insight: AIInsight;
  onAction: (actionMessage: string) => void;
  onDismiss: () => void;
}

export const AIProactiveAlert = ({ insight, onAction, onDismiss }: AIProactiveAlertProps) => {
  const { colors, isDark } = useTheme();

  const getTheme = () => {
    switch (insight.type) {
      case 'critical':
        return { 
          bg: isDark ? ['#742A2A', '#9B2C2C'] : ['#FFF5F5', '#FED7D7'], 
          border: '#E53E3E', 
          icon: Alert01Icon, 
          accent: '#E53E3E' 
        };
      case 'warning':
        return { 
          bg: isDark ? ['#7B341E', '#9C4221'] : ['#FFFAF0', '#FEEBC8'], 
          border: '#DD6B20', 
          icon: Alert01Icon, 
          accent: '#DD6B20' 
        };
      case 'success':
        return { 
          bg: isDark ? ['#22543D', '#276749'] : ['#F0FFF4', '#C6F6D5'], 
          border: '#38A169', 
          icon: ChampionIcon, 
          accent: '#38A169' 
        };
      default:
        return { 
          bg: isDark ? ['#2C3E50', '#34495E'] : ['#F7FAFC', '#EDF2F7'], 
          border: colors.border, 
          icon: SparklesIcon, 
          accent: colors.accent 
        };
    }
  };

  const theme = getTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (insight.actionMessage) {
      onAction(insight.actionMessage);
    }
  };

  return (
    <Animated.View 
      entering={FadeInUp.springify()} 
      exiting={FadeOutDown}
      layout={Layout.springify()}
      style={[
        styles.card, 
        { borderColor: theme.border, shadowColor: theme.accent }
      ]}>
      <LinearGradient
        colors={theme.bg as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <HugeiconsIcon icon={theme.icon} size={20} color={theme.accent} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: isDark ? '#FFF' : '#2D3748' }]}>{insight.title}</Text>
            <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.7)' : '#718096' }]}>AI PROACTIVE COACH</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#A0AEC0', fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.message, { color: isDark ? '#FFF' : '#4A5568' }]}>
          {insight.message}
        </Text>

        {insight.suggestion && (
          <View style={styles.suggestionBox}>
            <Text style={[styles.suggestionText, { color: theme.accent }]}>
              💡 Tip: {insight.suggestion}
            </Text>
          </View>
        )}

        {insight.actionLabel && (
          <TouchableOpacity 
            onPress={handlePress} 
            activeOpacity={0.8}
            style={[styles.actionBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.actionBtnText}>{insight.actionLabel}</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 12,
  },
  suggestionBox: {
    marginBottom: 16,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
