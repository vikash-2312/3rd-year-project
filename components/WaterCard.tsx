import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type WaterCardProps = {
  targetLiters: number;
  consumedLiters: number;
};

export function WaterCard({ targetLiters, consumedLiters }: WaterCardProps) {
  const GLASS_VOLUME_L = 0.25; // 250ml per glass
  const MAX_GLASSES = 16; // Max 8 per row, max 2 rows
  
  const totalTargetGlasses = Math.ceil(targetLiters / GLASS_VOLUME_L);
  const totalConsumedGlasses = consumedLiters / GLASS_VOLUME_L;
  
  // Cap at 16 glasses to fit the UI constraint
  const displayGlasses = Math.min(totalTargetGlasses, MAX_GLASSES);
  
  // Remaining calculation based on volume rather than pure glass count
  const remainingLiters = Math.max(0, targetLiters - consumedLiters);
  const remainingCalculated = Math.max(0, Math.ceil(remainingLiters / GLASS_VOLUME_L));

  const renderGlasses = () => {
    const glasses = [];
    for (let i = 0; i < displayGlasses; i++) {
      let src;
      let isOpacity = false;
      
      const glassValue = i + 1;
      if (totalConsumedGlasses >= glassValue) {
        // Full glass
        src = require('../assets/images/full_glass.png');
      } else if (totalConsumedGlasses >= glassValue - 0.5) {
        // Half glass
        src = require('../assets/images/half_glass.png');
      } else {
        // Empty glass (Since empty_glass.png was not found in assets, rendering full glass with low opacity)
        src = require('../assets/images/full_glass.png');
        isOpacity = true;
      }

      glasses.push(
        <Image 
          key={i} 
          source={src} 
          style={[styles.glassIcon, isOpacity && styles.emptyGlass]} 
          resizeMode="contain"
        />
      );
    }
    return glasses;
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.titleText}>Water</Text>
        </View>
        <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
          <HugeiconsIcon icon={PencilEdit02Icon} size={20} color="#009050" />
        </TouchableOpacity>
      </View>

      {/* Glasses Area */}
      <View style={styles.glassesContainer}>
        {renderGlasses()}
      </View>

      {/* Footer Text */}
      <View style={styles.footerRow}>
        <Text style={styles.remainingText}>
          {remainingCalculated} {remainingCalculated === 1 ? 'glass' : 'glasses'} left
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    marginTop: 16,
    // Soft shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748', // Black/Dark gray matches the Calories card
  },
  editButton: {
    padding: 4,
  },
  glassesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Align to left since they are small
    gap: 8, // Spacing between glasses
    marginBottom: 20,
  },
  glassIcon: {
    width: 28, 
    height: 38,
  },
  emptyGlass: {
    opacity: 0.2, // Visual representation for empty glass since no asset is provided
    tintColor: '#A0AEC0', 
  },
  footerRow: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC'
  },
  remainingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  }
});
