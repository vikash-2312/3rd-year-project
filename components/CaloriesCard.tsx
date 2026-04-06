import { BeefIcon, Bread01Icon, AvocadoIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Reanimated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withDelay 
} from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';
import { SegmentedHalfCircleProgress30 } from './Halfprogress';

type CaloriesCardProps = {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  remaining: number;
  progress: number; // 0 to 1
  protein: number;
  carbs: number;
  fats: number;
  targetWaterLiters: number;
};

export const CaloriesCard = React.memo(({
  targetCalories, targetProtein, targetCarbs, targetFats, targetWaterLiters,
  remaining, progress, protein, carbs, fats
}: CaloriesCardProps) => {
  const { colors, isDark } = useTheme();

  const AnimatedMacro = ({ children, index }: { children: React.ReactNode, index: number }) => {
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);

    useEffect(() => {
      scale.value = withDelay(400 + index * 100, withSpring(1));
      opacity.value = withDelay(400 + index * 100, withSpring(1));
    }, []);

    const style = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      flex: 1,
    }));

    return <Reanimated.View style={style}>{children}</Reanimated.View>;
  };

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.titleText, { color: colors.text }]}>Calories</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <SegmentedHalfCircleProgress30
          progress={progress}
          size={Math.min(270, Dimensions.get('window').width - 100)} // Responsive size
          strokeWidth={Math.min(40, (Dimensions.get('window').width - 100) * 0.15)} // Responsive stroke
          segments={15}
          gapAngle={25}
          value={remaining}
          label="Remaining"
        />
      </View>

      <View style={styles.macroRow}>
        <AnimatedMacro index={0}>
          <View style={[styles.macroBlock, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
            <HugeiconsIcon icon={BeefIcon} size={20} color={isDark ? '#FC8181' : '#E53E3E'} />
            <View style={styles.macroTextContainer}>
              <Text style={[styles.macroValue, { color: isDark ? '#FC8181' : '#E53E3E' }]}>{protein}g</Text>
              <Text style={[styles.macroLabel, { color: colors.textTertiary }]}>Protein</Text>
            </View>
          </View>
        </AnimatedMacro>

        <AnimatedMacro index={1}>
          <View style={[styles.macroBlock, { backgroundColor: isDark ? '#3B2A1A' : '#FFFBEB' }]}>
            <HugeiconsIcon icon={Bread01Icon} size={20} color={isDark ? '#FBD38D' : '#DD6B20'} />
            <View style={styles.macroTextContainer}>
              <Text style={[styles.macroValue, { color: isDark ? '#FBD38D' : '#DD6B20' }]}>{carbs}g</Text>
              <Text style={[styles.macroLabel, { color: colors.textTertiary }]}>Carbs</Text>
            </View>
          </View>
        </AnimatedMacro>

        <AnimatedMacro index={2}>
          <View style={[styles.macroBlock, { backgroundColor: isDark ? '#1A3B35' : '#E6FFFA' }]}>
            <HugeiconsIcon icon={AvocadoIcon} size={20} color={isDark ? '#4FD1C5' : '#38B2AC'} />
            <View style={styles.macroTextContainer}>
              <Text style={[styles.macroValue, { color: isDark ? '#4FD1C5' : '#38B2AC' }]}>{fats}g</Text>
              <Text style={[styles.macroLabel, { color: colors.textTertiary }]}>Fats</Text>
            </View>
          </View>
        </AnimatedMacro>
      </View>
    </View>
  );
});

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
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroBlock: {
    flexDirection: Dimensions.get('window').width < 360 ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Dimensions.get('window').width < 360 ? 4 : 12,
    borderRadius: 16,
    height: Dimensions.get('window').width < 360 ? 80 : 70,
    flex: 1,
    marginHorizontal: Dimensions.get('window').width < 360 ? 2 : 4,
  },
  macroTextContainer: {
    marginLeft: Dimensions.get('window').width < 360 ? 0 : 8,
    marginTop: Dimensions.get('window').width < 360 ? 4 : 0,
    alignItems: Dimensions.get('window').width < 360 ? 'center' : 'flex-start',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  macroLabel: {
    fontSize: 10,
    color: '#718096',
    marginTop: 2,
  }
});
