import React, { useRef, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  Cancel01Icon, 
  Share02Icon, 
  ArrowRight01Icon,
  ArrowLeft01Icon,
  SparklesIcon,
  Copy01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { DailyShareCard } from './DailyShareCard';
import { VsAiChallengeCard } from './VsAiChallengeCard';
import { MinimalStoryCard } from './MinimalStoryCard';
import { WhatIEatInADayCard } from './WhatIEatInADayCard';
import { DailyWorkoutCard } from './DailyWorkoutCard';
import { LinearGradient } from 'expo-linear-gradient';
import { generateCaption, copyToClipboard, CaptionTone } from '../services/captionService';

const { width, height } = Dimensions.get('window');

const TEMPLATES = [
  { id: 'performance', label: 'Performance', emoji: '📊' },
  { id: 'vsai', label: 'Vs AI', emoji: '🤖' },
  { id: 'minimal', label: 'Minimal', emoji: '✨' },
  { id: 'timeline', label: 'Timeline', emoji: '🕒' },
  { id: 'workout', label: 'Workout', emoji: '💪' },
] as const;

type TemplateId = typeof TEMPLATES[number]['id'];

const TONES: { id: CaptionTone; label: string; emoji: string }[] = [
  { id: 'motivational', label: 'Hype', emoji: '🔥' },
  { id: 'humble', label: 'Real', emoji: '💬' },
  { id: 'data', label: 'Data', emoji: '📈' },
];

interface DailyShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  stats: any;
  logs?: any[];
}

