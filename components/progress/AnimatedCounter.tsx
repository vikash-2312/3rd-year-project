import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withSpring, 
  createAnimatedComponent,
} from 'react-native-reanimated';
import { TextInput } from 'react-native-gesture-handler';

// Create an animated TextInput for high-performance number updates
const AnimatedTextInput = createAnimatedComponent(TextInput);

interface AnimatedCounterProps {
  value: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  style?: any;
  duration?: number;
}

export function AnimatedCounter({ 
  value, 
  precision = 1, 
  prefix = '', 
  suffix = '', 
  style,
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    // Spring up from 0 to target value on mount
    animatedValue.value = withSpring(value, {
      damping: 15,
      stiffness: 80,
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    // Format the number on the UI thread
    const text = `${prefix}${animatedValue.value.toFixed(precision)}${suffix}`;
    return {
      text,
      defaultValue: text,
    } as any;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      value={`${prefix}${value.toFixed(precision)}${suffix}`}
      style={[styles.text, style]}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    padding: 0,
    margin: 0,
  },
});
