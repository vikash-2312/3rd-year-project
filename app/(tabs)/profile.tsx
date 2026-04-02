import { 
  UserCircleIcon, 
  Settings02Icon, 
  CrownIcon, 
  IdeaIcon, 
  Mail01Icon, 
  File01Icon, 
  Shield01Icon, 
  Logout01Icon,
  ArrowRight01Icon,
  Notification03Icon,
  SmartWatch01Icon,
  Activity01Icon,
  Pulse01Icon,
  Moon02Icon,
  FireIcon,
  WalkingIcon,
  Book02Icon,
  SmileIcon,
  NeutralIcon,
  Sad01Icon,
  AngryIcon,
  StarsIcon,
  Edit01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from "react";
import { 
  Image, 
  Linking,
  Platform,
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  ActivityIndicator,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from '../../lib/firebase';
import { useTheme } from "../../lib/ThemeContext";
import { format } from 'date-fns';
import { HealthDashboard } from '../../components/HealthDashboard';

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const handleContactUs = () => {
    const email = 'admin@caltrack.com'; // Using a cleaner email placeholder
    const subject = 'Support Request - AI Cal Track';
    const body = 'Hi Support Team,\n\nI have a query regarding...';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(url).catch((err) => {
      console.error("Cannot open email app:", err);
      Alert.alert(
        "Contact Support",
        `Could not open your email app. Please send an email to:\n\nadmin@caltrack.com`,
        [{ text: "OK" }]
      );
    });
  };

  const handleLogout = () => {
    signOut();
  };

  const [todayJournal, setTodayJournal] = useState<any>(null);
  const [isJournalLoading, setIsJournalLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const journalDate = format(new Date(), 'yyyy-MM-dd');
    const journalRef = doc(db, 'journals', `${user.id}_${journalDate}`);
    const unsubscribe = onSnapshot(journalRef, (doc) => {
      if (doc.exists()) {
        setTodayJournal(doc.data());
      } else {
        setTodayJournal(null);
      }
      setIsJournalLoading(false);
    }, (error) => {
      console.error("Journal check error:", error);
      setIsJournalLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const AccountOptions = [
    { title: 'Personal Details', icon: UserCircleIcon, color: '#3182CE', route: '/personal-details' },
    { title: 'Preferences', icon: Settings02Icon, color: '#009050', route: '/preferences' },
    { title: 'Notifications', icon: Notification03Icon, color: '#FF8A65', route: '/notifications' },
  ];

  const SupportOptions = [
    { title: 'Request new features', icon: IdeaIcon, color: '#805AD5' },
    { title: 'Contact Us', icon: Mail01Icon, color: '#E53E3E', onPress: handleContactUs },
    { title: 'Terms and Conditions', icon: File01Icon, color: '#718096', route: '/terms-conditions' },
  ];

  const renderOption = (option: any, index: number, isLast: boolean) => (
    <TouchableOpacity 
      key={index} 
      style={[styles.optionItem, { borderBottomColor: colors.border }, isLast && styles.noBorder]}
      activeOpacity={0.7}
      onPress={() => {
        if (option.onPress) {
          option.onPress();
        } else if (option.route) {
          router.push(option.route as any);
        }
      }}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.optionIconContainer, { backgroundColor: `${option.color}15` }]}>
          <HugeiconsIcon icon={option.icon} size={20} color={option.color} />
        </View>
        <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
      </View>
      <View style={styles.optionRight}>
        {option.isPremium && (
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>

        <View style={[styles.userInfoCard, { backgroundColor: colors.card }]}>
          <Image 
            source={{ uri: user?.imageUrl }} 
            style={styles.profileImage} 
          />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.fullName || "User Name"}</Text>
            <Text style={[styles.userEmail, { color: colors.textTertiary }]}>{user?.primaryEmailAddress?.emailAddress || "email@example.com"}</Text>
          </View>
        </View>

        {/* Daily Journal Card */}
        <TouchableOpacity 
          style={[styles.journalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/journal' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.journalHeader}>
            <View style={styles.journalTitleRow}>
              <View style={[styles.journalIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                <HugeiconsIcon icon={Book02Icon} size={20} color={colors.accent} />
              </View>
              <Text style={[styles.journalTitle, { color: colors.text }]}>Daily Journal</Text>
            </View>
            <HugeiconsIcon icon={Edit01Icon} size={18} color={colors.textTertiary} />
          </View>

          {isJournalLoading ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 10 }} />
          ) : todayJournal ? (
            <View style={styles.journalPreview}>
              <View style={styles.moodBadge}>
                <HugeiconsIcon 
                  icon={
                    todayJournal.mood === 'excited' ? StarsIcon :
                    todayJournal.mood === 'happy' ? SmileIcon :
                    todayJournal.mood === 'neutral' ? NeutralIcon :
                    todayJournal.mood === 'sad' ? Sad01Icon : AngryIcon
                  } 
                  size={16} 
                  color={colors.text} 
                />
                <Text style={[styles.moodText, { color: colors.text }]}>Feeling {todayJournal.mood || 'normal'}</Text>
              </View>
              <Text style={[styles.journalEntry, { color: colors.textSecondary }]} numberOfLines={2}>
                {todayJournal.content || "Mood recorded, but no notes added yet."}
              </Text>
            </View>
          ) : (
            <View style={styles.journalEmpty}>
              <Text style={[styles.journalEmptyText, { color: colors.textTertiary }]}>
                How was your day? Take a moment to reflect.
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {AccountOptions.map((opt, i) => renderOption(opt, i, i === AccountOptions.length - 1))}
        </View>

        {/* Health Dashboard Component */}
        {Platform.OS === 'android' && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Wearable</Text>
            <HealthDashboard />
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 8 }]}>Support</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {SupportOptions.map((opt, i) => renderOption(opt, i, i === SupportOptions.length - 1))}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5', borderColor: isDark ? '#FC8181' : '#FED7D7' }]} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <HugeiconsIcon icon={Logout01Icon} size={22} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    marginBottom: 24,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proBadge: {
    backgroundColor: '#FEFCBF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F6E05E',
  },
  proText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B7791F',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 8,
  },
  journalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  journalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  journalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  journalPreview: {
    gap: 8,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  journalEntry: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  journalEmpty: {
    paddingVertical: 4,
  },
  journalEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
