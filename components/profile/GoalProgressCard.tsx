import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { TargetIcon, ChampionIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GoalProgressCardProps {
  currentWeight: number;
  targetWeight: number;
  startWeight: number;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ 
  currentWeight, 
  targetWeight, 
  startWeight 
}) => {
  const { colors, isDark } = useTheme();
  
  // Calculate Progress %
  // If target is lower than start (weight loss)
  // Progress = (start - current) / (start - target)
  const totalDiff = Math.abs(startWeight - targetWeight);
  const currentDiff = Math.abs(startWeight - currentWeight);
  const rawProgress = totalDiff > 0 ? (currentDiff / totalDiff) : 0;
  const progressPercent = Math.min(Math.max(rawProgress, 0), 1);
  
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withSpring(progressPercent, { damping: 15, stiffness: 60 });
  }, [progressPercent]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      left: `${progress.value * 100}%`,
    };
  });

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.accentLight }]}>
          <HugeiconsIcon icon={TargetIcon} size={20} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Goal Progress</Text>
      </View>

      <View style={styles.trackContainer}>
        <View style={[styles.track, { backgroundColor: isDark ? '#2D3748' : '#EDF2F7' }]}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.accent }, animatedFillStyle]} />
        </View>
        
        <Animated.View style={[styles.indicator, animatedIndicatorStyle]}>
          <View style={[styles.indicatorLine, { backgroundColor: colors.accent }]} />
          <View style={[styles.indicatorBubble, { backgroundColor: colors.accent }]}>
             <Text style={styles.indicatorText}>{currentWeight}kg</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={[styles.label, { color: colors.textTertiary }]}>START</Text>
          <Text style={[styles.value, { color: colors.text }]}>{startWeight}kg</Text>
        </View>
        <View style={styles.centerInfo}>
          <Text style={[styles.percentText, { color: colors.accent }]}>{Math.round(progressPercent * 100)}%</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>TARGET</Text>
          <Text style={[styles.value, { color: colors.accent }]}>{targetWeight}kg</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  trackContainer: {
    height: 60,
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  track: {
    height: 10,
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 60,
    marginLeft: -30,
    alignItems: 'center',
    zIndex: 10,
  },
  indicatorLine: {
    width: 2,
    height: 24,
    marginTop: 18,
  },
  indicatorBubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    position: 'absolute',
    top: -10,
  },
  indicatorText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
  centerInfo: {
    alignItems: 'center',
  },
  percentText: {
    fontSize: 24,
    fontWeight: '900',
  }
});
