import React from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface WeeklyReportTemplateProps {
  userName: string;
  startDate: string;
  endDate: string;
  totalCalories: number;
  totalBurned: number;
  totalWater: number;
  weightChange: number;
  streak: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * 1080x1920 High-Res Social Story Template
 * Optimized for Instagram / WhatsApp Sharing
 */
export function WeeklyReportTemplate({ 
  userName, 
  startDate, 
  endDate, 
  totalCalories, 
  totalBurned, 
  totalWater, 
  weightChange, 
  streak 
}: WeeklyReportTemplateProps) {
  const isLoss = weightChange <= 0;

  return (
    <View style={styles.container}>
      {/* Background with Dark Base and Subtle Gradients */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#020617']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative Accents */}
      <View style={[styles.glowCircle, { top: -100, right: -100, backgroundColor: '#22D3EE', opacity: 0.15 }]} />
      <View style={[styles.glowCircle, { bottom: -150, left: -100, backgroundColor: '#8B5CF6', opacity: 0.15 }]} />

      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.appBadge}>📊 AI CAL TRACK</Text>
          <Text style={styles.mainTitle}>WEEKLY</Text>
          <Text style={styles.mainTitleAccent}>MOMENTUM</Text>
          <View style={styles.divider} />
          <Text style={styles.dateRange}>{startDate} — {endDate}</Text>
        </View>

        {/* Hero Section: The Streak */}
        <View style={styles.heroSection}>
          <View style={styles.streakBadge}>
            <LinearGradient
              colors={['#8B5CF6', '#D946EF']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>DAY STREAK</Text>
          </View>
          <Text style={styles.heroText}>Unstoppable Consistency 🔥</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🍱</Text>
            <Text style={styles.statValue}>{totalCalories.toLocaleString()}</Text>
            <Text style={styles.statLabel}>KCAL EATEN</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={styles.statValue}>{totalBurned.toLocaleString()}</Text>
            <Text style={styles.statLabel}>KCAL BURNED</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💧</Text>
            <Text style={styles.statValue}>{totalWater.toFixed(1)}L</Text>
            <Text style={styles.statLabel}>WATER HYDRATION</Text>
          </View>
          <View style={[styles.statCard, { borderColor: isLoss ? '#22D3EE' : '#F43F5E' }]}>
            <Text style={styles.statEmoji}>{isLoss ? '📉' : '📈'}</Text>
            <Text style={[styles.statValue, { color: isLoss ? '#22D3EE' : '#F43F5E' }]}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}kg
            </Text>
            <Text style={styles.statLabel}>WEIGHT CHANGE</Text>
          </View>
        </View>

        {/* Branding Footer */}
        <View style={styles.footer}>
          <View style={styles.footerBranding}>
            <View style={styles.logoCircle}>
              <Text style={{ fontSize: 40 }}>🥗</Text>
            </View>
            <View>
              <Text style={styles.footerAppName}>AI CAL TRACK</Text>
              <Text style={styles.footerTagline}>Personalized AI Fitness Coach</Text>
            </View>
          </View>
          <Text style={styles.socialMention}>@{userName.replace(/\s/g, '').toLowerCase()}_journey</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 1080,
    height: 1920,
    backgroundColor: '#0F172A',
  },
  glowCircle: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
  },
  content: {
    flex: 1,
    padding: 80,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
  },
  appBadge: {
    color: '#22D3EE',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 16,
  },
  mainTitle: {
    color: '#F8FAFC',
    fontSize: 100,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 100,
  },
  mainTitleAccent: {
    color: '#22D3EE',
    fontSize: 100,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 100,
    textShadowColor: 'rgba(34, 211, 238, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  divider: {
    width: 120,
    height: 8,
    backgroundColor: '#22D3EE',
    marginVertical: 40,
    borderRadius: 4,
  },
  dateRange: {
    color: '#94A3B8',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 60,
  },
  streakBadge: {
    width: 320,
    height: 320,
    borderRadius: 160,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  streakNumber: {
    color: '#FFFFFF',
    fontSize: 140,
    fontWeight: '900',
    lineHeight: 140,
  },
  streakLabel: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: -10,
  },
  heroText: {
    color: '#F8FAFC',
    fontSize: 48,
    fontWeight: '800',
    marginTop: 40,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 30,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 40,
    padding: 40,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
  },
  footer: {
    marginTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#22D3EE',
  },
  footerAppName: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerTagline: {
    color: '#94A3B8',
    fontSize: 20,
    fontWeight: '600',
  },
  socialMention: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 24,
    fontWeight: '700',
  },
});
