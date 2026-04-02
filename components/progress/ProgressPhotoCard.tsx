import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { ProgressPhoto, getTimeLabel, getDayNumber } from '../../services/progressPhotoService';

interface ProgressPhotoCardProps {
  photo: ProgressPhoto;
  firstPhoto: ProgressPhoto;
  previousPhoto?: ProgressPhoto; // For weight change badge
  onPress: (photo: ProgressPhoto) => void;
  onLongPress: (photo: ProgressPhoto) => void;
  index: number;
}

export function ProgressPhotoCard({ photo, firstPhoto, previousPhoto, onPress, onLongPress, index }: ProgressPhotoCardProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const dayNum = getDayNumber(photo, firstPhoto);
  const timeLabel = getTimeLabel(photo, firstPhoto);

  // Weight change from previous photo
  const weightChange = previousPhoto?.weight && photo.weight
    ? photo.weight - previousPhoto.weight
    : null;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 80).duration(400)}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(photo)}
        onLongPress={() => onLongPress(photo)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={400}
      >
        <Animated.View style={[styles.card, { backgroundColor: colors.card }, animatedStyle]}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: photo.imageUrl }} style={styles.image} resizeMode="cover" />
            
            {/* Day badge */}
            <View style={[styles.dayBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Text style={styles.dayBadgeText}>Day {dayNum}</Text>
            </View>

            {/* Weight change badge */}
            {weightChange !== null && weightChange !== 0 && (
              <View style={[
                styles.weightChangeBadge,
                { backgroundColor: weightChange < 0 ? 'rgba(0,144,80,0.85)' : 'rgba(229,62,62,0.85)' }
              ]}>
                <Text style={styles.weightChangeBadgeText}>
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {timeLabel}
            </Text>
            {photo.weight && (
              <Text style={[styles.weightText, { color: colors.textMuted }]}>
                {photo.weight}kg
              </Text>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 130,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 130,
    height: 160,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  dayBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  weightChangeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weightChangeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  infoRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  weightText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
