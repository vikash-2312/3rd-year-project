import React, { useCallback, useRef } from 'react';
import { View, Image, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { ProgressPhoto, getDayNumber } from '../../services/progressPhotoService';

const CARD_WIDTH = Dimensions.get('window').width - 48;

interface ShareCardProps {
  beforePhoto: ProgressPhoto;
  afterPhoto: ProgressPhoto;
  firstPhoto: ProgressPhoto;
  onCaptureReady?: (captureAndShare: () => Promise<void>) => void;
}

export function ShareCard({ beforePhoto, afterPhoto, firstPhoto, onCaptureReady }: ShareCardProps) {
  const viewShotRef = useRef<ViewShot>(null);

  const beforeDay = getDayNumber(beforePhoto, firstPhoto);
  const afterDay = getDayNumber(afterPhoto, firstPhoto);
  const weightChange = beforePhoto.weight && afterPhoto.weight
    ? afterPhoto.weight - beforePhoto.weight
    : null;

  const captureAndShare = useCallback(async () => {
    try {
      if (!viewShotRef.current?.capture) {
        throw new Error('Capture component not ready');
      }

      // Capture the card component as an image
      const uri = await viewShotRef.current.capture();

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: `My Transformation: Day ${beforeDay} → Day ${afterDay}`,
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error sharing transformation:', error);
      Alert.alert('Share Failed', 'Unable to capture and share your transformation. Please try again.');
    }
  }, [beforeDay, afterDay]);

  // Expose the capture function to parent
  React.useEffect(() => {
    onCaptureReady?.(captureAndShare);
  }, [captureAndShare, onCaptureReady]);

  return (
    <ViewShot 
      ref={viewShotRef} 
      options={{ format: 'jpg', quality: 0.9 }} 
      style={styles.container}
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandText}>🏋️ My Fitness Journey</Text>
        </View>

        {/* Images side by side */}
        <View style={styles.imagesRow}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: beforePhoto.imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <Text style={styles.overlayLabel}>BEFORE</Text>
              <Text style={styles.overlayDay}>Day {beforeDay}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.imageWrapper}>
            <Image source={{ uri: afterPhoto.imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <Text style={styles.overlayLabel}>AFTER</Text>
              <Text style={styles.overlayDay}>Day {afterDay}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.journeyText}>
            Day {beforeDay} → Day {afterDay}
          </Text>
          {weightChange !== null && (
            <View style={[
              styles.weightBadge,
              { backgroundColor: weightChange <= 0 ? '#F0FFF4' : '#FFF5F5' }
            ]}>
              <Text style={[
                styles.weightBadgeText,
                { color: weightChange <= 0 ? '#009050' : '#E53E3E' }
              ]}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </Text>
            </View>
          )}
        </View>
      </View>
    </ViewShot>
  );
}

const HALF_WIDTH = (CARD_WIDTH - 8) / 2;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#009050',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  imagesRow: {
    flexDirection: 'row',
    padding: 4,
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: HALF_WIDTH * 1.33,
    borderRadius: 8,
  },
  divider: {
    width: 4,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  overlayLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  overlayDay: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  journeyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
  },
  weightBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weightBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
