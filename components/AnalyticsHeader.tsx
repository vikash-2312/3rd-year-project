import { useUser } from '@clerk/expo';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { TrendingDown } from '@hugeicons/core-free-icons';
import { typography } from '../lib/typography';

interface AnalyticsHeaderProps {
  userData?: any;
  healthScore?: number;
  onUpdateWeight?: () => void;
}

export function AnalyticsHeader({ 
  userData,
  healthScore = 0, 
  onUpdateWeight = () => {}
}: AnalyticsHeaderProps) {
  const { user } = useUser();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const name = userData?.display_name || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Member';
  const imageUrl = (userData?.profile?.photoURL && userData.profile.photoURL.trim() !== '') 
    ? userData.profile.photoURL 
    : user?.imageUrl;

  const scoreColor = healthScore >= 70 ? '#009050' : healthScore >= 40 ? '#D69E2E' : '#E53E3E';

  // Avatar Ring Stats
  const avatarSize = 60;
  const ringStroke = 4;
  const ringRadius = (avatarSize + ringStroke * 2) / 2;
  const ringSize = ringRadius * 2;
  const ringCircumference = 2 * Math.PI * (avatarSize / 2 + 2);
  const ringOffset = ringCircumference - (healthScore / 100) * ringCircumference;

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <TouchableOpacity 
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
          style={styles.avatarWrapper}
        >
          {/* Health Index Ring */}
          <View style={styles.ringContainer}>
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringRadius}
                cy={ringRadius}
                r={avatarSize / 2 + 2}
                stroke={isDark ? '#2D3748' : '#EDF2F7'}
                strokeWidth={ringStroke}
                fill="none"
              />
              <Circle
                cx={ringRadius}
                cy={ringRadius}
                r={avatarSize / 2 + 2}
                stroke={scoreColor}
                strokeWidth={ringStroke}
                fill="none"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${ringRadius}, ${ringRadius}`}
              />
            </Svg>
          </View>

          <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, marginHorizontal: ringStroke + 2 }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
            ) : (
              <Text style={[styles.avatarText, { fontSize: avatarSize * 0.4 }]}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>

          {/* Mini Score Pill */}
          {healthScore > 0 && (
            <View style={[styles.miniScorePill, { backgroundColor: scoreColor }]}>
              <Text style={styles.miniScoreText}>{healthScore}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Your Evolution</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Keep at it, {name.split(' ')[0]}!</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.accentLight, borderColor: colors.border }]}
        onPress={onUpdateWeight}
        activeOpacity={0.8}
      >
        <HugeiconsIcon icon={TrendingDown} size={18} color={colors.accent} />
        <Text style={[styles.actionLabel, { color: colors.accent }]}>Weight</Text>
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
    paddingBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ringContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    borderRadius: 26,
    backgroundColor: '#009050',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    borderRadius: 26,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  miniScorePill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  miniScoreText: {
    color: '#FFF',
    ...typography.captionBold,
    fontSize: 9,
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    ...typography.heading2,
    fontSize: 20,
  },
  subtitle: {
    ...typography.label,
    fontSize: 12,
    marginTop: -2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,144,80,0.1)',
  },
  actionLabel: {
    ...typography.label,
    fontSize: 13,
  },
});
