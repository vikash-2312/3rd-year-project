import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { format, subDays, isSameDay } from 'date-fns';
import { useTheme } from '../../lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ConsistencyHeatmapProps {
  activeDays: Set<string>;
}

export function ConsistencyHeatmap({ activeDays }: ConsistencyHeatmapProps) {
  const { colors, isDark } = useTheme();

  // Generate last 14 days
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      date,
      dateStr,
      isActive: activeDays.has(dateStr),
      label: format(date, 'EEEEE'), // Mon -> M, etc.
    };
  });

  const activeCount = last14Days.filter(d => d.isActive).length;
  const percentage = Math.round((activeCount / 14) * 100);

  return (
    <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Consistency</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Last 14 days</Text>
        </View>
        <View style={[styles.percentageBadge, { backgroundColor: isDark ? '#1A2F23' : '#F0FFF4' }]}>
          <Text style={[styles.percentageText, { color: colors.accent }]}>{percentage}%</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {last14Days.map((day, index) => (
          <View key={day.dateStr} style={styles.dayColumn}>
            <Animated.View 
              entering={FadeIn.delay(300 + index * 40)}
              style={[
                styles.square,
                { 
                  backgroundColor: day.isActive 
                    ? colors.accent 
                    : (isDark ? '#2D3748' : '#EDF2F7'),
                  opacity: day.isActive ? 1 : 0.6
                }
              ]} 
            />
            <Text style={[styles.dayLabel, { color: colors.textTertiary }]}>{day.label}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.footer}>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: isDark ? '#2D3748' : '#EDF2F7' }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Rest</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.accent, marginLeft: 12 }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Active</Text>
        </View>
        <Text style={[styles.motivationalText, { color: colors.accent }]}>
          {activeCount >= 10 ? 'Elite Performance! 🔥' : activeCount >= 7 ? 'Building Momentum 📈' : 'Take the first step today! 🚀'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  square: {
    width: (SCREEN_WIDTH - 80) / 14 - 4,
    height: (SCREEN_WIDTH - 80) / 14 - 4,
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  motivationalText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
