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
  Notification03Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import React from "react";
import { 
  Image, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    signOut();
  };

  const AccountOptions = [
    { title: 'Personal Details', icon: UserCircleIcon, color: '#3182CE' },
    { title: 'Preferences', icon: Settings02Icon, color: '#009050', route: '/preferences' },
    { title: 'Notifications', icon: Notification03Icon, color: '#FF8A65', route: '/notifications' },
  ];

  const SupportOptions = [
    { title: 'Request new features', icon: IdeaIcon, color: '#805AD5' },
    { title: 'Contact Us', icon: Mail01Icon, color: '#E53E3E' },
    { title: 'Terms and Conditions', icon: File01Icon, color: '#718096' },
    { title: 'Privacy Policy', icon: Shield01Icon, color: '#718096' },
  ];

  const renderOption = (option: any, index: number, isLast: boolean) => (
    <TouchableOpacity 
      key={index} 
      style={[styles.optionItem, isLast && styles.noBorder]}
      activeOpacity={0.7}
      onPress={() => option.route && router.push(option.route)}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.optionIconContainer, { backgroundColor: `${option.color}15` }]}>
          <HugeiconsIcon icon={option.icon} size={20} color={option.color} />
        </View>
        <Text style={styles.optionTitle}>{option.title}</Text>
      </View>
      <View style={styles.optionRight}>
        {option.isPremium && (
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="#A0AEC0" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Profile</Text>

        {/* User Info Card */}
        <View style={styles.userInfoCard}>
          <Image 
            source={{ uri: user?.imageUrl }} 
            style={styles.profileImage} 
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.fullName || "User Name"}</Text>
            <Text style={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress || "email@example.com"}</Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          {AccountOptions.map((opt, i) => renderOption(opt, i, i === AccountOptions.length - 1))}
        </View>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          {SupportOptions.map((opt, i) => renderOption(opt, i, i === SupportOptions.length - 1))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <HugeiconsIcon icon={Logout01Icon} size={22} color="#E53E3E" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
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
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#2D3748',
  },
  userEmail: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F7FAFC',
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
    color: '#2D3748',
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
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E53E3E',
    marginLeft: 8,
  },
});
