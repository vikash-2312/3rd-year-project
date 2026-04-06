import { useUser } from '@clerk/expo';
import { Notification01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../lib/firebase';
import { useTheme } from '../lib/ThemeContext';
import { subscribeToActiveDays, getWeekDays } from '../services/streakService';
import { StreakModal } from './StreakModal';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Activity01Icon, StarsIcon } from '@hugeicons/core-free-icons';

interface HomeHeaderProps {
  userData?: any;
  healthScore?: number;
  scoreColor?: string;
  pulseStyle?: any;
  onScorePress?: () => void;
}

export function HomeHeader({ 
  userData,
  healthScore = 0, 
  scoreColor = '#009050', 
  pulseStyle = {}, 
  onScorePress = () => {} 
}: HomeHeaderProps) {
  const { user } = useUser();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [hasUnread, setHasUnread] = useState(false);
  
  // Streak State
  const [streakCount, setStreakCount] = useState(0);
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [isStreakModalVisible, setIsStreakModalVisible] = useState(false);
  
  const weekDays = getWeekDays();
  const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Notifications
    const notifRef = collection(db, 'users', user.id, 'notifications');
    const q = query(notifRef, where('read', '==', false), limit(1));

    const unsubscribeNotif = onSnapshot(q, (snapshot) => {
      setHasUnread(!snapshot.empty);
    });

    // 2. Subscribe to Streak
    const unsubscribeStreak = subscribeToActiveDays(user.id, (data) => {
      setStreakCount(data.count);
      setActiveDays(data.activeDays);
    });

    return () => {
      unsubscribeNotif();
      unsubscribeStreak();
    };
  }, [user]);

  const name = userData?.display_name || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';
  const imageUrl = (userData?.profile?.photoURL && userData.profile.photoURL.trim() !== '') 
    ? userData.profile.photoURL 
    : user?.imageUrl;

  // Gauge settings for Avatar Ring
  const avatarSize = 56;
  const ringStroke = 3;
  const ringRadius = (avatarSize + ringStroke * 2) / 2;
  const ringSize = ringRadius * 2;
  const ringCircumference = 2 * Math.PI * (avatarSize / 2 + 1.5);
  const ringOffset = ringCircumference - (healthScore / 100) * ringCircumference;

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <TouchableOpacity 
          onPress={onScorePress}
          activeOpacity={0.8}
          style={styles.avatarWrapper}
        >
          {/* Health Index Ring */}
          <View style={styles.ringContainer}>
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringRadius}
                cy={ringRadius}
                r={avatarSize / 2 + 1.5}
                stroke={isDark ? '#2D3748' : '#EDF2F7'}
                strokeWidth={ringStroke}
                fill="none"
              />
              <Circle
                cx={ringRadius}
                cy={ringRadius}
                r={avatarSize / 2 + 1.5}
                stroke={scoreColor}
                strokeWidth={ringStroke}
                fill="none"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${ringRadius}, ${ringRadius}`}
              />
            </Svg>
          </View>

          <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, marginHorizontal: ringStroke + 2 }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
            ) : (
              <Text style={[styles.avatarText, { fontSize: avatarSize * 0.4 }]}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>

          {/* Mini Score Pill */}
          {healthScore > 0 && (
            <Animated.View style={[styles.miniScorePill, { backgroundColor: scoreColor }, pulseStyle]}>
              <Text style={styles.miniScoreText}>{healthScore}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={[styles.welcomeText, { color: colors.textTertiary }]}>Welcome Back,</Text>
          <TouchableOpacity onPress={() => router.push('/profile' as any)}>
            <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/notifications' as any)}
        >
          <HugeiconsIcon icon={Notification01Icon} size={22} color={colors.text} />
          {hasUnread && <View style={styles.notificationDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.streakButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setIsStreakModalVisible(true)}
          activeOpacity={0.8}
        >
          <Image 
            source={require('../assets/images/fire.png')} 
            style={styles.streakIcon} 
            resizeMode="contain"
          />
          <Text style={[styles.streakCountText, { color: colors.text }]}>{streakCount}</Text>
        </TouchableOpacity>
      </View>

      <StreakModal
        isVisible={isStreakModalVisible}
        onClose={() => setIsStreakModalVisible(false)}
        streakCount={streakCount}
        activeDays={activeDays}
        weekDays={weekDays}
        weekDayLabels={weekDayLabels}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    borderRadius: 25,
    backgroundColor: '#009050',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ringContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniScorePill: {
    position: 'absolute',
    bottom: -4,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  miniScoreText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  textContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 0,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  streakButton: {
    width: 'auto',
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 4,
  },
  streakIcon: {
    width: 18,
    height: 18,
  },
  streakCountText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
