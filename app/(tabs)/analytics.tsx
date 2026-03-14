import { useUser } from "@clerk/expo";
import { CheckmarkCircle02Icon, ChampionIcon, Cancel01Icon, FireIcon, Apple01Icon, Activity01Icon, DropletIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { addDays, format, isSameDay, startOfWeek, subDays } from "date-fns";
import { useRouter } from "expo-router";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, View, TouchableOpacity, Modal, Pressable } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../lib/firebase";
import { useTheme } from "../../lib/ThemeContext";

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Analytics() {
  const { user } = useUser();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [userData, setUserData] = useState<any>(null);
  const [weekActivity, setWeekActivity] = useState<Set<string>>(new Set());
  const [dailyConsumed, setDailyConsumed] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [dailyBurned, setDailyBurned] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [dailyWater, setDailyWater] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
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

    // Fetch all user logs to calculate true historical streak
    // Weekly charts will automatically filter relevant dates via `weekDays.map`
    const logsQuery = query(
      collection(db, 'logs'),
      where('userId', '==', user.id)
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const activeDays = new Set<string>();
      const consumedByDay: Record<string, number> = {};
      const burnedByDay: Record<string, number> = {};
      const waterByDay: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date) {
          activeDays.add(data.date);
          const cal = data.calories || 0;
          
          if (data.type === 'food') {
            consumedByDay[data.date] = (consumedByDay[data.date] || 0) + cal;
          } else if (data.type === 'exercise') {
            burnedByDay[data.date] = (burnedByDay[data.date] || 0) + cal;
          } else if (data.type === 'water') {
            waterByDay[data.date] = (waterByDay[data.date] || 0) + (data.waterLiters || 0);
          }
        }
      });

      setWeekActivity(activeDays);

      // Map calories and water to the 7-day array
      const consArr = weekDays.map(d => Math.round(consumedByDay[format(d, 'yyyy-MM-dd')] || 0));
      const burnArr = weekDays.map(d => Math.round(burnedByDay[format(d, 'yyyy-MM-dd')] || 0));
      const waterArr = weekDays.map(d => Number((waterByDay[format(d, 'yyyy-MM-dd')] || 0).toFixed(1)));
      
      setDailyConsumed(consArr);
      setDailyBurned(burnArr);
      setDailyWater(waterArr);
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

    // Iterate backward through all active days
    while (true) {
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

  const waterChartData = {
    labels: weekDayLabels,
    datasets: [
      {
        data: dailyWater.some(val => val > 0) ? dailyWater : [0, 0, 0, 0, 0, 0, 0], // avoid min curve rendering issues if completely 0
        color: (opacity = 1) => `rgba(49, 130, 206, ${opacity})`, // Blue Line (#3182CE)
        strokeWidth: 3
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: colors.chartBg,
    backgroundGradientTo: colors.chartBg,
    decimalPlaces: 0,
    color: (opacity = 1) => isDark ? `rgba(226, 232, 240, ${opacity})` : `rgba(45, 55, 72, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(160, 174, 192, ${opacity})` : `rgba(113, 128, 150, ${opacity})`,
    barPercentage: 0.4, // Reduced to prevent overlap for interleaved 14 bars
    barRadius: 4, 
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: colors.border,
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>

          <View style={styles.row}>
          {/* Daily Streak Card */}
          <TouchableOpacity 
            style={[styles.card, styles.halfCard, { backgroundColor: colors.card }]} 
            onPress={() => setIsStreakModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.cardHeaderRow, SCREEN_WIDTH < 400 && { gap: 4 }]}>
              <View style={[
                styles.iconContainer, 
                { width: SCREEN_WIDTH < 400 ? 36 : 44, height: SCREEN_WIDTH < 400 ? 36 : 44, borderRadius: 12, marginBottom: 0 }
              ]}>
                <Image 
                  source={require('../../assets/images/fire.png')} 
                  style={{ width: SCREEN_WIDTH < 400 ? 18 : 24, height: SCREEN_WIDTH < 400 ? 18 : 24 }} 
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[styles.cardTitle, SCREEN_WIDTH < 400 && { fontSize: 13 }, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>Day Streak</Text>
                <View style={[styles.streakValueContainer, SCREEN_WIDTH < 400 && { marginTop: 0 }]}>
                  <Text style={[styles.streakValue, SCREEN_WIDTH < 400 && { fontSize: 20 }, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{streakCount}</Text>
                  <Text style={[styles.streakUnit, SCREEN_WIDTH < 400 && { fontSize: 11 }, { color: colors.textTertiary }]} numberOfLines={1}>days</Text>
                </View>
              </View>
            </View>

            <View style={[styles.streakGrid, SCREEN_WIDTH < 400 && { paddingHorizontal: 0 }]}>
              {weekDays.map((date, index) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isActive = weekActivity.has(dateStr);
                const isToday = isSameDay(date, today);

                return (
                  <View key={index} style={[styles.dayColumn, SCREEN_WIDTH < 400 && { gap: 2 }]}>
                    <View style={[
                      styles.circleIndicator,
                      SCREEN_WIDTH < 400 && { width: 12, height: 12, borderRadius: 6 }, 
                      { borderColor: colors.border },
                      isActive && styles.circleIndicatorActive,
                      isToday && !isActive && styles.circleIndicatorToday
                    ]}>
                      {isActive && (
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={SCREEN_WIDTH < 400 ? 10 : 14} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.dayLabel, SCREEN_WIDTH < 400 && { fontSize: 8 }, { color: colors.textMuted }, isToday && styles.dayLabelToday]}>
                      {weekDayLabels[index]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, styles.halfCard, { justifyContent: 'space-between', backgroundColor: colors.card }]}
            onPress={() => router.push('/update-weight' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.cardHeaderRow, SCREEN_WIDTH < 400 && { gap: 4 }]}>
              <View style={[
                styles.iconContainer, 
                { backgroundColor: colors.accentLight, width: SCREEN_WIDTH < 400 ? 36 : 44, height: SCREEN_WIDTH < 400 ? 36 : 44, borderRadius: 12, marginBottom: 0 }
              ]}>
                <HugeiconsIcon icon={ChampionIcon} size={SCREEN_WIDTH < 400 ? 18 : 24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[styles.cardTitle, SCREEN_WIDTH < 400 && { fontSize: 13 }, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>My Weight</Text>
                <View style={[styles.weightValueContainer, SCREEN_WIDTH < 400 && { marginTop: 0 }]}>
                  <Text style={[styles.weightValue, SCREEN_WIDTH < 400 && { fontSize: 20 }, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{weight}</Text>
                  <Text style={[styles.weightUnit, SCREEN_WIDTH < 400 && { fontSize: 11 }, { color: colors.textTertiary }]} numberOfLines={1}>kg</Text>
                </View>
              </View>
            </View>
            
            <Text style={[styles.weightSubtitle, { marginBottom: 8, color: colors.textMuted }]}>Current Status</Text>
          </TouchableOpacity>
        </View>

        {/* AI Health Insights Card */}
        <TouchableOpacity 
          style={[styles.card, styles.aiCard, { backgroundColor: colors.purpleLight, borderColor: colors.purpleBorder }]}
          onPress={() => router.push('/ai-insights' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.aiCardContent}>
            <View style={[styles.aiIconContainer, { backgroundColor: colors.purple }]}>
              <HugeiconsIcon icon={Activity01Icon} size={28} color="#FFFFFF" />
            </View>
            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiTitle, { color: colors.purpleText }]}>AI Health Insights</Text>
              <Text style={[styles.aiSubtitle, { color: colors.purpleSubtext }]}>Discover how your weekly meals affect your long-term health.</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Weekly Energy Card */}
        <View style={[styles.card, styles.energyCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Weekly Energy</Text>
          <View style={styles.energyStatsRow}>
            <View style={styles.energyStatItem}>
              <Text style={[styles.energyStatValue, styles.burnedValue, { color: colors.danger }]}>
                {totalBurned.toLocaleString()}
              </Text>
              <Text style={[styles.energyStatLabel, { color: colors.textTertiary }]}>Burned</Text>
            </View>

            <View style={styles.energyStatItem}>
              <Text style={[styles.energyStatValue, styles.consumedValue, { color: colors.accent }]}>
                {totalConsumed.toLocaleString()}
              </Text>
              <Text style={[styles.energyStatLabel, { color: colors.textTertiary }]}>Consumed</Text>
            </View>

            <View style={styles.energyStatItem}>
              <Text style={[styles.energyStatValue, styles.netValue]}>
                {netEnergy > 0 ? `+${netEnergy.toLocaleString()}` : netEnergy.toLocaleString()}
              </Text>
              <Text style={[styles.energyStatLabel, { color: colors.textTertiary }]}>Net</Text>
            </View>
          </View>

          <View style={styles.chartWrapper}>
            <BarChart
              data={energyChartData}
              width={SCREEN_WIDTH - 88}
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

          <View style={[styles.legendContainer, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: colors.accent }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Consumed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: colors.danger }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Burned</Text>
            </View>
          </View>
        </View>

        {/* Water Consumption Card */}
        <View style={[styles.card, styles.energyCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Water Consumption</Text>
          <View style={styles.energyStatsRow}>
            <View style={styles.energyStatItem}>
              <Text style={[styles.energyStatValue, { color: colors.blue }]}>
                {dailyWater.reduce((a, b) => a + b, 0).toFixed(1)} L
              </Text>
              <Text style={[styles.energyStatLabel, { color: colors.textTertiary }]}>Total This Week</Text>
            </View>

            <View style={styles.energyStatItem}>
              <Text style={[styles.energyStatValue, { color: colors.text }]}>
                {(dailyWater.reduce((a, b) => a + b, 0) / 7).toFixed(1)} L
              </Text>
              <Text style={[styles.energyStatLabel, { color: colors.textTertiary }]}>Daily Average</Text>
            </View>
          </View>

          <View style={styles.chartWrapper}>
            <LineChart
              data={waterChartData}
              width={SCREEN_WIDTH - 88}
              height={220}
              chartConfig={{
                ...chartConfig,
                decimalPlaces: 1, // Display labels nicely with 1 decimal
              }}
              style={styles.energyChart}
              fromZero
              bezier
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              yAxisSuffix="L"
              yAxisLabel=""
            />
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
            <Pressable style={[styles.modalDialog, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Daily Streak Details</Text>
                <TouchableOpacity onPress={() => setIsStreakModalVisible(false)}>
                  <HugeiconsIcon icon={Cancel01Icon} size={24} color={colors.text} />
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
                    <Text style={[styles.bigStreakCount, { color: colors.text }]}>{streakCount}</Text>
                    <Text style={[styles.bigStreakLabel, { color: colors.textTertiary }]}>Day Streak</Text>
                  </View>
                  
                  <View style={[styles.streakChip, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5', borderColor: isDark ? '#FC8181' : '#FED7D7' }]}>
                    <Text style={[styles.streakChipText, { color: colors.danger }]}>Keep it Going 🔥</Text>
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
                          styles.circleIndicator, 
                          { width: 28, height: 28, borderRadius: 14, borderColor: colors.border },
                          isActive && styles.circleIndicatorActive,
                          isToday && !isActive && styles.circleIndicatorToday
                        ]}>
                          {isActive && (
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="#FFFFFF" />
                          )}
                        </View>
                        <Text style={[styles.dayLabel, { fontSize: 12, color: colors.textMuted }, isToday && styles.dayLabelToday]}>
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
    backgroundColor: '#ECFDF5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
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
    justifyContent: 'space-between',
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
  },
  streakGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 2, 
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  circleIndicator: {
    width: 14, 
    height: 14,
    borderRadius: 7, 
    borderWidth: 1.5,
    borderColor: '#EDF2F7',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIndicatorActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  circleIndicatorToday: {
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
    marginTop: 2,
  },
  weightValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3748',
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 4,
  },
  weightSubtitle: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 4,
    fontWeight: '500',
  },
  streakValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  streakValue: {
    fontSize: 28, 
    fontWeight: '900', 
    color: '#2D3748',
  },
  streakUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 4,
  },

  // AI Insights Card Styles
  aiCard: {
    marginTop: 20,
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D8FD',
    borderWidth: 1,
  },
  aiCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 8,
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#805AD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTextContainer: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#322659',
    marginBottom: 4,
  },
  aiSubtitle: {
    fontSize: 13,
    color: '#553C9A',
    fontWeight: '500',
    lineHeight: 18,
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
  },
  energyStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  energyStatValue: {
    fontSize: 16,
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
    color: '#D69E2E', 
  },
  energyStatLabel: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chartWrapper: {
    alignItems: 'center',
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
    flexWrap: 'wrap',
    gap: 12,
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
