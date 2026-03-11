import { AvocadoIcon, BeefIcon, Bread01Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SegmentedHalfCircleProgress30 } from './Halfprogress'; // Adjust path if needed

type CaloriesCardProps = {
  // We can add props here later (e.g., target, consumed)
  // For now, these are static as per the plan
  remaining: number;
  progress: number; // 0 to 1
  protein: number;
  carbs: number;
  fats: number;
};

export function CaloriesCard({ remaining, progress, protein, carbs, fats }: CaloriesCardProps) {
  return (
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {/* <FireIcon size={20} color="#FF6B6B" variant="solid" style={styles.iconSpaced} /> */}
          <Text style={styles.titleText}>Calories</Text>
        </View>
        <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
          <HugeiconsIcon icon={PencilEdit02Icon} size={20} color="#A0AEC0" />
        </TouchableOpacity>
      </View>

      {/* Progress Arc Area */}
      <View style={styles.progressContainer}>
        <SegmentedHalfCircleProgress30
          progress={progress}
          size={270}
          strokeWidth={40}
          segments={15}
          gapAngle={24}
          value={remaining}
          label="Remaining"
        />
      </View>

      {/* Macronutrient Row */}
      <View style={styles.macroRow}>
        {/* Protein Block */}
        <View style={[styles.macroBlock, styles.proteinBlock]}>
          <HugeiconsIcon icon={BeefIcon} size={20} color="#E53E3E" />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: '#E53E3E' }]}>{protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
        </View>

        {/* Carbs Block */}
        <View style={[styles.macroBlock, styles.carbsBlock]}>
          <HugeiconsIcon icon={Bread01Icon} size={20} color="#DD6B20" />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: '#DD6B20' }]}>{carbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
        </View>

        {/* Fats Block */}
        <View style={[styles.macroBlock, styles.fatsBlock]}>
          <HugeiconsIcon icon={AvocadoIcon} size={20} color="#38B2AC" />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: '#38B2AC' }]}>{fats}g</Text>
            <Text style={styles.macroLabel}>Fats</Text>
          </View>
        </View>
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
    marginBottom: 24,
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
  editButton: {
    padding: 4,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
    // height: 100 // Space between arc and macros
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    height: 70,
    flex: 1,
    marginHorizontal: 4, // Spacing between blocks
  },
  macroTextContainer: {
    marginLeft: 8,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  macroLabel: {
    fontSize: 10,
    color: '#718096',
    marginTop: 2,
  },
  proteinBlock: {
    backgroundColor: '#FFF5F5', // Light red/pink
  },
  carbsBlock: {
    backgroundColor: '#FFFBEB', // Light yellow/orange
  },
  fatsBlock: {
    backgroundColor: '#E6FFFA', // Light teal
  },
});
