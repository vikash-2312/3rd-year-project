import React, { useMemo, useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeInDown,
  FadeOut,
  clamp,
  runOnJS,
  Easing,
  interpolate,
  useAnimatedReaction,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/ThemeContext';
import { ProgressPhoto, getDayNumber } from '../../services/progressPhotoService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_WIDTH = SCREEN_WIDTH - 48;
const SLIDER_HEIGHT = SLIDER_WIDTH * 1.1;
const HANDLE_SIZE = 48;

interface BeforeAfterSliderProps {
  beforePhoto: ProgressPhoto | null;
  afterPhoto: ProgressPhoto | null;
  firstPhoto: ProgressPhoto | null;
}

export function BeforeAfterSlider({ beforePhoto, afterPhoto, firstPhoto }: BeforeAfterSliderProps) {
  const { colors, isDark } = useTheme();
  const sliderX = useSharedValue(SLIDER_WIDTH / 2);
  const [hasInteracted, setHasInteracted] = useState(false);

  const beforeDay = useMemo(() => {
    if (!beforePhoto || !firstPhoto) return 1;
    return getDayNumber(beforePhoto, firstPhoto);
  }, [beforePhoto, firstPhoto]);

  const afterDay = useMemo(() => {
    if (!afterPhoto || !firstPhoto) return 1;
    return getDayNumber(afterPhoto, firstPhoto);
  }, [afterPhoto, firstPhoto]);

  const isSameDay = beforeDay === afterDay;
  const dayDiff = afterDay - beforeDay;

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const markInteracted = () => {
    if (!hasInteracted) setHasInteracted(true);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(triggerHaptic)();
      runOnJS(markInteracted)();
    })
    .onUpdate((e) => {
      sliderX.value = clamp(e.absoluteX - 24, 0, SLIDER_WIDTH);
    })
    .onEnd(() => {
      // Gentle spring settle
      sliderX.value = withSpring(sliderX.value, { damping: 20, stiffness: 150 });
    })
    .hitSlop({ horizontal: 24, vertical: 24 });

  const clipStyle = useAnimatedStyle(() => ({
    width: sliderX.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - HANDLE_SIZE / 2 }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - 1.5 }],
  }));

  // Pulsing hint animation
  const pulseValue = useSharedValue(1);
  React.useEffect(() => {
    if (!hasInteracted) {
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseValue.value = withTiming(1, { duration: 200 });
    }
  }, [hasInteracted]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  // === EMPTY STATE: 0 photos ===
  if (!beforePhoto && !afterPhoto) {
    return (
      <Animated.View
        entering={FadeIn.duration(500)}
        style={[styles.emptyContainer, { backgroundColor: colors.card }]}
      >
        <Animated.View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }, pulseStyle]}>
          <Text style={styles.emptyEmoji}>📸</Text>
        </Animated.View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Start Your Transformation Journey
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Upload your first progress photo to begin tracking your visual transformation 🚀
        </Text>
      </Animated.View>
    );
  }

  // === SINGLE PHOTO STATE: 1 photo ===
  if (!afterPhoto && beforePhoto) {
    return (
      <Animated.View entering={FadeIn.duration(600)} style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Your Journey Begins</Text>
          <View style={[styles.badge, { backgroundColor: isDark ? '#2D2914' : '#FFFFF0' }]}>
            <Text style={[styles.badgeText, { color: colors.warning }]}>Day 1</Text>
          </View>
        </View>

        <View style={styles.sliderContainer}>
          <Image
            source={{ uri: beforePhoto.imageUrl }}
            style={styles.fullImage}
            resizeMode="cover"
          />
          {/* Overlay */}
          <View style={styles.singlePhotoOverlay}>
            <View style={styles.singlePhotoOverlayContent}>
              <Text style={styles.singlePhotoOverlayEmoji}>🔥</Text>
              <Text style={styles.singlePhotoOverlayTitle}>Take your next photo</Text>
              <Text style={styles.singlePhotoOverlaySubtitle}>to see your transformation</Text>
            </View>
          </View>

          <View style={[styles.labelLeft, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Text style={styles.labelText}>Day 1</Text>
            {beforePhoto.weight && (
              <Text style={styles.labelDay}>{beforePhoto.weight} kg</Text>
            )}
          </View>
        </View>
      </Animated.View>
    );
  }

  // === FULL COMPARISON: 2+ photos ===
  return (
    <Animated.View entering={FadeIn.duration(600)} style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transformation</Text>
        <View style={[styles.badge, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }]}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>
            {isSameDay ? 'Same day' : `${dayDiff} days`}
          </Text>
        </View>
      </View>

      {/* Same day message */}
      {isSameDay ? (
        <View style={styles.sliderContainer}>
          <Image
            source={{ uri: afterPhoto!.imageUrl }}
            style={styles.fullImage}
            resizeMode="cover"
          />
          {/* Overlay for same-day message */}
          <View style={styles.singlePhotoOverlay}>
            <View style={styles.singlePhotoOverlayContent}>
              <Text style={styles.singlePhotoOverlayEmoji}>🚀</Text>
              <Text style={styles.singlePhotoOverlayTitle}>Start your journey</Text>
              <Text style={styles.singlePhotoOverlaySubtitle}>Photos from different days unlock comparison</Text>
            </View>
          </View>

          <View style={[styles.labelLeft, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Text style={styles.labelText}>Today</Text>
            {afterPhoto!.weight && (
              <Text style={styles.labelDay}>{afterPhoto!.weight} kg</Text>
            )}
          </View>
        </View>
      ) : (
        /* Slider Overlay (Different days) */
        <GestureDetector gesture={panGesture}>
          <View style={styles.sliderContainer}>
            {/* After Image (full, behind) */}
            <Image
              source={{ uri: afterPhoto!.imageUrl }}
              style={styles.fullImage}
              resizeMode="cover"
            />

            {/* After label */}
            <View style={[styles.labelRight, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Text style={styles.labelText}>After</Text>
              <Text style={styles.labelDay}>Day {afterDay}</Text>
            </View>

            {/* Before Image (clipped) */}
            <Animated.View style={[styles.clippedContainer, clipStyle]}>
              <Image
                source={{ uri: beforePhoto!.imageUrl }}
                style={[styles.fullImage, { width: SLIDER_WIDTH }]}
                resizeMode="cover"
              />
              {/* Before label */}
              <View style={[styles.labelLeft, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <Text style={styles.labelText}>Before</Text>
                <Text style={styles.labelDay}>Day {beforeDay}</Text>
              </View>
            </Animated.View>

            {/* Divider Line */}
            <Animated.View style={[styles.dividerLine, lineStyle]} />

            {/* Handle */}
            <Animated.View style={[styles.handle, handleStyle]}>
              <Animated.View style={[styles.handleInner, !hasInteracted && pulseStyle]}>
                <Text style={styles.handleArrowText}>◂</Text>
                <View style={[styles.handleDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.handleArrowText}>▸</Text>
              </Animated.View>
            </Animated.View>

            {/* Drag Hint */}
            {!hasInteracted && (
              <Animated.View
                entering={FadeIn.delay(600).duration(400)}
                exiting={FadeOut.duration(300)}
                style={styles.dragHintContainer}
              >
                <View style={styles.dragHintBadge}>
                  <Text style={styles.dragHintText}>↔ Drag to compare</Text>
                </View>
              </Animated.View>
            )}
          </View>
        </GestureDetector>
      )}

      {/* Day transformation text (footer) */}
      {!isSameDay && (
        <View style={[styles.transformationFooter, { borderTopColor: colors.border }]}>
          <View style={styles.transformationRow}>
            <View style={styles.transformationDayCol}>
              <Text style={[styles.transformationDayLabel, { color: colors.textMuted }]}>From</Text>
              <Text style={[styles.transformationDayValue, { color: colors.text }]}>Day {beforeDay}</Text>
            </View>
            <View style={[styles.transformationArrow, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }]}>
              <Text style={[styles.transformationArrowText, { color: colors.accent }]}>→</Text>
            </View>
            <View style={[styles.transformationDayCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.transformationDayLabel, { color: colors.textMuted }]}>To</Text>
              <Text style={[styles.transformationDayValue, { color: colors.text }]}>Day {afterDay}</Text>
            </View>
          </View>

          {/* Weight change */}
          {beforePhoto!.weight && afterPhoto!.weight && (
            <View style={styles.weightChangeRow}>
              <Text style={[styles.weightLabel, { color: colors.textMuted }]}>Weight Change</Text>
              <Text style={[
                styles.weightValue,
                { color: (afterPhoto!.weight - beforePhoto!.weight) <= 0 ? colors.accent : colors.danger }
              ]}>
                {(afterPhoto!.weight - beforePhoto!.weight) > 0 ? '+' : ''}
                {(afterPhoto!.weight - beforePhoto!.weight).toFixed(1)} kg
              </Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sameDayBanner: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sameDayText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  sliderContainer: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  fullImage: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  clippedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: SLIDER_HEIGHT,
    overflow: 'hidden',
    zIndex: 2,
  },
  dividerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#FFFFFF',
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  handle: {
    position: 'absolute',
    top: '50%',
    marginTop: -HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    zIndex: 4,
  },
  handleInner: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 4,
  },
  handleArrowText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '900',
  },
  handleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dragHintContainer: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    zIndex: 5,
  },
  dragHintBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dragHintText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelLeft: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    zIndex: 5,
  },
  labelRight: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    zIndex: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  labelDay: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  transformationFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  transformationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transformationDayCol: {
    flex: 1,
  },
  transformationDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  transformationDayValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  transformationArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  transformationArrowText: {
    fontSize: 18,
    fontWeight: '800',
  },
  weightChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  weightLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  weightValue: {
    fontSize: 17,
    fontWeight: '800',
  },

  // Single Photo State
  singlePhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  singlePhotoOverlayContent: {
    alignItems: 'center',
    gap: 4,
  },
  singlePhotoOverlayEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  singlePhotoOverlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  singlePhotoOverlaySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  // Empty state
  emptyContainer: {
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
  },
});
