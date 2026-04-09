import React from 'react';
import { StyleSheet, Text, View, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  FireIcon, 
  Award01Icon, 
  ActivityIcon,
  CrownIcon,
  DashboardCircleIcon
} from '@hugeicons/core-free-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileStatsTemplateProps {
  imageUrl?: string;
  name: string;
  calories: number;
  calorieLabel?: string;
  days: number;
  logs: number;
  theme?: 'emerald' | 'midnight' | 'arctic';
}

export const ProfileStatsTemplate: React.FC<ProfileStatsTemplateProps> = ({ 
  imageUrl, 
  name, 
  calories, 
  calorieLabel = 'Kcal Burned',
  days, 
  logs,
  theme = 'emerald'
}) => {
  const themeStyles: Record<string, {
    grad: readonly [string, string, ...string[]];
    accent: string;
    badge: string;
    text: string;
    muted: string;
    cardBg: string;
    border: string;
    btnBg: string;
    btnText: string;
  }> = {
    emerald: {
      grad: ['#009050', '#004D2B'],
      accent: '#FFF',
      badge: '#009050',
      text: '#FFF',
      muted: 'rgba(255,255,255,0.7)',
      cardBg: 'rgba(255,255,255,0.1)',
      border: 'rgba(255,255,255,0.1)',
      btnBg: '#FFF',
      btnText: '#009050'
    },
    midnight: {
      grad: ['#1A202C', '#000000'],
      accent: '#F6E05E', // Gold
      badge: '#000',
      text: '#FFF',
      muted: 'rgba(255,255,255,0.6)',
      cardBg: 'rgba(255,255,255,0.05)',
      border: 'rgba(246, 224, 94, 0.2)',
      btnBg: '#F6E05E',
      btnText: '#000'
    },
    arctic: {
      grad: ['#F7FAFC', '#E2E8F0'],
      accent: '#3182CE', // Pro Blue
      badge: '#FFF',
      text: '#1A202C',
      muted: '#718096',
      cardBg: '#FFF',
      border: '#E2E8F0',
      btnBg: '#3182CE',
      btnText: '#FFF'
    }
  };

  const current = themeStyles[theme];

  return (
    <View style={[styles.container, { backgroundColor: current.grad[0] }]}>
      <LinearGradient
        colors={current.grad}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative patterns */}
      <View style={[styles.circle, { top: -100, right: -100, width: 400, height: 400, opacity: theme === 'arctic' ? 0.4 : 0.1, backgroundColor: current.accent }]} />
      <View style={[styles.circle, { bottom: -150, left: -150, width: 500, height: 500, opacity: theme === 'arctic' ? 0.3 : 0.15, backgroundColor: current.accent }]} />

      <View style={styles.content}>
        <View style={styles.brandContainer}>
          <HugeiconsIcon icon={DashboardCircleIcon} size={28} color={current.accent} />
          <Text style={[styles.brandName, { color: current.accent }]}>AI CAL TRACK</Text>
        </View>

        <View style={styles.header}>
          <View style={[styles.profileWrapper, { borderColor: current.border }]}>
             {imageUrl ? (
               <Image source={{ uri: imageUrl }} style={[styles.avatar, { borderColor: current.border }]} />
             ) : (
               <View style={[styles.avatar, styles.placeholder, { backgroundColor: current.cardBg, borderColor: current.border }]}>
                 <Text style={[styles.placeholderText, { color: current.accent }]}>{name.charAt(0)}</Text>
               </View>
             )}
             <View style={[styles.crownBadge, { backgroundColor: current.accent }]}>
               <HugeiconsIcon icon={CrownIcon} size={14} color={current.badge} />
             </View>
          </View>
          <Text style={[styles.name, { color: current.text }]}>{name}</Text>
          <View style={[styles.proBadge, { borderColor: current.border, backgroundColor: theme === 'arctic' ? '#FFF' : 'rgba(0,0,0,0.3)' }]}>
             <Text style={[styles.proText, { color: theme === 'arctic' ? current.accent : '#FFF' }]}>ULTRA PERFORMER</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: calorieLabel, value: calories.toLocaleString(), icon: FireIcon },
            { label: 'Active Days', value: days, icon: Award01Icon },
            { label: 'Stats Logged', value: logs, icon: ActivityIcon },
          ].map((stat, idx) => (
            <View key={idx} style={[styles.statItem, { backgroundColor: current.cardBg, borderColor: current.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme === 'arctic' ? current.grad[1] : 'rgba(255,255,255,0.2)' }]}>
                 <HugeiconsIcon icon={stat.icon} size={32} color={theme === 'midnight' ? current.accent : (theme === 'arctic' ? current.accent : '#FFF')} />
              </View>
              <Text style={[styles.statValue, { color: current.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: current.muted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.tagline, { color: current.muted }]}>My journey powered by AI Coach</Text>
          <View style={[styles.appPromo, { backgroundColor: current.btnBg }]}>
            <Text style={[styles.appPromoText, { color: current.btnText }]}>JOIN THE ELITE AT AICALTRACK.COM</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 1080, // High-res Story dimensions
    height: 1920,
    backgroundColor: '#009050',
  },
  content: {
    flex: 1,
    padding: 80,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandName: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  profileWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 80,
    color: '#FFF',
    fontWeight: '800',
  },
  crownBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  name: {
    color: '#FFF',
    fontSize: 56,
    fontWeight: '900',
    marginBottom: 16,
  },
  proBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  proText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  statsGrid: {
    width: '100%',
    gap: 40,
  },
  statItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    padding: 48,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    color: '#FFF',
    fontSize: 72,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 24,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 22,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  appPromo: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 40,
  },
  appPromoText: {
    color: '#009050',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  circle: {
    position: 'absolute',
    borderRadius: 250,
    backgroundColor: '#FFF',
  }
});
