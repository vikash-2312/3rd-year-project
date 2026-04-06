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
}

export const ProfileStatsTemplate: React.FC<ProfileStatsTemplateProps> = ({ 
  imageUrl, 
  name, 
  calories, 
  calorieLabel = 'Kcal Burned',
  days, 
  logs 
}) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#009050', '#004D2B']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative patterns */}
      <View style={[styles.circle, { top: -100, right: -100, width: 400, height: 400, opacity: 0.1 }]} />
      <View style={[styles.circle, { bottom: -150, left: -150, width: 500, height: 500, opacity: 0.15 }]} />

      <View style={styles.content}>
        <View style={styles.brandContainer}>
          <HugeiconsIcon icon={DashboardCircleIcon} size={28} color="#FFF" />
          <Text style={styles.brandName}>AI CAL TRACK</Text>
        </View>

        <View style={styles.header}>
          <View style={styles.profileWrapper}>
             {imageUrl ? (
               <Image source={{ uri: imageUrl }} style={styles.avatar} />
             ) : (
               <View style={[styles.avatar, styles.placeholder]}>
                 <Text style={styles.placeholderText}>{name.charAt(0)}</Text>
               </View>
             )}
             <View style={styles.crownBadge}>
               <HugeiconsIcon icon={CrownIcon} size={14} color="#009050" />
             </View>
          </View>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.proBadge}>
             <Text style={styles.proText}>ULTRA PERFORMER</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={styles.iconCircle}>
               <HugeiconsIcon icon={FireIcon} size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.statValue}>{calories.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{calorieLabel}</Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.iconCircle}>
               <HugeiconsIcon icon={Award01Icon} size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.statValue}>{days}</Text>
            <Text style={styles.statLabel}>Active Days</Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.iconCircle}>
               <HugeiconsIcon icon={ActivityIcon} size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.statValue}>{logs}</Text>
            <Text style={styles.statLabel}>Stats Logged</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.tagline}>My journey powered by AI Coach</Text>
          <View style={styles.appPromo}>
            <Text style={styles.appPromoText}>JOIN THE ELITE AT AICalTrack.com</Text>
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
