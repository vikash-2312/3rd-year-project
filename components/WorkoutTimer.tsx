import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { PlayIcon, PauseIcon, MultiplicationSignIcon, Timer01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';

interface WorkoutTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  onClose: () => void;
}

export const WorkoutTimer: React.FC<WorkoutTimerProps> = ({ 
  initialSeconds, 
  onComplete, 
  onClose 
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const progress = useRef(new Animated.Value(1)).current;

  // Format MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onComplete) onComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActive(!isActive);
  };

  const addTime = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSeconds((s) => s + 30);
  };

  return (
    <View style={styles.timerOverlay}>
      <View style={styles.timerCard}>
        <View style={styles.header}>
          <HugeiconsIcon icon={Timer01Icon} size={20} color="#718096" />
          <Text style={styles.headerTitle}>Rest Timer</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <HugeiconsIcon icon={MultiplicationSignIcon} size={18} color="#A0AEC0" />
          </TouchableOpacity>
        </View>

        <Text style={styles.timeDisplay}>{formatTime(seconds)}</Text>

        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={toggleTimer} 
            style={[styles.controlBtn, isActive ? styles.pauseBtn : styles.playBtn]}
          >
            <HugeiconsIcon 
              icon={isActive ? PauseIcon : PlayIcon} 
              size={24} 
              color="#FFF" 
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={addTime} style={styles.addBtn}>
            <HugeiconsIcon icon={PlusSignIcon} size={20} color="#4A5568" />
            <Text style={styles.addBtnText}>+30s</Text>
          </TouchableOpacity>
        </View>

        {seconds === 0 && (
          <Text style={styles.readyText}>GET READY! 🔥</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerOverlay: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerCard: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#718096',
    flex: 1,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  timeDisplay: {
    fontSize: 48,
    fontWeight: '900',
    color: '#2D3748',
    fontVariant: ['tabular-nums'],
    marginBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playBtn: {
    backgroundColor: '#009050',
  },
  pauseBtn: {
    backgroundColor: '#FF6B6B',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  addBtnText: {
    fontWeight: '700',
    color: '#4A5568',
  },
  readyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '900',
    color: '#009050',
    letterSpacing: 1,
  },
});
