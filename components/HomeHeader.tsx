import { useUser } from '@clerk/expo';
import { Notification01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../lib/firebase';
import { useTheme } from '../lib/ThemeContext';

export function HomeHeader() {
  const { user } = useUser();
  const router = useRouter();
  const { colors } = useTheme();
  const [hasUnread, setHasUnread] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;

    const notifRef = collection(db, 'users', user.id, 'notifications');
    const q = query(notifRef, where('read', '==', false), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnread(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [user]);

  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';
  const imageUrl = user?.imageUrl;

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.welcomeText, { color: colors.textTertiary }]}>Welcome Back,</Text>
          <Text style={[styles.nameText, { color: colors.text }]}>{name}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.notificationButton, { backgroundColor: colors.card }]}
        onPress={() => router.push('/notifications' as any)}
      >
        <HugeiconsIcon icon={Notification01Icon} size={24} color={colors.text} />
        {hasUnread && <View style={styles.notificationDot} />}
      </TouchableOpacity>
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
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
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
  notificationButton: {
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
  }
});
