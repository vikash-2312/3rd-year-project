import { useUser } from "@clerk/expo";
import { CheckmarkCircle02Icon, ChampionIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { addDays, format, isSameDay, startOfWeek, subDays } from "date-fns";
import { useRouter } from "expo-router";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, View, TouchableOpacity, Modal, Pressable } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../lib/firebase";

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Analytics() {
  const { user } = useUser();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [weekActivity, setWeekActivity] = useState<Set<string>>(new Set());
  const [dailyConsumed, setDailyConsumed] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [dailyBurned, setDailyBurned] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreakModalVisible, setIsStreakModalVisible] = useState(false);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  useEffect(() => {
    if (!user) return;

    // 1. Fetch User Data (Weight)
    const userRef = doc(db, 'users', user.id);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    // 2. Fetch Weekly Logs for Streak and Energy
    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id),
      where('date', '>=', startStr),
      where('date', '<=', endStr)
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const activeDays = new Set<string>();
      const consumedByDay: Record<string, number> = {};
      const burnedByDay: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date) {
          activeDays.add(data.date);
          const cal = data.calories || 0;
          
          if (data.type === 'food') {
            consumedByDay[data.date] = (consumedByDay[data.date] || 0) + cal;
          } else if (data.type === 'exercise') {
            burnedByDay[data.date] = (burnedByDay[data.date] || 0) + cal;
          }
        }
      });

      setWeekActivity(activeDays);

      // Map calories to the 7-day array
      const consArr = weekDays.map(d => Math.round(consumedByDay[format(d, 'yyyy-MM-dd')] || 0));
      const burnArr = weekDays.map(d => Math.round(burnedByDay[format(d, 'yyyy-MM-dd')] || 0));
      
      setDailyConsumed(consArr);
      setDailyBurned(burnArr);
      setIsLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribeLogs();
    };
  }, [user]);

  // Calculate Streak Count (Consecutive days ending today or yesterday)
  const calculateStreak = () => {
    let count = 0;
    let checkDate = today;
    
    // Check today first
    if (weekActivity.has(format(today, 'yyyy-MM-dd'))) {
      count++;
      checkDate = subDays(today, 1);
    } else {
      // If no activity today, check yesterday to see if streak is still alive
      checkDate = subDays(today, 1);
      if (!weekActivity.has(format(checkDate, 'yyyy-MM-dd'))) {
        return 0; // Streak broken
      }
    }

    // Iterate backward
    while (count < 7) {
      if (weekActivity.has(format(checkDate, 'yyyy-MM-dd'))) {
        count++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return count;
  };

  const streakCount = calculateStreak();
  const weight = userData?.profile?.measurements?.weightKg || userData?.onboarding_weight || "--";
  
  const totalConsumed = dailyConsumed.reduce((a, b) => a + b, 0);
  const totalBurned = dailyBurned.reduce((a, b) => a + b, 0);
  const netEnergy = totalConsumed - totalBurned;

  // Interleave data for side-by-side bars: [cons, burn, cons, burn, ...]
  const interleavedData: number[] = [];
  const interleavedLabels: string[] = [];
  const interleavedColors: string[] = [];

  weekDays.forEach((_, i) => {
    interleavedData.push(dailyConsumed[i]);
    interleavedData.push(dailyBurned[i]);
    interleavedLabels.push(weekDayLabels[i]);
    interleavedLabels.push(""); // Empty label for the second bar of the day
    interleavedColors.push("#009050"); // Consumed
    interleavedColors.push("#E53E3E"); // Burned
  });

  const energyChartData = {
    labels: interleavedLabels,
    datasets: [
      {
        data: interleavedData,
        colors: interleavedColors.map(color => (opacity = 1) => color)
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(45, 55, 72, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(113, 128, 150, ${opacity})`,
    barPercentage: 0.7, // Slightly wider bars for the interleaved view
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: '#EDF2F7',
    },
  };

  if (isLoading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009050" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Progress</Text>

        <View style={styles.row}>
          {/* Daily Streak Card */}
          <TouchableOpacity 
            style={[styles.card, styles.halfCard]} 
            onPress={() => setIsStreakModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Image 
                source={require('../../assets/images/fire.png')} 
                style={styles.fireIcon} 
                resizeMode="contain"
              />
            </View>
            <Text style={styles.cardTitle}>Day Streak</Text>
            
            <View style={styles.streakValueContainer}>
              <Text style={styles.streakValue}>{streakCount}</Text>
              <Text style={styles.streakUnit}>days</Text>
            </View>

            <View style={styles.streakGrid}>
              {weekDays.map((date, index) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isActive = weekActivity.has(dateStr);
                const isToday = isSameDay(date, today);

                return (
                  <View key={index} style={styles.dayColumn}>
                    <View style={[
                      styles.checkBox, 
                      isActive && styles.checkBoxActive,
                      isToday && !isActive && styles.checkBoxToday
                    ]}>
                      {isActive && (
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                      {weekDayLabels[index]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>

          {/* My Weight Card */}
          <TouchableOpacity 
            style={[styles.card, styles.halfCard]}
            onPress={() => router.push('/update-weight' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F0FFF4' }]}>
               <HugeiconsIcon icon={ChampionIcon} size={24} color="#009050" />
            </View>
            <Text style={styles.cardTitle}>My Weight</Text>
            <View style={styles.weightValueContainer}>
              <Text style={styles.weightValue}>{weight}</Text>
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            <Text style={styles.weightSubtitle}>Current Status</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Energy Card */}
        <View style={[styles.card, styles.energyCard]}>
          <Text style={styles.cardHeaderTitle}>Weekly Energy</Text>
          
          <View style={styles.energyStatsRow}>
            <View style={styles.energyStatItem}>
              <Text style={[styles.energyStatValue, styles.burnedValue]}>{totalBurned.toLocaleString()}</Text>
              <Text style={styles.energyStatLabel}>Burned</Text>
            </View>
            <View style={styles.energyStatDivider} />
            <View style={styles.energyStatItem}>
              <Text style={[styles.energyStatValue, styles.consumedValue]}>{totalConsumed.toLocaleString()}</Text>
              <Text style={styles.energyStatLabel}>Consumed</Text>
            </View>
            <View style={styles.energyStatDivider} />
            <View style={styles.energyStatItem}>
              <Text style={[styles.energyStatValue, styles.netValue]}>
                {netEnergy > 0 ? `+${netEnergy.toLocaleString()}` : netEnergy.toLocaleString()}
              </Text>
              <Text style={styles.energyStatLabel}>Net Energy</Text>
            </View>
          </View>

          <View style={styles.chartWrapper}>
            <BarChart
              data={energyChartData}
              width={SCREEN_WIDTH - 32} // More width for 14 bars
              height={220}
              chartConfig={chartConfig}
              style={styles.energyChart}
              fromZero
              showValuesOnTopOfBars={true}
              withCustomBarColorFromData={true}
              flatColor={true}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>

          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: '#009050' }]} />
              <Text style={styles.legendText}>Consumed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: '#E53E3E' }]} />
              <Text style={styles.legendText}>Burned</Text>
            </View>
          </View>
        </View>

        {/* Streak Detail Modal */}
        <Modal
          visible={isStreakModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsStreakModalVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setIsStreakModalVisible(false)}
          >
            <Pressable style={styles.modalDialog} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Daily Streak Details</Text>
                <TouchableOpacity onPress={() => setIsStreakModalVisible(false)}>
                  <HugeiconsIcon icon={Cancel01Icon} size={24} color="#2D3748" />
                </TouchableOpacity>
              </View>

              <View style={styles.bigCard}>
                <View style={[styles.iconContainer, { width: 60, height: 60, borderRadius: 20 }]}>
                  <Image 
                    source={require('../../assets/images/fire.png')} 
                    style={{ width: 32, height: 32 }} 
                    resizeMode="contain"
                  />
                </View>
                
                <View style={styles.streakMainRow}>
                  <View>
                    <Text style={styles.bigStreakCount}>{streakCount}</Text>
                    <Text style={styles.bigStreakLabel}>Day Streak</Text>
                  </View>
                  
                  <View style={styles.streakChip}>
                    <Text style={styles.streakChipText}>Keep it Going 🔥</Text>
                  </View>
                </View>

                <View style={[styles.streakGrid, { marginTop: 24 }]}>
                  {weekDays.map((date, index) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isActive = weekActivity.has(dateStr);
                    const isToday = isSameDay(date, today);

                    return (
                      <View key={index} style={[styles.dayColumn, { gap: 8 }]}>
                        <View style={[
                          styles.checkBox, 
                          { width: 28, height: 28, borderRadius: 8 },
                          isActive && styles.checkBoxActive,
                          isToday && !isActive && styles.checkBoxToday
                        ]}>
                          {isActive && (
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="#FFFFFF" />
                          )}
                        </View>
                        <Text style={[styles.dayLabel, { fontSize: 12 }, isToday && styles.dayLabelToday]}>
                          {weekDayLabels[index]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12, // Reduced padding to prevent overlap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  halfCard: {
    flex: 1,
    minHeight: 185,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  fireIcon: {
    width: 24,
    height: 24,
  },
  weightEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
  },
  streakGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  checkBox: {
    width: 18, // Slightly smaller to fit in row
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#EDF2F7',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  checkBoxToday: {
    borderColor: '#009050',
    borderStyle: 'dashed',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A0AEC0',
  },
  dayLabelToday: {
    color: '#009050',
  },
  weightValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  weightValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D3748',
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 4,
  },
  weightSubtitle: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 8,
    fontWeight: '500',
  },
  streakValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D3748',
  },
  streakUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 4,
  },

  // Chart Card Styles
  chartCard: {
    marginTop: 16,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
    marginTop: 2,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -16,
  },

  // Energy Card Styles
  energyCard: {
    marginTop: 20,
    padding: 20,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 20,
  },
  energyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  energyStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  energyStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
  },
  burnedValue: {
    color: '#E53E3E',
  },
  consumedValue: {
    color: '#009050',
  },
  netValue: {
    color: '#D69E2E', // Solid yellow/gold for readability
  },
  energyStatLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    marginTop: 4,
  },
  energyStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EDF2F7',
  },
  chartWrapper: {
    alignItems: 'center',
    marginLeft: -16, // Adjust for chart padding
  },
  energyChart: {
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 55, 72, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDialog: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
  },
  bigCard: {
    width: '100%',
  },
  streakMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  bigStreakCount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#2D3748',
  },
  bigStreakLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#718096',
    marginTop: -4,
  },
  streakChip: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  streakChipText: {
    color: '#E53E3E',
    fontWeight: '700',
    fontSize: 14,
  },
  modalFooter: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    alignItems: 'center',
  },
  footerInfo: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  }
});
