import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon, Delete02Icon, Share01Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '../../lib/ThemeContext';
import { ProgressPhoto, getDayNumber, getTimeLabel } from '../../services/progressPhotoService';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullScreenPhotoProps {
  visible: boolean;
  photo: ProgressPhoto | null;
  firstPhoto: ProgressPhoto | null;
  onClose: () => void;
  onDelete: (photo: ProgressPhoto) => void;
  onShare: () => void;
}

export function FullScreenPhoto({ visible, photo, firstPhoto, onClose, onDelete, onShare }: FullScreenPhotoProps) {
  const { colors } = useTheme();

  if (!photo) return null;

  const dayNum = firstPhoto ? getDayNumber(photo, firstPhoto) : 1;
  const dateFormatted = format(new Date(photo.date), 'MMM d, yyyy');

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this progress photo? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(photo);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" />

        {/* Top Bar */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionButton} onPress={onShare}>
              <HugeiconsIcon icon={Share01Icon} size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <HugeiconsIcon icon={Delete02Icon} size={22} color="#FC8181" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Image */}
        <Animated.View entering={ZoomIn.duration(300)} style={styles.imageContainer}>
          <Image
            source={{ uri: photo.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Bottom Info */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.bottomBar}>
          <View style={styles.infoContainer}>
            <Text style={styles.dayText}>Day {dayNum}</Text>
            <Text style={styles.dateText}>{dateFormatted}</Text>
          </View>
          {photo.weight && (
            <View style={styles.weightBadge}>
              <Text style={styles.weightText}>{photo.weight} kg</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  image: {
    width: SCREEN_WIDTH - 16,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  infoContainer: {
    gap: 4,
  },
  dayText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  weightBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  weightText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
