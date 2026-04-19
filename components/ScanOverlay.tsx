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
  width?: number;
  height?: number;
}

const SCAN_MESSAGES = [
  'Initializing Neural Core...',
  'Analyzing nutrient density...',
  'Detecting ingredient signatures...',
  'Estimating volume & weight...',
  'Calculating macro ratios...',
  'Finalizing AI summary...',
];

export const ScanOverlay = ({ visible, width = SCREEN_WIDTH * 0.8, height = 200 }: ScanOverlayProps) => {
  if (!visible) return null;

  const scanPos = useSharedValue(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [detectionPos] = useState({
    top: Math.random() * (height - 60),
    left: Math.random() * (width - 60)
  });

  useEffect(() => {
    scanPos.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % SCAN_MESSAGES.length);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const laserStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scanPos.value, [0, 1], [0, height]);
    return {
      transform: [{ translateY }],
    };
  });

  const detectionStyle = useAnimatedStyle(() => {
    return {
      opacity: withRepeat(withTiming(0.4, { duration: 800 }), -1, true),
      transform: [{ scale: withRepeat(withTiming(1.1, { duration: 1000 }), -1, true) }]
    };
  });

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={[styles.scanArea, { width, height }]}>
        {/* Corner Brackets */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />

        {/* Pulsing Detection Frame */}
        <Animated.View style={[
          styles.detectionFrame, 
          { top: detectionPos.top, left: detectionPos.left },
          detectionStyle
        ]}>
          <View style={styles.detectionLabel}>
            <Text style={styles.detectionText}>ID: PROT_SOURCE_V1</Text>
          </View>
        </Animated.View>

        {/* Laser Line */}
        <Animated.View style={[styles.laser, laserStyle, { width }]}>
          <LinearGradient
            colors={['rgba(0, 144, 80, 0)', 'rgba(0, 144, 80, 0.8)', 'rgba(0, 144, 80, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        
        {/* Subtle Scanlines overlay */}
        <View style={styles.scanLines} />
      </View>

      <View style={styles.statusBox}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{SCAN_MESSAGES[messageIndex]}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scanArea: {
    backgroundColor: 'rgba(0, 144, 80, 0.05)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 144, 80, 0.2)',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#009050',
  },
  topLeft: { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 },
  topRight: { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 },
  bottomLeft: { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 },
  bottomRight: { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 },
  
  detectionFrame: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: '#009050',
    backgroundColor: 'rgba(0, 144, 80, 0.1)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  detectionLabel: {
    backgroundColor: '#009050',
    paddingHorizontal: 4,
    marginBottom: -8,
  },
  detectionText: {
    color: '#FFFFFF',
    fontSize: 6,
    fontWeight: '900',
  },
  laser: {
    position: 'absolute',
    top: -20,
    height: 40,
    zIndex: 2,
  },
  scanLines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  statusBox: {
    marginTop: 32,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#009050',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#009050',
  },
  statusText: {
    color: '#009050',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
