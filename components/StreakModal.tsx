import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { format, isSameDay } from 'date-fns';
import { useTheme } from '../lib/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface StreakModalProps {
  isVisible: boolean;
  onClose: () => void;
  streakCount: number;
  activeDays: Set<string>;
  weekDays: Date[];
  weekDayLabels: string[];
}

export function StreakModal({
  isVisible,
  onClose,
  streakCount,
  activeDays,
  weekDays,
  weekDayLabels,
}: StreakModalProps) {
  const { colors, isDark } = useTheme();
  const today = new Date();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onClose}
      >
        <Pressable style={[styles.modalDialog, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Daily Streak Details</Text>
            <TouchableOpacity onPress={onClose}>
              <HugeiconsIcon icon={Cancel01Icon} size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.bigCard}>
            <View style={[styles.iconContainer, { width: 60, height: 60, borderRadius: 20 }]}>
              <Image 
                source={require('../assets/images/fire.png')} 
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
                const isActive = activeDays.has(dateStr);
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
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDialog: {
    width: '100%',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bigCard: {
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  bigStreakCount: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  bigStreakLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: -4,
  },
  streakChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  streakChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  streakGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 16,
  },
  dayColumn: {
    alignItems: 'center',
  },
  circleIndicator: {
    borderWidth: 1.5,
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
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#009050',
    fontWeight: '800',
  },
});
