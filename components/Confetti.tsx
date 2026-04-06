import React, { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withDelay, 
  withTiming, 
  withSequence,
  runOnJS
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#009050', '#00703C', '#F6AD55', '#4299E1', '#F56565', '#ED64A6'];
const PARTICLE_COUNT = 40;

export interface ConfettiRef {
  trigger: () => void;
}

const Particle = ({ color, delay }: { color: string, delay: number }) => {
  const x = useSharedValue(SCREEN_WIDTH / 2);
  const y = useSharedValue(SCREEN_HEIGHT / 2);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 200;
    const destX = (SCREEN_WIDTH / 2) + Math.cos(angle) * distance;
    const destY = (SCREEN_HEIGHT / 2) + Math.sin(angle) * distance;

    scale.value = withDelay(delay, withTiming(1, { duration: 200 }));
    x.value = withDelay(delay, withTiming(destX, { duration: 1500 }));
    y.value = withDelay(delay, withTiming(destY, { duration: 1500 }));
    rotation.value = withDelay(delay, withTiming(Math.random() * 720, { duration: 2000 }));
    opacity.value = withDelay(delay + 1000, withTiming(0, { duration: 1000 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: color,
    borderRadius: 2,
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  return <Animated.View style={style} />;
};

export const Confetti = forwardRef<ConfettiRef>((_, ref) => {
  const [active, setActive] = useState(false);

  useImperativeHandle(ref, () => ({
    trigger: () => {
      setActive(false);
      setTimeout(() => setActive(true), 10);
      setTimeout(() => setActive(false), 3000);
    }
  }));

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle 
          key={i} 
          color={COLORS[i % COLORS.length]} 
          delay={Math.random() * 200}
        />
      ))}
    </View>
  );
});
