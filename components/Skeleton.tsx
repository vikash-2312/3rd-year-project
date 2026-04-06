import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, DimensionValue } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = ({ width, height, borderRadius = 8, style }: SkeletonProps) => {
  const { colors, isDark } = useTheme();
  const shimmerValue = new Animated.Value(0);

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? 0.05 : 0.4, isDark ? 0.15 : 0.8],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#2D3748' : '#E2E8F0',
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
