import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { ProgressPhoto } from '../../services/progressPhotoService';
import { ProgressPhotoCard } from './ProgressPhotoCard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Add01Icon } from '@hugeicons/core-free-icons';

interface PhotoTimelineProps {
  photos: ProgressPhoto[];
  onPhotoPress: (photo: ProgressPhoto) => void;
  onPhotoLongPress: (photo: ProgressPhoto) => void;
  onAddPress: () => void;
}

export function PhotoTimeline({ photos, onPhotoPress, onPhotoLongPress, onAddPress }: PhotoTimelineProps) {
  const { colors, isDark } = useTheme();
  const firstPhoto = photos.length > 0 ? photos[0] : null;

  // Pulse animation for Add card
  const pulseScale = useSharedValue(1);
  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const addCardPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const renderAddCard = () => (
    <Animated.View entering={FadeInRight.duration(400)} style={addCardPulse}>
      <TouchableOpacity
        style={[styles.addCard, { backgroundColor: isDark ? colors.cardAlt : '#F0FFF4', borderColor: colors.accent }]}
        onPress={onAddPress}
        activeOpacity={0.7}
      >
        <View style={[styles.addIconCircle, { backgroundColor: colors.accent }]}>
          <HugeiconsIcon icon={Add01Icon} size={22} color="#FFFFFF" />
        </View>
        <Text style={[styles.addLabel, { color: colors.accent }]}>📸 Add{'\n'}Progress</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (photos.length === 0) {
    return (
      <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Photo Timeline</Text>
        <View style={styles.emptyRow}>
          {renderAddCard()}
          <View style={styles.emptyTextContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Capture your journey! 📸
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Add your first progress photo to start tracking your visual transformation.
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Photo Timeline</Text>
        <View style={[styles.countBadge, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }]}>
          <Text style={[styles.countBadgeText, { color: colors.accent }]}>{photos.length} photos</Text>
        </View>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={photos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderAddCard}
        renderItem={({ item, index }) => (
          <ProgressPhotoCard
            photo={item}
            firstPhoto={firstPhoto!}
            previousPhoto={index > 0 ? photos[index - 1] : undefined}
            onPress={onPhotoPress}
            onLongPress={onPhotoLongPress}
            index={index}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  listContent: {
    paddingRight: 24,
  },
  addCard: {
    width: 130,
    height: 206,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    gap: 10,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  emptyTextContainer: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
