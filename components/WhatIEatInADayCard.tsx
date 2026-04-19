import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  SparklesIcon, 
  FlashIcon, 
  Restaurant01Icon,
  Coffee01Icon,
  FastFood01Icon 
} from '@hugeicons/core-free-icons';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width;

interface Log {
  id: string;
  type: string;
  name?: string;
  calories: number;
  imageUrl?: string;
  timestamp: any;
  mealType?: string;
}

interface WhatIEatInADayCardProps {
  logs: Log[];
  stats: {
    calories: number;
    targetCalories: number;
    healthScore: number;
  };
}

export const WhatIEatInADayCard: React.FC<WhatIEatInADayCardProps> = ({ logs, stats }) => {
  const dateStr = format(new Date(), 'EEEE, MMMM do');
  
  const foodLogs = logs
    .filter(log => log.type === 'food' || log.type === 'ai_log')
    .sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeA - timeB;
    });

  const getMealIcon = (log: Log) => {
    const name = (log.name || '').toLowerCase();
    if (name.includes('coffee') || name.includes('latte') || name.includes('tea')) return Coffee01Icon;
    if (name.includes('burger') || name.includes('pizza') || name.includes('fry') || name.includes('fries')) return FastFood01Icon;
    return Restaurant01Icon;
  };

  const getAccentColor = (index: number) => {
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];
    return colors[index % colors.length];
  };

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0B0F19']}
        style={styles.background}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.vlogTitle}>What I Eat In A Day</Text>
          <View style={styles.datePill}>
            <Text style={styles.dateLabel}>{dateStr.toUpperCase()}</Text>
            <View style={styles.dot} />
            <Text style={styles.calorieLabel}>{stats.calories} KCAL</Text>
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineContainer}>
          {foodLogs.length > 0 ? (
            foodLogs.map((log, index) => {
              const timeStr = log.timestamp?.seconds 
                ? format(new Date(log.timestamp.seconds * 1000), 'h:mm a')
                : '--:--';
              
              const isLast = index === foodLogs.length - 1;
              const accent = getAccentColor(index);

              return (
                <View key={log.id || index} style={styles.timelineItem}>
                  
                  {/* Left: Time */}
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{timeStr}</Text>
                  </View>

                  {/* Center: Marker & Line */}
                  <View style={styles.timelineCenter}>
                    <View style={[styles.markerOuter, { backgroundColor: accent + '20' }]}>
                      <View style={[styles.markerInner, { backgroundColor: accent }]} />
                    </View>
                    {!isLast && <View style={styles.verticalLine} />}
                  </View>

                  {/* Right: Content Card */}
                  <View style={styles.contentColumn}>
                    <View style={styles.mealCard}>
                      {log.imageUrl ? (
                        <Image source={{ uri: log.imageUrl }} style={styles.mealImage} />
                      ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: accent + '10' }]}>
                          <HugeiconsIcon icon={getMealIcon(log)} size={22} color={accent} />
                        </View>
                      )}
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName} numberOfLines={1}>
                          {log.name || 'Logged Meal'}
                        </Text>
                        <View style={styles.mealStats}>
                          <HugeiconsIcon icon={FlashIcon} size={11} color="#FBBF24" />
                          <Text style={styles.mealCalories}>{log.calories} kcal</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <HugeiconsIcon icon={Restaurant01Icon} size={32} color="#334155" />
              </View>
              <Text style={styles.emptyTitle}>No Meals Yet</Text>
              <Text style={styles.emptyText}>Log your first meal to build your timeline!</Text>
            </View>
          )}
        </View>

        {/* Footer Branding */}
        <View style={styles.footer}>
          <View style={styles.logoRow}>
            <HugeiconsIcon icon={SparklesIcon} size={16} color="#10B981" />
            <Text style={styles.logoText}>AI CAL TRACK</Text>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{stats.healthScore}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#0F172A',
  },
  background: {
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  vlogTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dateLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  calorieLabel: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },
  timelineContainer: {
    minHeight: 200,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeColumn: {
    width: 55,
    alignItems: 'flex-end',
    paddingTop: 16,
    paddingRight: 4,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timelineCenter: {
    width: 28,
    alignItems: 'center',
  },
  markerOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    zIndex: 2,
  },
  markerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verticalLine: {
    position: 'absolute',
    top: 30,
    bottom: -20,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    zIndex: 1,
  },
  contentColumn: {
    flex: 1,
    paddingRight: 4,
  },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  mealImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  imagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mealName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  mealStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealCalories: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  // Empty State
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    fontSize: 13,
  },
  // Footer
  footer: {
    paddingTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scoreBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  scoreText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
  }
});
