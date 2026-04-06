import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { ProgressPhoto, getDayNumber } from '../../services/progressPhotoService';
import { LinearGradient } from 'expo-linear-gradient';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

interface ShareStoryTemplateProps {
  beforePhoto: ProgressPhoto;
  afterPhoto: ProgressPhoto;
  firstPhoto: ProgressPhoto;
  totalWeightChange: string;
}

/**
 * A ultra-premium 9:16 layout designed specifically for social media (Instagram/WhatsApp).
 * This component is intended to be rendered off-screen and captured by react-native-view-shot.
 */
export function ShareStoryTemplate({ beforePhoto, afterPhoto, firstPhoto, totalWeightChange }: ShareStoryTemplateProps) {
  const beforeDay = getDayNumber(beforePhoto, firstPhoto);
  const afterDay = getDayNumber(afterPhoto, firstPhoto);
  const dayDiff = afterDay - beforeDay;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1A2F23', '#000000']} // Deep emerald/black gradient
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>AI CAL TRACK</Text>
        <Text style={styles.headerTitle}>MY TRANSFORMATION</Text>
        <View style={styles.headerDivider} />
      </View>

      {/* Photo Comparison Section */}
      <View style={styles.photoSection}>
        {/* Before */}
        <View style={styles.photoWrapper}>
          <Image source={{ uri: beforePhoto.imageUrl }} style={styles.photo} resizeMode="cover" />
          <View style={styles.photoLabelContainer}>
            <Text style={styles.photoLabelText}>BEFORE</Text>
            <Text style={styles.photoDayText}>DAY {beforeDay}</Text>
          </View>
        </View>

        {/* After */}
        <View style={styles.photoWrapper}>
          <Image source={{ uri: afterPhoto.imageUrl }} style={styles.photo} resizeMode="cover" />
          <View style={styles.photoLabelContainer}>
            <Text style={[styles.photoLabelText, { color: '#00F5D4' }]}>AFTER</Text>
            <Text style={styles.photoDayText}>DAY {afterDay}</Text>
          </View>
        </View>
      </View>

      {/* Stats Footer */}
      <View style={styles.footer}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>TOTAL LOST</Text>
          <Text style={styles.statValue}>{totalWeightChange} KG</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{dayDiff} DAYS OF PROGRESS</Text>
          <View style={styles.metaDivider} />
          <Text style={styles.metaText}>TRACKED WITH AI</Text>
        </View>

        <Text style={styles.branding}>Transforming with AI Calorie Tracker</Text>
      </View>

      {/* Decor elements */}
      <View style={[styles.glow, { top: '20%', left: '10%' }]} />
      <View style={[styles.glow, { bottom: '15%', right: '10%', backgroundColor: '#00F5D4' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    backgroundColor: '#000000',
    padding: 60,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  headerLabel: {
    color: '#00F5D4',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerDivider: {
    width: 120,
    height: 6,
    backgroundColor: '#00F5D4',
    marginTop: 24,
    borderRadius: 3,
  },
  photoSection: {
    flex: 1,
    marginVertical: 60,
    gap: 30,
    flexDirection: 'row',
  },
  photoWrapper: {
    flex: 1,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoLabelContainer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  photoLabelText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  photoDayText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statPill: {
    backgroundColor: 'rgba(0,245,212,0.15)',
    paddingHorizontal: 48,
    paddingVertical: 24,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#00F5D4',
    alignItems: 'center',
    marginBottom: 40,
  },
  statLabel: {
    color: '#00F5D4',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  metaText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  metaDivider: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  branding: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  glow: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: '#009050',
    opacity: 0.1,
    zIndex: -1,
  },
});
