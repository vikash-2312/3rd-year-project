import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FoodScanStoryTemplateProps {
  imageUri: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * 1080x1920 AI Food Scan Social Story Template
 * Designed for viral AI reveal sharing
 */
export function FoodScanStoryTemplate({ 
  imageUri, 
  foodName, 
  calories, 
  protein, 
  carbs, 
  fat 
}: FoodScanStoryTemplateProps) {
  return (
    <View style={styles.container}>
      {/* Background with Meal Photo */}
      <ImageBackground
        source={{ uri: imageUri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* Futuristic Scanner Overlay (Top) */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent']}
          style={styles.topGradient}
        >
          <View style={styles.scanBadge}>
            <View style={styles.scanPulse} />
            <Text style={styles.scanText}>AI SCAN COMPLETE</Text>
          </View>
        </LinearGradient>

        {/* AI Visual Data Points (Scattered on image) */}
        <View style={styles.dataPointContainer}>
          {/* Subtle tech lines/overlay could go here */}
        </View>

        {/* Nutrition Reveal Card (Bottom) */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)']}
          style={styles.bottomCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.3 }}
        >
          <View style={styles.content}>
             {/* Food Name Header */}
            <View style={styles.headlineWrapper}>
              <View style={styles.categoryLine} />
              <Text style={styles.foodNameText} numberOfLines={1}>{foodName.toUpperCase()}</Text>
            </View>

            {/* Massive Calories */}
            <View style={styles.caloriesRow}>
              <Text style={styles.caloriesValue}>{calories}</Text>
              <View>
                <Text style={styles.kcalLabel}>KCAL</Text>
                <Text style={styles.verifiedText}>🔥 VERIFIED</Text>
              </View>
            </View>

            {/* Macros Chips */}
            <View style={styles.macrosContainer}>
              <View style={[styles.macroChip, { borderColor: '#FC8181' }]}>
                <Text style={styles.macroValue}>{protein}g</Text>
                <Text style={styles.macroLabel}>PROTEIN</Text>
              </View>
              <View style={[styles.macroChip, { borderColor: '#68D391' }]}>
                <Text style={styles.macroValue}>{carbs}g</Text>
                <Text style={styles.macroLabel}>CARBS</Text>
              </View>
              <View style={[styles.macroChip, { borderColor: '#F6AD55' }]}>
                <Text style={styles.macroValue}>{fat}g</Text>
                <Text style={styles.macroLabel}>FAT</Text>
              </View>
            </View>

            {/* Branding Footer */}
            <View style={styles.footer}>
              <View style={styles.brandingRow}>
                <View style={styles.logoCircle}>
                   <Text style={{ fontSize: 20 }}>🥗</Text>
                </View>
                <View>
                  <Text style={styles.appName}>AI CAL TRACK</Text>
                  <Text style={styles.appTagline}>Personalized AI Coaching</Text>
                </View>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>98.5% CONFIDENCE</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 1080,
    height: 1920,
    backgroundColor: '#000',
  },
  topGradient: {
    height: 300,
    paddingTop: 80,
    alignItems: 'center',
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#22D3EE',
  },
  scanPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22D3EE',
    marginRight: 12,
  },
  scanText: {
    color: '#22D3EE',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  dataPointContainer: {
    flex: 1,
  },
  bottomCard: {
    height: 850,
    justifyContent: 'flex-end',
    paddingBottom: 80,
  },
  content: {
    paddingHorizontal: 60,
  },
  headlineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryLine: {
    width: 40,
    height: 6,
    backgroundColor: '#22D3EE',
    marginRight: 20,
    borderRadius: 3,
  },
  foodNameText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -1,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 50,
    gap: 20,
  },
  caloriesValue: {
    color: '#FFFFFF',
    fontSize: 180,
    lineHeight: 180,
    fontWeight: '900',
    letterSpacing: -6,
  },
  kcalLabel: {
    color: '#94A3B8',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  verifiedText: {
    color: '#22D3EE',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 60,
  },
  macroChip: {
    flex: 1,
    borderLeftWidth: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 24,
    borderRadius: 20,
  },
  macroValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
  },
  macroLabel: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 40,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22D3EE',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  appTagline: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
