import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type WaterCardProps = {
  targetLiters: number;
  consumedLiters: number;
};

export function WaterCard({ targetLiters, consumedLiters }: WaterCardProps) {
  const GLASS_VOLUME_L = 0.25; // 250ml per glass
  const MAX_GLASSES = 16; // Max 8 per row, max 2 rows
  
  const totalTargetGlasses = Math.ceil(targetLiters / GLASS_VOLUME_L);
  const totalConsumedGlasses = consumedLiters / GLASS_VOLUME_L;
  
  // Cap at 16 glasses to fit the UI constraint (2 rows of 8)
  const displayGlasses = Math.min(totalTargetGlasses, MAX_GLASSES);
  
  // Remaining calculation based on glasses
  const remainingCalculated = Math.max(0, totalTargetGlasses - totalConsumedGlasses);

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
        // Empty glass (Fallback since empty_glass.png was not found)
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
          <Text style={styles.intakeText}>
            {Math.round(consumedLiters * 1000)}ml / {Math.round(targetLiters * 1000)}ml
          </Text>
        </View>
        <View style={styles.editButton}>
          <HugeiconsIcon icon={PencilEdit02Icon} size={20} color="#009050" />
        </View>
      </View>

      {/* Glasses Area - 2 Rows of 8 */}
      <View style={styles.glassesContainer}>
        {renderGlasses()}
      </View>

      {/* Footer Text */}
      <View style={styles.footerRow}>
        <Text style={styles.remainingText}>
          {remainingCalculated <= 0 ? (
            <Text style={styles.goalReachedText}>Goal reached! 🎉</Text>
          ) : (
            `${remainingCalculated} ${remainingCalculated === 1 ? 'glass' : 'glasses'} left`
          )}
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
  intakeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 8,
  },
  editButton: {
    padding: 4,
  },
  glassesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 20,
  },
  glassIcon: {
    width: (Dimensions.get('window').width - 150) / 8, 
    height: 42,
  },
  emptyGlass: {
    opacity: 0.1, 
    tintColor: '#D1D5DB', 
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
  },
  goalReachedText: {
    color: '#009050',
    fontWeight: '700',
  }
});
