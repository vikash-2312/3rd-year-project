import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Reanimated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withDelay, 
  withSpring 
} from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Add01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type WaterCardProps = {
  targetLiters: number;
  consumedLiters: number;
  onQuickLog?: (liters: number) => void;
  onUndo?: () => void;
  isToday?: boolean;
  isFuture?: boolean;
  dateLabel?: string;
};

import * as Haptics from 'expo-haptics';

const GLASS_VOLUME_L = 0.25;

const AnimatedGlass = ({ index, source, opacity, totalConsumedGlasses }: { index: number, source: any, opacity: boolean, totalConsumedGlasses: number }) => {
  const scale = useSharedValue(0.5);
  const glassOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 50, withSpring(1));
    glassOpacity.value = withDelay(index * 50, withSpring(opacity ? 0.1 : 1));
  }, [totalConsumedGlasses, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: glassOpacity.value,
  }));

  return (
    <Reanimated.View style={animatedStyle}>
      <Image 
        source={source} 
        style={[styles.glassIcon, opacity && styles.emptyGlass]} 
        resizeMode="contain"
      />
    </Reanimated.View>
  );
};

export const WaterCard = React.memo(({ 
  targetLiters, 
  consumedLiters, 
  onQuickLog, 
  onUndo,
  isToday = true,
  isFuture = false,
  dateLabel
}: WaterCardProps) => {
  const { colors, isDark } = useTheme();
  
  const totalTargetGlasses = Math.ceil(targetLiters / GLASS_VOLUME_L);
  const totalConsumedGlasses = consumedLiters / GLASS_VOLUME_L;
  const remainingCalculated = Math.max(0, totalTargetGlasses - totalConsumedGlasses);
  const percentage = Math.min(100, Math.round((consumedLiters / targetLiters) * 100));


  const GLASSES_PER_ROW = 8;

  const renderGlasses = () => {
    const glasses = [];
    
    // Determine how many glasses to show: start with 8 (one row), 
    // and add 8 more only if the current row is completely filled.
    let displayCount = GLASSES_PER_ROW;
    while (totalConsumedGlasses > displayCount && displayCount < totalTargetGlasses) {
      displayCount += GLASSES_PER_ROW;
    }
    
    // Cap displayCount at the total target, but always show at least one row if the target is small
    const finalShowCount = Math.min(displayCount, totalTargetGlasses);

    for (let i = 0; i < finalShowCount; i++) {
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
        <AnimatedGlass 
          key={i} 
          index={i}
          source={src} 
          opacity={isOpacity}
          totalConsumedGlasses={totalConsumedGlasses}
        />
      );
    }
    return glasses;
  };

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
      {isDark && (
        <LinearGradient
          colors={['rgba(255,255,255,0.02)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.titleText, { color: colors.text }]}>Water</Text>
          <Text style={[styles.intakeText, { color: colors.textTertiary }]}>
            {Math.round(consumedLiters * 1000)}ml / {Math.round(targetLiters * 1000)}ml
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {(isFuture || !isToday) && dateLabel && (
            <View style={[styles.dateBadge, { backgroundColor: isFuture ? colors.textTertiary + '15' : colors.warning + '15' }]}>
               <Text style={[styles.dateBadgeText, { color: isFuture ? colors.textTertiary : colors.warning }]}>
                 {isFuture ? 'FUTURE' : dateLabel}
               </Text>
            </View>
          )}
          <View style={[styles.percentageBadge, { backgroundColor: colors.blue + '10' }]}>
             <Text style={[styles.percentageText, { color: colors.blue }]}>{percentage}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.glassesRow}>
        {renderGlasses()}
      </View>

      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <View style={styles.remainingWrapper}>
           <Text style={[styles.remainingText, { color: colors.textTertiary }]}>
            {remainingCalculated <= 0 ? (
              <Text style={[styles.goalReachedText, { color: colors.accent }]}>Goal reached! 🎉</Text>
            ) : (
              `${remainingCalculated} ${remainingCalculated === 1 ? 'glass' : 'glasses'} left`
            )}
          </Text>
        </View>

        <View style={[styles.quickLogActions, isFuture && { opacity: 0.5 }]}>
          <TouchableOpacity 
            style={[styles.quickButton, { backgroundColor: colors.blue + '15' }]} 
            onPress={() => {
              if (isFuture) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onQuickLog?.(GLASS_VOLUME_L);
            }}
            disabled={isFuture}
            activeOpacity={0.7}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} color={colors.blue} />
            <Text style={[styles.quickButtonText, { color: colors.blue }]}>250ml</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.undoButton, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]} 
            onPress={() => !isFuture && onUndo?.()}
            disabled={isFuture}
            activeOpacity={0.7}
          >
             <HugeiconsIcon icon={ArrowLeft01Icon} size={14} color={colors.textTertiary} />
             <Text style={[styles.undoButtonText, { color: colors.textTertiary }]}>Undo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const SCREEN_WIDTH = Dimensions.get('window').width;
const GLASS_SIZE = (SCREEN_WIDTH - 48 - 40 - 56) / 8; // Adjust for 8 per row

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
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '800',
  },
  glassesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC'
  },
  remainingWrapper: {
    flex: 1,
  },
  remainingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  goalReachedText: {
    color: '#009050',
    fontWeight: '700',
  },
  quickLogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickButtonWrapper: {
    alignItems: 'center',
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  hintText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 4,
  },
  undoButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(214, 158, 46, 0.2)',
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  }
});
