import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Dimensions, ScrollView } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  SparklesIcon, 
  Activity01Icon, 
  BeefIcon, 
  DropletIcon, 
  FireIcon, 
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  FavouriteIcon
} from '@hugeicons/core-free-icons';
import { useTheme } from '../lib/ThemeContext';
import Animated, { FadeInDown, SlideInUp, SlideOutDown } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ScoreComponentProps {
  label: string;
  score: number;
  maxScore: number;
  icon: any;
  color: string;
  description: string;
}

const ScoreComponent = ({ label, score, maxScore, icon, color, description }: ScoreComponentProps) => {
  const { colors } = useTheme();
  const percentage = (score / maxScore) * 100;

  return (
    <View style={styles.scoreRow}>
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <HugeiconsIcon icon={icon} size={22} color={color} />
      </View>
      <View style={styles.scoreInfo}>
        <View style={styles.scoreHeader}>
          <Text style={[styles.scoreLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.scoreValue, { color }]}>{Math.round(score)} / {maxScore}</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.scoreDescription, { color: colors.textTertiary }]}>{description}</Text>
      </View>
    </View>
  );
};

interface HealthScoreModalProps {
  isVisible: boolean;
  onClose: () => void;
  totalScore: number;
  breakdown: {
    protein: number;
    macros: number;
    exercise: number;
    water: number;
    calories: number;
  };
  onProfilePress: () => void;
}

export function HealthScoreModal({ isVisible, onClose, totalScore, breakdown, onProfilePress }: HealthScoreModalProps) {
  const { colors, isDark } = useTheme();

  const scoreColor = totalScore >= 70 ? '#009050' : totalScore >= 40 ? '#D69E2E' : '#E53E3E';
  const scoreLabel = totalScore >= 90 ? 'Excellent' : totalScore >= 70 ? 'Great' : totalScore >= 50 ? 'Developing' : 'Action Needed';

  const getInsight = () => {
    if (totalScore >= 90) return "You're in the elite zone! Your consistency is phenomenal. 💎";
    if (breakdown.water < 15) return "Boost your hydration to see your focus and score improve instantly. 💧";
    if (breakdown.exercise < 10) return "A quick 15-minute walk would push your movement score significantly. 🏃";
    if (breakdown.protein < 15) return "Your protein is slightly low today—try a high-protein snack. 🍗";
    return "You're having a solid day. Keep tracking to maintain your momentum! 🔥";
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        
        <Animated.View 
          entering={SlideInUp.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.content, { backgroundColor: colors.background }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          
          <View style={styles.header}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Daily Health Pulse</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>How your score is calculated</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
              <HugeiconsIcon icon={Cancel01Icon} size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Master Score Display */}
            <View style={[styles.masterScoreContainer, { backgroundColor: `${scoreColor}10` }]}>
              <View style={styles.masterScoreLeft}>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>Overall Performance</Text>
                <Text style={[styles.summaryStatus, { color: scoreColor }]}>{scoreLabel}</Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                <Text style={styles.scoreBadgeValue}>{totalScore}</Text>
              </View>
            </View>

            {/* AI Insight Pill */}
            <View style={[styles.insightPill, { backgroundColor: isDark ? '#1A202C' : '#F7FAFC' }]}>
              <HugeiconsIcon icon={SparklesIcon} size={18} color={colors.accent} />
              <Text style={[styles.insightText, { color: colors.text }]}>{getInsight()}</Text>
            </View>

            <View style={styles.breakdownSection}>
              <ScoreComponent 
                label="Protein Target" 
                score={breakdown.protein} 
                maxScore={20} 
                icon={BeefIcon} 
                color="#E53E3E" 
                description="Fueling muscle recovery and satiety."
              />
              <ScoreComponent 
                label="Macro Balance" 
                score={breakdown.macros} 
                maxScore={20} 
                icon={FavouriteIcon} 
                color="#3182CE" 
                description="Complexity and quality of nutrient intake."
              />
              <ScoreComponent 
                label="Movement" 
                score={breakdown.exercise} 
                maxScore={20} 
                icon={Activity01Icon} 
                color="#009050" 
                description="Daily activity and exercise duration."
              />
              <ScoreComponent 
                label="Hydration" 
                score={breakdown.water} 
                maxScore={20} 
                icon={DropletIcon} 
                color="#4299E1" 
                description="Cellular function and fluid balance."
              />
              <ScoreComponent 
                label="Calorie Alignment" 
                score={breakdown.calories} 
                maxScore={20} 
                icon={FireIcon} 
                color="#D69E2E" 
                description="Adherence to your daily energy goal."
              />
            </View>

            <TouchableOpacity 
              style={[styles.profileLink, { backgroundColor: colors.card }]}
              onPress={() => {
                onClose();
                onProfilePress();
              }}
            >
              <View style={styles.profileLinkLeft}>
                <Text style={[styles.profileLinkTitle, { color: colors.text }]}>View Full Analytics</Text>
                <Text style={[styles.profileLinkSub, { color: colors.textTertiary }]}>Detailed trends and goal history</Text>
              </View>
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.accent }]} onPress={onClose}>
              <Text style={styles.doneBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  masterScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  masterScoreLeft: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.8,
  },
  summaryStatus: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scoreBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreBadgeValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
  },
  insightPill: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    gap: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  breakdownSection: {
    gap: 20,
    marginBottom: 24,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreDescription: {
    fontSize: 12,
    fontWeight: '500',
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  profileLinkLeft: {
    flex: 1,
  },
  profileLinkTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  profileLinkSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    marginTop: 8,
  },
  doneBtn: {
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
