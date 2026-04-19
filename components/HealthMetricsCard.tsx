import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { WalkingIcon, Moon02Icon, SmartWatch01Icon, Edit01Icon, MobileIcon } from '@hugeicons/core-free-icons';
import { useTheme } from '../lib/ThemeContext';
import { useHealthData } from '../hooks/useHealthData';
import Animated, { FadeInDown, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface HealthMetricsCardProps {
  onPress?: () => void;
  onManualEntry?: () => void;
  data: any;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
  isAvailable: boolean;
  targets?: any;
  isFuture?: boolean;
};

export function HealthMetricsCard({ 
  onPress, 
  onManualEntry, 
  data, 
  loading, 
  error, 
  permissionGranted, 
  isAvailable,
  targets,
  isFuture = false
}: HealthMetricsCardProps) {
  const { colors, isDark } = useTheme();

  if (!isAvailable && Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null; // Don't show on web if unavailable
  }

  const formatSleepHours = (hours: number) => {
    if (!hours || isNaN(hours)) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m > 0 ? m + 'm' : ''}`;
  };

  const steps = data?.steps || 0;
  const sleep = data?.sleepHours || 0;
  const stepSource = data?.stepSource || null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.container}>
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
        activeOpacity={0.8}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15` }]}>
              <HugeiconsIcon icon={SmartWatch01Icon} size={20} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Health & Vitals</Text>
          </View>
          {loading && <ActivityIndicator size="small" color={colors.textTertiary} />}
        </View>

        {(!permissionGranted || !isAvailable) && !loading && steps === 0 && sleep === 0 ? (
          <View style={[styles.permissionNotice, { backgroundColor: isDark ? '#3B2A1A' : '#FFFBEB' }]}>
            <Text style={[styles.permissionText, { color: isDark ? '#FBD38D' : '#DD6B20' }]}>
              {!isAvailable 
                ? "Health Connect unavailable on this device. You can still track manually."
                : "Connect Health app or add data manually to track your progress."}
            </Text>
            {!isFuture && onManualEntry && (
              <TouchableOpacity 
                style={[styles.manualEntryBtn, { backgroundColor: isDark ? 'rgba(251,211,141,0.1)' : 'rgba(221,107,32,0.1)' }]}
                onPress={onManualEntry}
              >
                <Text style={[styles.manualEntryText, { color: isDark ? '#FBD38D' : '#DD6B20' }]}>Add Manually</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : error && steps === 0 && sleep === 0 ? (
           <View style={[styles.permissionNotice, { backgroundColor: isDark ? '#4A2A2A' : '#FFEBEB' }]}>
             <Text style={[styles.permissionText, { color: isDark ? '#FC8181' : '#E53E3E' }]}>
               {error}
             </Text>
           </View>
        ) : (
          <View style={styles.metricsList}>
            {/* Steps Bar */}
            <View style={styles.metricRow}>
              <View style={styles.metricInfo}>
                <View style={[styles.inlineIcon, { backgroundColor: '#4ADE8020' }]}>
                  <HugeiconsIcon icon={WalkingIcon} size={14} color="#4ADE80" />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Steps & Movement</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={[styles.metricValueText, { color: colors.text }]}>{steps.toLocaleString()}</Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600' }}>/ {(targets?.dailySteps || 10000).toLocaleString()}</Text>
                </View>
              </View>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <LinearGradient
                    colors={['#4ADE80', '#22C55E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.min(100, (steps / (targets?.dailySteps || 10000 || 1)) * 100)}%` 
                      }
                    ]} 
                  />
                </View>
                {!isFuture && (
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onManualEntry?.();
                    }}
                    style={[styles.smallEditBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <HugeiconsIcon icon={Edit01Icon} size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Step Source Indicator */}
              {stepSource && (
                <View style={[
                  styles.sourceIndicator, 
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  stepSource === 'Manual Entry' && { backgroundColor: isDark ? `${colors.warning}15` : `${colors.warning}10` }
                ]}>
                  <HugeiconsIcon 
                    icon={
                      stepSource === 'Manual Entry' ? Edit01Icon :
                      stepSource.toLowerCase().includes('watch') ? SmartWatch01Icon : 
                      MobileIcon
                    } 
                    size={12} 
                    color={stepSource === 'Manual Entry' ? colors.warning : colors.textTertiary} 
                  />
                  <Text style={[
                    styles.sourceText, 
                    { color: stepSource === 'Manual Entry' ? colors.warning : colors.textTertiary }
                  ]}>
                    {stepSource === 'Manual Entry' ? 'Manual Entry' : `Synced via ${stepSource}`}
                  </Text>
                </View>
              )}
            </View>

            {/* Sleep Bar */}
            <View style={styles.metricRow}>
              <View style={styles.metricInfo}>
                <View style={[styles.inlineIcon, { backgroundColor: '#A78BFA20' }]}>
                  <HugeiconsIcon icon={Moon02Icon} size={14} color="#A78BFA" />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Sleep</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={[styles.metricValueText, { color: colors.text }]}>{formatSleepHours(sleep)}</Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600' }}>/ {targets?.sleepHours || 8}h</Text>
                </View>
              </View>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <LinearGradient
                    colors={['#A78BFA', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.min(100, (sleep / (targets?.sleepHours || 8 || 1)) * 100)}%` 
                      }
                    ]} 
                  />
                </View>
                {!isFuture && (
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onManualEntry?.();
                    }}
                    style={[styles.smallEditBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <HugeiconsIcon icon={Edit01Icon} size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricsList: {
    gap: 16,
  },
  metricRow: {
    gap: 8,
  },
  metricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  metricValueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  smallEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  permissionNotice: {
    padding: 12,
    borderRadius: 12,
  },
  permissionText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  manualEntryBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  manualEntryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginLeft: 32,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  }
});
