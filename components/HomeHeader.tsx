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

export function HomeHeader() {
  const { user } = useUser();
  const router = useRouter();
  const { colors } = useTheme();
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

  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';
  const imageUrl = user?.imageUrl;

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <TouchableOpacity 
          onPress={() => router.push('/profile' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarPlaceholder}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.textContainer}>
          <Text style={[styles.welcomeText, { color: colors.textTertiary }]}>Welcome Back,</Text>
          <Text style={[styles.nameText, { color: colors.text }]}>{name}</Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => router.push('/notifications' as any)}
        >
          <HugeiconsIcon icon={Notification01Icon} size={24} color={colors.text} />
          {hasUnread && <View style={styles.notificationDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.streakButton, { backgroundColor: colors.card }]}
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#009050',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  textContainer: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 2,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  streakButton: {
    width: 'auto',
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 4,
  },
  streakIcon: {
    width: 20,
    height: 20,
  },
  streakCountText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
