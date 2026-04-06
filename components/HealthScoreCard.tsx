import { Activity01Icon, BeefIcon, DropletIcon, FavouriteIcon, FireIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/ThemeContext';

interface HealthScoreCardProps {
  weightKg: number;
  protein: number;
  carbs: number;
  fat: number;
  exerciseMinutes: number;
  waterLiters: number;
  caloriesConsumed: number;
  calorieGoal: number;
}

export const HealthScoreCard = React.memo(({
  weightKg,
  protein,
  carbs,
  fat,
  exerciseMinutes,
  waterLiters,
  caloriesConsumed,
  calorieGoal,
}: HealthScoreCardProps) => {
  const { colors, isDark } = useTheme();
  
  // 1. Protein Score (0-20)
  const proteinTarget = weightKg * 1;
  const proteinScore = Math.min(protein / (proteinTarget || 1), 1) * 20;

  // 2. Macro Balance Score (0-20)
  const proteinCalories = protein * 4;
  const carbCalories = carbs * 4;
  const fatCalories = fat * 9;
  const totalMacroCalories = proteinCalories + carbCalories + fatCalories;

  let macroScore = 0;
  if (totalMacroCalories > 0) {
    const carbPercent = carbCalories / totalMacroCalories;
    const fatPercent = fatCalories / totalMacroCalories;

    // Ideal: Carbs 45-65%, Fat 20-35%
    if (carbPercent >= 0.45 && carbPercent <= 0.65 && fatPercent >= 0.20 && fatPercent <= 0.35) {
      macroScore = 20;
    } else if (carbPercent >= 0.40 && carbPercent <= 0.70 && fatPercent >= 0.15 && fatPercent <= 0.40) {
      macroScore = 15;
    } else if (carbPercent >= 0.35 && carbPercent <= 0.75 && fatPercent >= 0.10 && fatPercent <= 0.45) {
      macroScore = 10;
    } else {
      macroScore = 5;
    }
  }

  // 3. Exercise Score (0-20)
  let exerciseScore = 0;
  if (exerciseMinutes >= 45) exerciseScore = 20;
  else if (exerciseMinutes >= 30) exerciseScore = 15;
  else if (exerciseMinutes >= 20) exerciseScore = 10;
  else if (exerciseMinutes >= 10) exerciseScore = 5;
  else exerciseScore = 0;

  // 4. Hydration Score (0-20)
  const hydrationScore = Math.min(waterLiters / 2.5, 1) * 20;

  // 5. Calorie Balance Score (0-20)
  let calorieScore = 0;
  const calorieDiff = Math.abs(caloriesConsumed - calorieGoal);
  if (calorieGoal === 0) {
    calorieScore = 0; // Prevent score if no goal set
  } else if (calorieDiff < 200) {
    calorieScore = 20;
  } else if (calorieDiff < 400) {
    calorieScore = 15;
  } else if (calorieDiff < 700) {
    calorieScore = 10;
  } else {
    calorieScore = 5;
  }

  // Final Health Score
  const healthScore = Math.round(proteinScore + macroScore + exerciseScore + hydrationScore + calorieScore);

  // SVG Gauge Variables
  const size = 90;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  let scoreColor = '#E53E3E'; // Red for poor
  let scoreLabel = 'Poor';

  if (healthScore >= 90) {
    scoreColor = '#009050'; // Green for excellent
    scoreLabel = 'Excellent';
  } else if (healthScore >= 70) {
    scoreColor = '#3182CE'; // Blue for good
    scoreLabel = 'Good';
  } else if (healthScore >= 50) {
    scoreColor = '#D69E2E'; // Yellow for needs improvement
    scoreLabel = 'Needs improvement';
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.leftInfo}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
          <HugeiconsIcon icon={FavouriteIcon} size={20} color={isDark ? '#FC8181' : '#E53E3E'} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Health{"\n"}Score</Text>
      </View>

      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#EDF2F7"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Foreground Score Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.scoreTextContainer}>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>{healthScore}</Text>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    paddingHorizontal: 20,
    marginHorizontal: 24,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  leftInfo: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
    lineHeight: 20,
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
    maxWidth: 60,
    textAlign: 'center',
  },
});
