import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

type WaterCardProps = {
  targetLiters: number;
  consumedLiters: number;
};

export function WaterCard({ targetLiters, consumedLiters }: WaterCardProps) {
  const { colors } = useTheme();
  const GLASS_VOLUME_L = 0.25;
  const MAX_GLASSES = 9;
  
  const totalTargetGlasses = Math.ceil(targetLiters / GLASS_VOLUME_L);
  const totalConsumedGlasses = consumedLiters / GLASS_VOLUME_L;
  const displayGlasses = Math.min(totalTargetGlasses, MAX_GLASSES);
  const remainingCalculated = Math.max(0, totalTargetGlasses - totalConsumedGlasses);

  const renderGlasses = () => {
    const glasses = [];
    for (let i = 0; i < displayGlasses; i++) {
      let src;
      let isOpacity = false;
      const glassValue = i + 1;
      if (totalConsumedGlasses >= glassValue) {
        src = require('../assets/images/full_glass.png');
      } else if (totalConsumedGlasses >= glassValue - 0.5) {
        src = require('../assets/images/half_glass.png');
      } else {
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
    <View style={[styles.cardContainer, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.titleText, { color: colors.text }]}>Water</Text>
          <Text style={[styles.intakeText, { color: colors.textTertiary }]}>
            {Math.round(consumedLiters * 1000)}ml / {Math.round(targetLiters * 1000)}ml
          </Text>
        </View>
      </View>

      <View style={styles.glassesRow}>
        {renderGlasses()}
      </View>

      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.remainingText, { color: colors.textTertiary }]}>
          {remainingCalculated <= 0 ? (
            <Text style={[styles.goalReachedText, { color: colors.accent }]}>Goal reached! 🎉</Text>
          ) : (
            `${remainingCalculated} ${remainingCalculated === 1 ? 'glass' : 'glasses'} left`
          )}
        </Text>
      </View>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GLASS_SIZE = (SCREEN_WIDTH - 48 - 40 - 64) / 9; // screen - card margin - card padding - gaps

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    marginTop: 16,
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
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  intakeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 8,
  },
  glassesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  glassIcon: {
    width: GLASS_SIZE,
    height: 40,
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

