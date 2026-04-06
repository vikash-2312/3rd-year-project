import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { 
  FadeInDown, 
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { ProgressPhoto } from '../../services/progressPhotoService';
import { ProgressPhotoCard } from './ProgressPhotoCard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { format, parseISO } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48 - 16) / 3); // 3-column tight grid logic

interface PhotoTimelineProps {
  photos: ProgressPhoto[];
  onPhotoPress: (photo: ProgressPhoto) => void;
  onPhotoLongPress: (photo: ProgressPhoto) => void;
  onAddPress: () => void;
  isSelectMode: boolean;
  selectedPhotos: ProgressPhoto[];
  toggleSelectMode: () => void;
}

export function PhotoTimeline({ 
  photos, 
  onPhotoPress, 
  onPhotoLongPress, 
  onAddPress,
  isSelectMode,
  selectedPhotos,
  toggleSelectMode
}: PhotoTimelineProps) {
  const { colors, isDark } = useTheme();

  // Sort newest first for the vertical gallery view
  const reversedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => b.date.localeCompare(a.date));
  }, [photos]);

  const firstPhoto = photos.length > 0 ? photos[0] : null;

  // Group photos by Month/Year
  const groupedPhotos = useMemo(() => {
    return reversedPhotos.reduce((acc: { title: string, data: ProgressPhoto[] }[], photo) => {
      const monthYear = format(parseISO(photo.date), 'MMMM yyyy');
      const group = acc.find(g => g.title === monthYear);
      if (group) {
        group.data.push(photo);
      } else {
        acc.push({ title: monthYear, data: [photo] });
      }
      return acc;
    }, []);
  }, [reversedPhotos]);

  const renderAddCard = () => (
    <TouchableOpacity
      style={[styles.addCard, { backgroundColor: isDark ? colors.cardAlt : '#F0FFF4', borderColor: colors.accent }]}
      onPress={onAddPress}
      activeOpacity={0.7}
    >
      <View style={[styles.addIconCircle, { backgroundColor: colors.accent }]}>
        <HugeiconsIcon icon={Add01Icon} size={22} color="#FFFFFF" />
      </View>
      <Text style={[styles.addLabel, { color: colors.accent }]}>Add Photo</Text>
    </TouchableOpacity>
  );

  if (photos.length === 0) {
    return (
      <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress Gallery</Text>
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
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress Gallery</Text>
          {isSelectMode && (
            <Animated.Text entering={FadeInDown.delay(100)} style={[styles.selectHint, { color: colors.accent }]}>
              Select 2 photos to compare
            </Animated.Text>
          )}
        </View>
        <TouchableOpacity
          onPress={toggleSelectMode}
          disabled={photos.length < 2}
          style={[
            styles.compareBtn, 
            { backgroundColor: isSelectMode ? colors.cardAlt : (photos.length < 2 ? colors.cardAlt : colors.accentLight) }
          ]}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.compareBtnText, 
            { color: isSelectMode ? colors.text : (photos.length < 2 ? colors.textMuted : colors.accent) }
          ]}>
            {isSelectMode ? 'Cancel' : 'Compare'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.galleryContent}>
        {groupedPhotos.map((group, groupIndex) => (
          <View key={group.title} style={styles.monthGroup}>
            <Text style={[styles.monthHeader, { color: colors.text }]}>{group.title}</Text>
            
            <View style={styles.gridContainer}>
              {/* Inject "Add Card" ONLY in the very first grid group (the newest month) */}
              {groupIndex === 0 && renderAddCard()}
              
              {group.data.map((item, indexInGroup) => {
                const selectionIdx = selectedPhotos.findIndex(p => p.id === item.id);
                // Find the previous photo index for weight comparison (need to search original ascending array)
                const realIndex = photos.findIndex(p => p.id === item.id);
                const previousPhoto = realIndex > 0 ? photos[realIndex - 1] : undefined;

                return (
                  <ProgressPhotoCard
                    key={item.id}
                    photo={item}
                    firstPhoto={firstPhoto!}
                    previousPhoto={previousPhoto}
                    onPress={onPhotoPress}
                    onLongPress={onPhotoLongPress}
                    index={realIndex} // Pass original chronological index
                    isSelected={selectionIdx !== -1}
                    selectionIndex={selectionIdx !== -1 ? selectionIdx : undefined}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  galleryContent: {
    gap: 20,
  },
  monthGroup: {
    marginBottom: 8,
  },
  monthHeader: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addCard: {
    width: CARD_WIDTH,
    height: Math.floor(CARD_WIDTH * 1.33) + 32, // Match the visual height of ProgressPhotoCard (image height + footer)
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 12,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  compareBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  compareBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  selectHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
