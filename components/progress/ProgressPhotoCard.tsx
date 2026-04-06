import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { 
  FadeIn,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { ProgressPhoto, getTimeLabel, getDayNumber } from '../../services/progressPhotoService';
import { format, parseISO } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProgressPhotoCardProps {
  photo: ProgressPhoto;
  firstPhoto: ProgressPhoto;
  previousPhoto?: ProgressPhoto;
  onPress: (photo: ProgressPhoto) => void;
  onLongPress: (photo: ProgressPhoto) => void;
  index: number;
  isSelected?: boolean;
  selectionIndex?: number;
}

export function ProgressPhotoCard({ 
  photo, 
  firstPhoto, 
  previousPhoto, 
  onPress, 
  onLongPress, 
  index,
  isSelected,
  selectionIndex
}: ProgressPhotoCardProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const weightChange = previousPhoto?.weight && photo.weight
    ? photo.weight - previousPhoto.weight
    : null;

  // Grid sizing: 3 columns, minus padding
  // Container padding is 24px total (left + right in analytics or timeline container)
  // And we want space between items. Let's use flex styling or calculated width
  const cardWidth = Math.floor((SCREEN_WIDTH - 48 - 16) / 3); // 48 padding, 16 gap total for margins

  return (
    <Animated.View style={[animatedStyle, { width: cardWidth, marginBottom: 8 }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(photo)}
        onLongPress={() => onLongPress(photo)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={400}
      >
        <View style={[
          styles.card, 
          { backgroundColor: colors.card }, 
          { 
            borderColor: isSelected ? colors.accent : 'transparent', 
            borderWidth: isSelected ? 2.5 : 0 
          }
        ]}>
          <View style={styles.imageContainer}>
            {/* Aspect ratio 3:4 for vertical portraits */}
            <Image source={{ uri: photo.imageUrl }} style={[styles.image, { height: cardWidth * 1.33 }]} resizeMode="cover" />
            
            <View style={[styles.dateBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Text style={styles.dateBadgeText}>{format(parseISO(photo.date), 'MMM d')}</Text>
            </View>

            {isSelected && (
              <View style={[styles.selectionBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.selectionBadgeText}>{selectionIndex !== undefined ? selectionIndex + 1 : ''}</Text>
              </View>
            )}
            
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

          {/* Minimal Info row for Grid */}
          <View style={styles.infoRow}>
             <Text style={[styles.weightText, { color: colors.text }]} numberOfLines={1}>
                {photo.weight ? `${photo.weight} kg` : '--'}
              </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0, // Fallback if isSelected is false
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  dateBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  weightChangeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  weightChangeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoRow: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  selectionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
