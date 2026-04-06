import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  FadeInRight, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { HugeiconsIcon } from '@hugeicons/react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AchievementCardProps {
  title: string;
  subtitle: string;
  emoji: string;
  icon?: any;
  color: string;
  bgColor: string;
  index: number;
}

export function AchievementCard({ title, subtitle, emoji, icon, color, bgColor, index }: AchievementCardProps) {
  const { isDark } = useTheme();
  
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View 
      entering={FadeInRight.delay(index * 150).duration(500).springify()}
      style={[styles.card, { backgroundColor: bgColor }]}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </Animated.View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: color }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
          {subtitle}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: (SCREEN_WIDTH - 48 - 12) / 2, // 48 is horizontal padding, 12 is gap
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 22,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
});
