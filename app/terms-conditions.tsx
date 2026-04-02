import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '../lib/ThemeContext';

export default function TermsConditions() {
  const router = useRouter();
  const { colors } = useTheme();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using AI Cal Track, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use the app."
    },
    {
      title: "2. Description of Service",
      content: "AI Cal Track is a calorie tracking and wellness application that uses AI to help users monitor their nutritional intake, exercise, and overall health progress."
    },
    {
      title: "3. User Responsibilities",
      content: "You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to provide accurate and complete information."
    },
    {
      title: "4. Health Disclaimer",
      content: "AI Cal Track provides nutritional and wellness information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition."
    },
    {
      title: "5. Privacy Policy",
      content: "Your privacy is important to us. Please refer to our Privacy Policy to understand how we collect, use, and disclose information about you."
    },
    {
      title: "6. Modifications to Terms",
      content: "We reserve the right to modify these Terms and Conditions at any time. Your continued use of the app after any such changes constitutes your acceptance of the new Terms and Conditions."
    }
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: colors.card }]}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms & Conditions</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last updated: April 1, 2026</Text>
        
        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          If you have any questions about these Terms, please contact us at admin@caltrack.app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  }
});
