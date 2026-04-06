import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate,
  FadeIn
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScanOverlayProps {
  visible: boolean;
}

const SCAN_MESSAGES = [
  'Analyzing ingredients...',
  'Detecting food items...',
  'Estimating portions...',
  'Calculating macros...',
  'Consulting AI Coach...',
];

export const ScanOverlay = ({ visible }: ScanOverlayProps) => {
  if (!visible) return null;

  const scanPos = useSharedValue(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    scanPos.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % SCAN_MESSAGES.length);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const laserStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scanPos.value, [0, 1], [0, 200]);
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.imagePlaceholder}>
        {/* Laser Line */}
        <Animated.View style={[styles.laser, laserStyle]}>
          <LinearGradient
            colors={['rgba(0, 144, 80, 0)', 'rgba(0, 144, 80, 0.8)', 'rgba(0, 144, 80, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        
        {/* Shimmer overlay */}
        <View style={[styles.shimmer, { backgroundColor: 'rgba(0, 144, 80, 0.05)' }]} />
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{SCAN_MESSAGES[messageIndex]}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH * 0.8,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 144, 80, 0.3)',
  },
  laser: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 2,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBox: {
    marginTop: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 144, 80, 0.5)',
  },
  statusText: {
    color: '#009050',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
