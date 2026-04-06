import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { SparklesIcon, ArrowRight01Icon, Dumbbell01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AIWorkoutQuickCard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/ai-workout' as any);
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(150).duration(600).springify().damping(12)}
      style={styles.container}
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handlePress}
        style={styles.card}
      >
        <LinearGradient
          colors={isDark ? ['#059669', '#065F46'] : ['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.iconWrapper}>
              <HugeiconsIcon icon={SparklesIcon} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.textColumn}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ELITE TRAINING</Text>
              </View>
              <Text style={styles.title}>AI Workout Generator</Text>
              <Text style={styles.description}>Generate a custom high-performance routine instantly.</Text>
            </View>
            <View style={styles.arrowCircle}>
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#059669" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    borderRadius: 24,
  },
  gradient: {
    padding: 20,
    borderRadius: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textColumn: {
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
