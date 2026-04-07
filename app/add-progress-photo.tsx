import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@clerk/expo';
import { format } from 'date-fns';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon, Calendar01Icon, Dumbbell01Icon } from '@hugeicons/core-free-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../lib/ThemeContext';
import { uploadProgressPhoto } from '../services/progressPhotoService';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AddProgressPhoto() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{ imageUri: string }>();
  const imageUri = params.imageUri ? decodeURIComponent(params.imageUri) : null;

  const [weight, setWeight] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'EEEE, MMM d, yyyy');

  // Pulsing upload button animation
  const btnPulse = useSharedValue(1);
  useEffect(() => {
    btnPulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const btnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  const handleUpload = async () => {
    if (!user || !imageUri) return;

    try {
      setIsUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const weightNum = weight.trim() ? parseFloat(weight) : undefined;
      if (weight.trim() && (isNaN(weightNum!) || weightNum! <= 0)) {
        Alert.alert('Invalid Weight', 'Please enter a valid weight in kg.');
        setIsUploading(false);
        return;
      }

      await uploadProgressPhoto(user.id, imageUri, todayStr, weightNum);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success! 🎉', 'Your progress photo has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!imageUri) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>No image selected</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.accent }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const guidanceTips = [
    { icon: '📐', text: 'Stand straight', desc: 'Keep a consistent posture' },
    { icon: '💡', text: 'Same lighting', desc: 'Natural light works best' },
    { icon: '🧍', text: 'Same pose', desc: 'Repeat your pose each time' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.card }]}
              onPress={() => router.back()}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Progress Photo</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Image Preview */}
          <Animated.View entering={FadeIn.duration(500)} style={[styles.imageCard, { backgroundColor: colors.card }]}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          </Animated.View>

          {/* Photo Guidance Tips */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.guidanceContainer}>
            <Text style={[styles.guidanceTitle, { color: colors.textSecondary }]}>📋 Photo Tips</Text>
            <View style={styles.guidanceRow}>
              {guidanceTips.map((tip, index) => (
                <View
                  key={index}
                  style={[styles.guidanceTip, { backgroundColor: isDark ? colors.card : '#F7FAFC' }]}
                >
                  <Text style={styles.guidanceTipIcon}>{tip.icon}</Text>
                  <Text style={[styles.guidanceTipText, { color: colors.text }]}>{tip.text}</Text>
                  <Text style={[styles.guidanceTipDesc, { color: colors.textMuted }]}>{tip.desc}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Date Row */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <View style={[styles.infoIconCircle, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }]}>
              <HugeiconsIcon icon={Calendar01Icon} size={20} color={colors.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{todayDisplay}</Text>
            </View>
          </Animated.View>

          {/* Weight Input */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <View style={[styles.infoIconCircle, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
              <HugeiconsIcon icon={Dumbbell01Icon} size={20} color={isDark ? '#FC8181' : '#E53E3E'} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Current Weight (optional)</Text>
              <TextInput
                style={[styles.weightInput, { color: colors.text, borderBottomColor: colors.border }]}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 72.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <Text style={[styles.unitText, { color: colors.textTertiary }]}>kg</Text>
          </Animated.View>

          {/* Upload Button */}
          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={!isUploading ? btnPulseStyle : undefined}>
            <TouchableOpacity
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>Uploading...</Text>
                </View>
              ) : (
                <Text style={styles.uploadButtonText}>✨ Save Progress Photo</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
            🔒 Your photos are private and only visible to you
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  imageCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: (SCREEN_WIDTH - 48) * 1.2,
    borderRadius: 24,
  },

  // Guidance Tips
  guidanceContainer: {
    marginBottom: 16,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  guidanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  guidanceTip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    gap: 4,
  },
  guidanceTipIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  guidanceTipText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  guidanceTipDesc: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  weightInput: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  uploadButton: {
    backgroundColor: '#009050',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privacyNote: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 100,
  },
  backLink: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
});