export const DailyShareModal: React.FC<DailyShareModalProps> = ({ 
  isVisible, 
  onClose, 
  stats,
  logs = []
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('performance');
  const [captionTone, setCaptionTone] = useState<CaptionTone>('motivational');
  const [generatedCaption, setGeneratedCaption] = useState<string>('');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [isCaptionLoading, setIsCaptionLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const performanceRef = useRef(null);
  const vsaiRef = useRef(null);
  const minimalRef = useRef(null);
  const timelineRef = useRef(null);
  const workoutRef = useRef(null);

  const getActiveRef = () => {
    switch (activeTemplate) {
      case 'performance': return performanceRef;
      case 'vsai': return vsaiRef;
      case 'minimal': return minimalRef;
      case 'timeline': return timelineRef;
      case 'workout': return workoutRef;
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const ref = getActiveRef();
      const uri = await captureRef(ref, {
        format: 'png',
        quality: 1.0,
      });

      // Copy caption to clipboard before sharing if we have one
      if (generatedCaption) {
        const fullText = `${generatedCaption}\n\n${generatedHashtags.join(' ')}`;
        await copyToClipboard(fullText);
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'My Daily Performance',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Sharing failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleGenerateCaption = useCallback(async () => {
    setIsCaptionLoading(true);
    setIsCopied(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await generateCaption(stats, captionTone);
      setGeneratedCaption(result.caption);
      setGeneratedHashtags(result.hashtags);
    } catch (error) {
      console.error('Caption generation error:', error);
      Alert.alert('Error', 'Could not generate caption. Try again.');
    } finally {
      setIsCaptionLoading(false);
    }
  }, [stats, captionTone]);

  const handleCopy = useCallback(async () => {
    if (!generatedCaption) return;
    const fullText = `${generatedCaption}\n\n${generatedHashtags.join(' ')}`;
    await copyToClipboard(fullText);
    setIsCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setIsCopied(false), 2000);
  }, [generatedCaption, generatedHashtags]);

  const handleToneChange = (tone: CaptionTone) => {
    setCaptionTone(tone);
    setGeneratedCaption('');
    setGeneratedHashtags([]);
    setIsCopied(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView intensity={90} tint="dark" style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Share Your Day</Text>
              <Text style={styles.subtitle}>Pick a style & flex 💫</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <HugeiconsIcon icon={Cancel01Icon} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content Area */}
          <ScrollView 
            style={styles.scrollBody} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Template Selector — Horizontal Scroll */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateScroll}
            >
              {TEMPLATES.map((t) => {
                const isActive = activeTemplate === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.templateChip,
                      isActive && styles.templateChipActive,
                    ]}
                    onPress={() => {
                      setActiveTemplate(t.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.templateEmoji}>{t.emoji}</Text>
                    <Text
                      style={[
                        styles.templateLabel,
                        isActive && styles.templateLabelActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Preview Container */}
            <View style={styles.previewContainer}>
              <View style={styles.cardWrapper}>
                <View style={styles.scaledCard}>
                  {/* Performance Template */}
                  <View
                    ref={performanceRef}
                    collapsable={false}
                    style={{ display: activeTemplate === 'performance' ? 'flex' : 'none' }}
                  >
                    <DailyShareCard stats={stats} />
                  </View>

                  {/* Vs AI Template */}
                  <View
                    ref={vsaiRef}
                    collapsable={false}
                    style={{ display: activeTemplate === 'vsai' ? 'flex' : 'none' }}
                  >
                    <VsAiChallengeCard stats={stats} />
                  </View>

                  {/* Minimal Template */}
                  <View
                    ref={minimalRef}
                    collapsable={false}
                    style={{ display: activeTemplate === 'minimal' ? 'flex' : 'none' }}
                  >
                    <MinimalStoryCard stats={stats} />
                  </View>

                  {/* Timeline Template */}
                  <View
                    ref={timelineRef}
                    collapsable={false}
                    style={{ display: activeTemplate === 'timeline' ? 'flex' : 'none' }}
                  >
                    <WhatIEatInADayCard logs={logs} stats={stats} />
                  </View>

                  {/* Workout Template */}
                  <View
                    ref={workoutRef}
                    collapsable={false}
                    style={{ display: activeTemplate === 'workout' ? 'flex' : 'none' }}
                  >
                    <DailyWorkoutCard logs={logs} stats={stats} />
                  </View>
                </View>
              </View>
            </View>

            {/* AI Caption Section */}
            <View style={styles.captionSection}>
              {/* Tone Selector */}
              <View style={styles.toneRow}>
                <HugeiconsIcon icon={SparklesIcon} size={16} color="#A78BFA" />
                <Text style={styles.toneTitle}>AI Caption</Text>
                <View style={styles.toneChips}>
                  {TONES.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.toneChip,
                        captionTone === t.id && styles.toneChipActive,
                      ]}
                      onPress={() => handleToneChange(t.id)}
                    >
                      <Text style={styles.toneEmoji}>{t.emoji}</Text>
                      <Text
                        style={[
                          styles.toneLabel,
                          captionTone === t.id && styles.toneLabelActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Generated Caption */}
              {generatedCaption ? (
                <View style={styles.captionCard}>
                  <Text style={styles.captionText}>{generatedCaption}</Text>
                  <Text style={styles.hashtagsText}>{generatedHashtags.join(' ')}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                    <HugeiconsIcon
                      icon={isCopied ? CheckmarkCircle02Icon : Copy01Icon}
                      size={16}
                      color={isCopied ? '#10B981' : '#94A3B8'}
                    />
                    <Text style={[styles.copyText, isCopied && { color: '#10B981' }]}>
                      {isCopied ? 'Copied!' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={handleGenerateCaption}
                  disabled={isCaptionLoading}
                >
                  {isCaptionLoading ? (
                    <ActivityIndicator color="#A78BFA" size="small" />
                  ) : (
                    <>
                      <HugeiconsIcon icon={SparklesIcon} size={16} color="#A78BFA" />
                      <Text style={styles.generateBtnText}>Generate Caption</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Share Button (Fixed at bottom) */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.shareBtn, isSharing && styles.disabledBtn]} 
              onPress={handleShare}
              disabled={isSharing}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareGradient}
              >
                {isSharing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <HugeiconsIcon icon={Share02Icon} size={20} color="#FFF" />
                    <Text style={styles.shareText}>
                      {generatedCaption ? 'Share (Caption Copied)' : 'Share to Story'}
                    </Text>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const SCALE = (width - 48) / width;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#0A0F1A',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    height: height * 0.92,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Template Selector — Horizontal Scroll
  templateScroll: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 4,
    marginBottom: 16,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  templateChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  templateEmoji: {
    fontSize: 15,
  },
  templateLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  templateLabelActive: {
    color: '#ECFDF5',
    fontWeight: '800',
  },
  // Preview Container
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  cardWrapper: {
    width: width - 48,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  scaledCard: {
    width: width,
    transform: [{ scale: SCALE }],
    transformOrigin: 'top left',
  },
  // Caption Section
  captionSection: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  toneTitle: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
  },
  toneChips: {
    flexDirection: 'row',
    gap: 6,
  },
  toneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  toneChipActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderColor: 'rgba(167, 139, 250, 0.45)',
  },
  toneEmoji: {
    fontSize: 12,
  },
  toneLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  toneLabelActive: {
    color: '#C4B5FD',
  },
  captionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  captionText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  hashtagsText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  copyText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  generateBtnText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700',
  },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  shareBtn: {
    width: '100%',
    height: 58,
    borderRadius: 50,
    overflow: 'hidden',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  shareGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  shareText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
