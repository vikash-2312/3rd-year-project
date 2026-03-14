import { 
  ArrowLeft02Icon, 
  Settings02Icon, 
  Moon02Icon, 
  Sun01Icon, 
  ComputerIcon,
  Notification03Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Switch
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../lib/firebase";
import { useTheme } from "../lib/ThemeContext";
import { scheduleDailyReminders, saveNotificationHistory } from "../lib/notifications";
import * as Notifications from 'expo-notifications';

type ThemeType = 'system' | 'light' | 'dark';

export default function Preferences() {
  const { user } = useUser();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeType>('light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch user settings from Firestore
    const settingsRef = doc(db, 'users', user.id, 'settings', 'preferences');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTheme(data.theme || 'light');
        setNotificationsEnabled(data.notificationsEnabled ?? true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updatePreference = async (key: string, value: any) => {
    if (!user) return;
    try {
      const settingsRef = doc(db, 'users', user.id, 'settings', 'preferences');
      await setDoc(settingsRef, { [key]: value }, { merge: true });
    } catch (error) {
      console.error("Error updating preference:", error);
    }
  };

  const ThemeOptions = [
    { id: 'system', title: 'System', icon: ComputerIcon },
    { id: 'light', title: 'Light', icon: Sun01Icon },
    { id: 'dark', title: 'Dark', icon: Moon02Icon },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.cardAlt }]}>
          <HugeiconsIcon icon={ArrowLeft02Icon} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Theme Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HugeiconsIcon icon={Settings02Icon} size={20} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme Appearance</Text>
          </View>
          
          <View style={styles.themeGrid}>
            {ThemeOptions.map((opt) => (
              <TouchableOpacity 
                key={opt.id}
                style={[
                  styles.themeItem,
                  { backgroundColor: colors.card, borderColor: 'transparent' },
                  theme === opt.id && [styles.themeItemActive, { borderColor: colors.accent, backgroundColor: colors.accentLight }]
                ]}
                onPress={() => {
                  setTheme(opt.id as ThemeType);
                  updatePreference('theme', opt.id);
                }}
              >
                <View style={[
                  styles.iconBox,
                  { backgroundColor: colors.cardAlt },
                  theme === opt.id && { backgroundColor: colors.accent }
                ]}>
                  <HugeiconsIcon 
                    icon={opt.icon} 
                    size={22} 
                    color={theme === opt.id ? "#FFFFFF" : colors.textTertiary} 
                  />
                </View>
                <Text style={[
                  styles.themeLabel,
                  { color: colors.textTertiary },
                  theme === opt.id && { color: colors.accent }
                ]}>{opt.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HugeiconsIcon icon={Notification03Icon} size={20} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          </View>

          <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Allow Notifications</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>Receive reminders and updates</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={async (value) => {
                setNotificationsEnabled(value);
                await updatePreference('notificationsEnabled', value);
                await scheduleDailyReminders(value);
              }}
              trackColor={{ false: colors.switchTrack, true: colors.accent }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.switchTrack}
            />
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.cardAlt, borderLeftColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Theme changes will be applied instantly. Some features may require an app restart.
          </Text>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  themeItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  themeItemActive: {
    borderColor: '#009050',
    backgroundColor: '#F0FFF4',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBoxActive: {
    backgroundColor: '#009050',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  themeLabelActive: {
    color: '#009050',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  infoCard: {
    marginTop: 8,
    backgroundColor: '#EDF2F7',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#CBD5E0',
  },
  infoText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 18,
  }
});
