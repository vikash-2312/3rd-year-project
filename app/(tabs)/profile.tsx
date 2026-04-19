import { 
  UserCircleIcon, 
  Settings02Icon, 
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
  Edit01Icon,
  Award01Icon,
  ActivityIcon,
  DashboardCircleIcon,
  MoreVerticalIcon,
  Cancel01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useAuth, useUser } from "@clerk/expo";
import { useRouter, useLocalSearchParams } from "expo-router";
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from "react";
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
  Alert,
  Dimensions,
  Pressable,
  TouchableWithoutFeedback,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from '../../lib/firebase';
import { useTheme } from "../../lib/ThemeContext";
import { format } from 'date-fns';
import { HealthDashboard } from '../../components/HealthDashboard';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ProfileStatsTemplate } from '../../components/profile/ProfileStatsTemplate';
import { DailyShareModal } from "../../components/DailyShareModal";
import { Share02Icon } from '@hugeicons/core-free-icons';
import { useHealthData } from '../../hooks/useHealthData';
import { calculateUnifiedHealthScore } from '../../services/healthScore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [userData, setUserData] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isHealthModalVisible, setIsHealthModalVisible] = useState(false);
  const [isDailyShareModalVisible, setIsDailyShareModalVisible] = useState(false);
  const params = useLocalSearchParams();
  const health = useHealthData(user?.id);

  // Handle auto-open for Health Sync from Checklist
  useEffect(() => {
    if (params.sync === 'true') {
      setIsHealthModalVisible(true);
    }
  }, [params.sync]);

  // 1. Listen for user profile data (Real-time)
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
      setIsProfileLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

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
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
      ]
    );
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

  // Lifetime Stats State
  const [lifetimeStats, setLifetimeStats] = useState({
    caloriesBurned: 0,
    caloriesConsumed: 0,
    totalLogs: 0,
    daysActive: 0,
    isLoading: true
  });

  useEffect(() => {
    if (!user) return;

    async function fetchLifetimeStats() {
      try {
        if (!user?.id) return;
        const logsQuery = query(
          collection(db, 'logs'),
          where('userId', '==', user.id)
        );
        const snapshot = await getDocs(logsQuery);
        
        let totalBurned = 0;
        let totalConsumed = 0;
        const uniqueDays = new Set<string>();

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.type === 'exercise') {
            totalBurned += (data.calories || 0);
          } else if (data.type === 'food' || data.type === 'meal') {
            totalConsumed += (data.calories || 0);
          }
          if (data.date) {
            uniqueDays.add(data.date);
          }
        });

        setLifetimeStats({
          caloriesBurned: totalBurned,
          caloriesConsumed: totalConsumed,
          totalLogs: snapshot.size,
          daysActive: uniqueDays.size,
          isLoading: false
        });
      } catch (error) {
        console.error("Error fetching lifetime stats:", error);
        setLifetimeStats(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchLifetimeStats();
  }, [user]);

  // Today's Stats for Daily Share Card
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(collection(db, 'logs'), where('userId', '==', user.id), where('date', '==', today));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTodayLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const consumedMacros = useMemo(() => {
    return todayLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.type === 'food' || log.type === 'ai_log' ? (Number(log.calories) || 0) : 0),
      protein: acc.protein + (Number(log.protein) || 0),
      carbs: acc.carbs + (Number(log.carbs) || 0),
      fats: acc.fats + (Number(log.fat) || Number(log.fats) || 0),
      water: acc.water + (Number(log.waterLiters) || 0),
      exerciseMinutes: acc.exerciseMinutes + (log.type === 'exercise' ? (Number(log.duration) || 0) : 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, exerciseMinutes: 0 });
  }, [todayLogs]);

  const healthScoreStats = useMemo(() => {
    if (!userData || !userData.profile || !userData.profile.macros) return { total: 0 };
    
    // Bug 6 Fix: Correct field paths from onboarding
    const targets = {
      dailyCalories: userData.profile.macros.dailyCalories || 2000,
      proteinGrams: userData.profile.macros.proteinGrams || 150,
      carbsGrams: userData.profile.macros.carbsGrams || 200,
      fatsGrams: userData.profile.macros.fatsGrams || 65,
      dailySteps: userData.profile.macros.dailySteps || 10000,
      waterIntakeLiters: userData.profile.macros.waterIntakeLiters || 2.5,
      exerciseMinutes: userData.profile.macros.exerciseMinutes || 30,
      sleepHours: userData.profile.macros.sleepHours || 8
    };

    // Bug 1 Fix: Use Unified Logic
    return calculateUnifiedHealthScore({
      consumed: {
        calories: consumedMacros.calories,
        protein: consumedMacros.protein,
        carbs: consumedMacros.carbs,
        fat: consumedMacros.fats,
        water: consumedMacros.water,
        exerciseMinutes: consumedMacros.exerciseMinutes
      },
      targets,
      todaySteps: health.data.steps,
      todaySleep: health.data.sleepHours || 0
    });
  }, [consumedMacros, health.data, userData]);

  const currentHealthScore = healthScoreStats.total;

  const [selectedShareTheme, setSelectedShareTheme] = useState<'emerald' | 'midnight' | 'arctic'>('emerald');

  const shareThemes = [
    { id: 'emerald', label: 'Emerald', color: '#009050' },
    { id: 'midnight', label: 'Midnight', color: '#1A202C' },
    { id: 'arctic', label: 'Arctic', color: '#3182CE' },
  ] as const;

  const viewShotRef = React.useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleShareJourney = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCapturing(true);
      
      // Short delay to ensure template is rendered
      setTimeout(async () => {
        const uri = await captureRef(viewShotRef, {
          format: 'png',
          quality: 1,
        });
        
        await Sharing.shareAsync(uri);
        setIsCapturing(false);
      }, 100);
    } catch (error) {
      console.error("Sharing error:", error);
      setIsCapturing(false);
      Alert.alert("Share Error", "Could not generate profile snapshot.");
    }
  };



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

  const renderDropdownMenu = () => {
    if (!isMenuVisible) return null;

    const menuItems = [
      { title: 'Notifications', icon: Notification03Icon, color: '#FF8A65', route: '/notifications' },
      { title: 'Preferences', icon: Settings02Icon, color: '#009050', route: '/preferences' },
      ...(Platform.OS === 'android' ? [{ title: 'Sync Wearable', icon: SmartWatch01Icon, color: '#60A5FA', onPress: () => setIsHealthModalVisible(true) }] : []),
      { title: 'Contact Us', icon: Mail01Icon, color: '#E53E3E', onPress: handleContactUs },
      { title: 'Terms & Conditions', icon: File01Icon, color: '#718096', route: '/terms-conditions' },
    ];

    return (
      <>
        {/* Backdrop for click-outside to close */}
        <Pressable 
          style={styles.backdrop} 
          onPress={() => setIsMenuVisible(false)} 
        />
        <Animated.View 
          entering={FadeInDown.springify().damping(15)} 
          style={[
            styles.dropdownMenu, 
            { 
              backgroundColor: isDark ? '#2D3748' : '#FFF', 
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 10 
            }
          ]}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={[styles.menuItem, index !== menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => {
                setIsMenuVisible(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (item.onPress) item.onPress();
                else if (item.route) router.push(item.route as any);
              }}
            >
              <HugeiconsIcon icon={item.icon} size={18} color={item.color} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={isDark ? ['#1A202C', '#2D3748'] : ['#F7FAFC', '#E2E8F0']}
            style={styles.headerBg}
          />
          <View style={styles.topActions}>
            <TouchableOpacity 
              style={[styles.moreBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsMenuVisible(!isMenuVisible);
              }}
            >
              <HugeiconsIcon icon={MoreVerticalIcon} size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {renderDropdownMenu()}
          <Animated.View 
            entering={FadeInDown.duration(800).springify()}
            style={styles.headerContent}
          >
            <View style={[styles.profileImageWrapper, { borderColor: colors.card, backgroundColor: colors.card }]}>
              {isProfileLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Image 
                  key={userData?.profile?.photoURL || 'default-avatar'}
                  source={{ 
                    uri: (userData?.profile?.photoURL && userData.profile.photoURL.trim() !== '') 
                      ? userData.profile.photoURL 
                      : (user?.imageUrl || 'https://via.placeholder.com/150')
                  }} 
                  style={styles.profileImage}
                />
              )}
              <TouchableOpacity 
                style={[styles.editImageBtn, { backgroundColor: colors.accent }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/personal-details');
                }}
              >
                <HugeiconsIcon icon={Edit01Icon} size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerTextContainer}>
              <Text style={[styles.userNameLarge, { color: colors.text }]}>
                {userData?.display_name || user?.fullName || "Fitness Hero"}
              </Text>
              <Text style={[styles.userEmailSmall, { color: colors.textTertiary }]}>
                {user?.primaryEmailAddress?.emailAddress}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Lifetime Stats Row */}
        <Animated.View entering={FadeInDown.delay(150).duration(800).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginBottom: 16, marginTop: 12 }]}>LIFETIME EVOLUTION</Text>
        </Animated.View>
        <Animated.View 
          entering={FadeInDown.delay(200).duration(800).springify()}
          style={styles.statsContainer}
        >
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <HugeiconsIcon icon={FireIcon} size={24} color={colors.danger} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {lifetimeStats.isLoading ? '...' : 
                Math.round(userData?.profile?.goal === 'lose_weight' 
                  ? lifetimeStats.caloriesBurned 
                  : lifetimeStats.caloriesConsumed
                ).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              {userData?.profile?.goal === 'lose_weight' ? 'Kcal Burned' : 'Kcal Consumed'}
            </Text>
          </View>
          
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <HugeiconsIcon icon={Award01Icon} size={24} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {lifetimeStats.isLoading ? '...' : lifetimeStats.daysActive}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Days Active</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <HugeiconsIcon icon={ActivityIcon} size={24} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {lifetimeStats.isLoading ? '...' : lifetimeStats.totalLogs}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total Logs</Text>
          </View>
        </Animated.View>

        {/* Daily Achievement Entry Point */}
        <Animated.View entering={FadeInDown.delay(220).duration(800).springify()}>
          <TouchableOpacity 
            style={[styles.dailyShareAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setIsDailyShareModalVisible(true);
            }}
          >
            <LinearGradient
              colors={isDark ? ['#065F46', '#064E3B'] : ['#ECFDF5', '#D1FAE5']}
              style={styles.dailyShareIcon}
            >
              <HugeiconsIcon icon={ActivityIcon} size={24} color={isDark ? '#34D399' : '#059669'} />
            </LinearGradient>
            <View style={styles.dailyShareText}>
              <Text style={[styles.dailyShareTitle, { color: colors.text }]}>Today's Achievement</Text>
              <Text style={[styles.dailyShareSubtitle, { color: colors.textTertiary }]}>Generate a shareable card for today</Text>
            </View>
            <HugeiconsIcon icon={Share02Icon} size={20} color={colors.accent} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(200).duration(800).springify()}
          style={styles.themeSelector}
        >
          <Text style={[styles.themeSelectorTitle, { color: colors.textTertiary }]}>SHARE CARD STYLE</Text>
          <View style={styles.themePills}>
            {shareThemes.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themePill,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  selectedShareTheme === theme.id && { borderColor: colors.accent, backgroundColor: `${colors.accent}10` }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedShareTheme(theme.id);
                }}
              >
                <View style={[styles.themeColorDot, { backgroundColor: theme.color }]} />
                <Text style={[
                  styles.themePillText, 
                  { color: selectedShareTheme === theme.id ? colors.accent : colors.textMuted }
                ]}>
                  {theme.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Share Journey Button */}
        <Animated.View 
          entering={FadeInDown.delay(250).duration(800).springify()}
          style={styles.shareContainer}
        >
          <TouchableOpacity 
            style={[styles.shareBtn, { backgroundColor: colors.accent }]}
            onPress={handleShareJourney}
            activeOpacity={0.8}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <HugeiconsIcon icon={DashboardCircleIcon} size={20} color="#FFF" />
                <Text style={styles.shareBtnText}>SHARE MY JOURNEY</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>


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


        {/* Health Dashboard Component Moved to Modal */}




        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5', borderColor: isDark ? '#FC8181' : '#FED7D7' }]} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <HugeiconsIcon icon={Logout01Icon} size={22} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Health Connect Modal */}
      <Modal
        visible={isHealthModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsHealthModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ padding: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Health Sync</Text>
            <TouchableOpacity 
              onPress={() => setIsHealthModalVisible(false)} 
              activeOpacity={0.7}
              style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 20 }}
            >
               <HugeiconsIcon icon={Cancel01Icon} size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
            <HealthDashboard />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <DailyShareModal
        isVisible={isDailyShareModalVisible}
        onClose={() => setIsDailyShareModalVisible(false)}
        logs={todayLogs}
        stats={{
          calories: Math.round(consumedMacros.calories),
          targetCalories: userData?.profile?.daily_calories || 2000,
          protein: Math.round(consumedMacros.protein),
          targetProtein: userData?.profile?.protein_grams || 150,
          steps: health.data.steps,
          targetSteps: userData?.profile?.daily_steps || 10000,
          water: consumedMacros.water,
          targetWater: userData?.profile?.target_water || 2.5,
          exerciseMinutes: consumedMacros.exerciseMinutes,
          targetExercise: userData?.profile?.target_exercise || 30,
          sleepHours: health.data.sleepHours || 0,
          targetSleep: userData?.profile?.target_sleep || 8,
          healthScore: currentHealthScore,
        }}
      />

      {/* Hidden Sharing Template */}
      <View style={styles.hiddenTemplate}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <ProfileStatsTemplate
            name={userData?.display_name || user?.fullName || "Fitness Hero"}
            imageUrl={(userData?.profile?.photoURL && userData.profile.photoURL.trim() !== '') 
              ? userData.profile.photoURL 
              : (user?.imageUrl || 'https://via.placeholder.com/150')}
            calories={userData?.profile?.goal === 'lose_weight' 
              ? lifetimeStats.caloriesBurned 
              : lifetimeStats.caloriesConsumed}
            calorieLabel={userData?.profile?.goal === 'lose_weight' ? 'Kcal Burned' : 'Kcal Consumed'}
            days={lifetimeStats.daysActive}
            logs={lifetimeStats.totalLogs}
            theme={selectedShareTheme}
          />
        </ViewShot>
      </View>
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
    paddingBottom: 120,
  },
  headerContainer: {
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    height: 180,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    opacity: 0.5,
  },
  topActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -SCREEN_HEIGHT,
    zIndex: 500,
  },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 64,
    right: 16,
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 1000,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  editImageBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerTextContainer: {
    marginLeft: 20,
    flex: 1,
  },
  userNameLarge: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmailSmall: {
    fontSize: 14,
    marginBottom: 8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 28,
  },
  card: {
    borderRadius: 32,
    paddingHorizontal: 8,
    marginHorizontal: 24,
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
    paddingVertical: 18,
    paddingHorizontal: 16,
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
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proBadge: {
    backgroundColor: '#FEFCBF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F6E05E',
  },
  proText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B7791F',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 18,
    marginHorizontal: 24,
    marginTop: 8,
    borderWidth: 1.5,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
  dailyShareAction: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  dailyShareIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyShareText: {
    flex: 1,
    marginLeft: 16,
  },
  dailyShareTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dailyShareSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  journalCard: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    marginHorizontal: 24,
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
    marginBottom: 16,
  },
  journalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  journalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  journalPreview: {
    gap: 10,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  journalEntry: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  journalEmpty: {
    paddingVertical: 8,
  },
  journalEmptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  personaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 12,
  },
  personaButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personaName: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeSelector: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  themeSelectorTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  themePills: {
    flexDirection: 'row',
    gap: 8,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  themeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  shareContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hiddenTemplate: {
    position: 'absolute',
    left: -3000, // Hide off-screen
    top: 0,
    width: 1080,
    height: 1920,
  },
});
