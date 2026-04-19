import React, { useState } from 'react';
import { 
  Modal, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Dimensions, 
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  Cancel01Icon,
  CheckmarkCircle02Icon,
  WalkingIcon,
  Moon02Icon,
  SmartWatch01Icon
} from '@hugeicons/core-free-icons';
import { useTheme } from '../lib/ThemeContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc 
} from 'firebase/firestore';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { format, startOfDay } from 'date-fns';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ManualHealthEntryModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: string;
  date: string;
  initialSteps?: number;
  initialSleep?: number;
}

export function ManualHealthEntryModal({ 
  isVisible, 
  onClose, 
  userId, 
  date,
  initialSteps = 0,
  initialSleep = 0
}: ManualHealthEntryModalProps) {
  const { colors, isDark } = useTheme();
  const [steps, setSteps] = useState(initialSteps > 0 ? initialSteps.toString() : '');
  const [sleepHours, setSleepHours] = useState(Math.floor(initialSleep).toString());
  const [sleepMinutes, setSleepMinutes] = useState(Math.round((initialSleep % 1) * 60).toString());
  const [isSaving, setIsSaving] = useState(false);
  
  const isFuture = startOfDay(new Date(date)) > startOfDay(new Date());

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Clean input: remove commas and whitespace
      const cleanSteps = steps.replace(/,/g, '').trim();
      const cleanHours = sleepHours.replace(/,/g, '').trim();
      const cleanMins = sleepMinutes.replace(/,/g, '').trim();

      const parsedSteps = parseInt(cleanSteps) || 0;
      const parsedSleep = (parseInt(cleanHours) || 0) + (parseInt(cleanMins) || 0) / 60;

      const logsRef = collection(db, 'logs');
      
      const upsertLog = async (type: string, data: any) => {
        const q = query(
          logsRef,
          where('userId', '==', userId),
          where('date', '==', date)
        );
        const querySnapshot = await getDocs(q);
        const existingDoc = querySnapshot.docs.find(d => d.data().type === type);
        
        if (existingDoc) {
          // Update existing
          await updateDoc(doc(db, 'logs', existingDoc.id), {
            ...data,
            timestamp: serverTimestamp(), // Refresh timestamp
          });
        } else {
          // Add new
          await addDoc(logsRef, {
            ...data,
            userId,
            type,
            date,
            timestamp: serverTimestamp(),
          });
        }
      };

      const promises = [];

      if (parsedSteps > 0) {
        promises.push(upsertLog('steps', {
          steps: parsedSteps,
          name: 'Manual Steps',
        }));
      }

      if (parsedSleep > 0) {
        promises.push(upsertLog('sleep', {
          sleepHours: parseFloat(parsedSleep.toFixed(2)),
          name: 'Manual Sleep',
        }));
      }

      await Promise.all(promises);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Manual health entry saved successfully!");
      onClose();
    } catch (error) {
      console.error('[ManualHealthEntry] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <Animated.View 
              entering={SlideInDown.springify().damping(20)}
              exiting={SlideOutDown.duration(200)}
              style={[styles.content, { backgroundColor: colors.background }]}
            >
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              
              <View style={styles.header}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Manual Activity Log</Text>
                  <Text style={[styles.modalSubtitle, { color: isFuture ? colors.warning : colors.textTertiary }]}>
                    {isFuture ? "You cannot log data for future dates." : `Adding for ${format(new Date(date), 'MMM d, yyyy')}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
                  <HugeiconsIcon icon={Cancel01Icon} size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                {/* Steps Input */}
                <View style={styles.inputSection}>
                  <View style={styles.inputHeader}>
                    <View style={[styles.iconBox, { backgroundColor: '#4ADE8020' }]}>
                      <HugeiconsIcon icon={WalkingIcon} size={20} color="#4ADE80" />
                    </View>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Daily Steps</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                    placeholder="e.g. 10000"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={steps}
                    onChangeText={setSteps}
                  />
                </View>

                {/* Sleep Input */}
                <View style={styles.inputSection}>
                  <View style={styles.inputHeader}>
                    <View style={[styles.iconBox, { backgroundColor: '#A78BFA20' }]}>
                      <HugeiconsIcon icon={Moon02Icon} size={20} color="#A78BFA" />
                    </View>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Sleep Duration</Text>
                  </View>
                  <View style={styles.sleepInputRow}>
                    <View style={styles.sleepInputGroup}>
                      <TextInput
                        style={[styles.textInput, styles.halfInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                        placeholder="Hours"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        value={sleepHours}
                        onChangeText={setSleepHours}
                      />
                      <Text style={[styles.unitLabel, { color: colors.textTertiary }]}>hrs</Text>
                    </View>
                    <View style={styles.sleepInputGroup}>
                      <TextInput
                        style={[styles.textInput, styles.halfInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                        placeholder="Mins"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        value={sleepMinutes}
                        onChangeText={setSleepMinutes}
                      />
                      <Text style={[styles.unitLabel, { color: colors.textTertiary }]}>mins</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.footer}>
                <TouchableOpacity 
                  style={[styles.saveBtn, { backgroundColor: isFuture ? colors.border : colors.accent }]} 
                  onPress={handleSave}
                  disabled={isSaving || isFuture}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <HugeiconsIcon icon={isFuture ? Cancel01Icon : CheckmarkCircle02Icon} size={20} color="#FFF" />
                      <Text style={styles.saveBtnText}>{isFuture ? "Future Log Disabled" : "Save Activities"}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
  form: {
    gap: 24,
    marginBottom: 32,
  },
  inputSection: {
    gap: 12,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  textInput: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  sleepInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sleepInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 8,
  },
  saveBtn: {
    height: 56,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
