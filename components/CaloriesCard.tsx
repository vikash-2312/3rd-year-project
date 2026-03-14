import { AvocadoIcon, BeefIcon, Bread01Icon, PencilEdit02Icon, Cancel01Icon, FireIcon, DropletIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useUser } from '@clerk/expo';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import { db } from '../lib/firebase';
import { Button } from './Button'; // Assuming you have a Button component
import { SegmentedHalfCircleProgress30 } from './Halfprogress';
import { useTheme } from '../lib/ThemeContext';

type CaloriesCardProps = {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  remaining: number;
  progress: number; // 0 to 1
  protein: number;
  carbs: number;
  fats: number;
  targetWaterLiters: number;
};

export interface CaloriesCardRef {
  openEditModal: () => void;
}

export const CaloriesCard = forwardRef<CaloriesCardRef, CaloriesCardProps>(({ 
  targetCalories, targetProtein, targetCarbs, targetFats, targetWaterLiters,
  remaining, progress, protein, carbs, fats 
}, ref) => {
  const { user } = useUser();
  const { colors, isDark } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for editing
  const [editCalories, setEditCalories] = useState(targetCalories.toString());
  const [editProtein, setEditProtein] = useState(targetProtein.toString());
  const [editCarbs, setEditCarbs] = useState(targetCarbs.toString());
  const [editFats, setEditFats] = useState(targetFats.toString());
  const [editWater, setEditWater] = useState(targetWaterLiters.toString());

  const openEditModal = () => {
    setEditCalories(targetCalories.toString());
    setEditProtein(targetProtein.toString());
    setEditCarbs(targetCarbs.toString());
    setEditFats(targetFats.toString());
    setEditWater(targetWaterLiters.toString());
    setIsModalVisible(true);
  };

  useImperativeHandle(ref, () => ({
    openEditModal
  }));

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const userRef = doc(db, 'users', user.id);
      
      const newMacros = {
        dailyCalories: parseInt(editCalories) || 0,
        proteinGrams: parseInt(editProtein) || 0,
        carbsGrams: parseInt(editCarbs) || 0,
        fatsGrams: parseInt(editFats) || 0,
        waterLiters: parseFloat(editWater) || 0,
      };

      // update specifically the macros sub-object
      await updateDoc(userRef, {
        'profile.macros.dailyCalories': newMacros.dailyCalories,
        'profile.macros.proteinGrams': newMacros.proteinGrams,
        'profile.macros.carbsGrams': newMacros.carbsGrams,
        'profile.macros.fatsGrams': newMacros.fatsGrams,
        'profile.macros.waterIntakeLiters': newMacros.waterLiters,
      });

      setIsModalVisible(false);
    } catch (error) {
      console.error('Error updating macros:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.titleText, { color: colors.text }]}>Calories</Text>
        </View>
        <TouchableOpacity style={styles.editButton} activeOpacity={0.7} onPress={openEditModal}>
          <HugeiconsIcon icon={PencilEdit02Icon} size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <SegmentedHalfCircleProgress30
          progress={progress}
          size={270}
          strokeWidth={40}
          segments={15}
          gapAngle={24}
          value={remaining}
          label="Remaining"
        />
      </View>

      <View style={styles.macroRow}>
        <View style={[styles.macroBlock, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
          <HugeiconsIcon icon={BeefIcon} size={20} color={isDark ? '#FC8181' : '#E53E3E'} />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: isDark ? '#FC8181' : '#E53E3E' }]}>{protein}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textTertiary }]}>Protein</Text>
          </View>
        </View>

        <View style={[styles.macroBlock, { backgroundColor: isDark ? '#3B2A1A' : '#FFFBEB' }]}>
          <HugeiconsIcon icon={Bread01Icon} size={20} color={isDark ? '#FBD38D' : '#DD6B20'} />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: isDark ? '#FBD38D' : '#DD6B20' }]}>{carbs}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textTertiary }]}>Carbs</Text>
          </View>
        </View>

        <View style={[styles.macroBlock, { backgroundColor: isDark ? '#1A3B35' : '#E6FFFA' }]}>
          <HugeiconsIcon icon={AvocadoIcon} size={20} color={isDark ? '#4FD1C5' : '#38B2AC'} />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: isDark ? '#4FD1C5' : '#38B2AC' }]}>{fats}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textTertiary }]}>Fats</Text>
          </View>
        </View>
      </View>

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Daily Targets</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[styles.closeButton, { backgroundColor: colors.cardAlt }]}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <View style={styles.inputHeader}>
                <View style={[styles.inputIconContainer, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
                  <HugeiconsIcon icon={FireIcon} size={18} color={isDark ? '#FC8181' : '#E53E3E'} />
                </View>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Daily Calories</Text>
              </View>
              <TextInput 
                style={[styles.textInput, { color: colors.text }]} 
                keyboardType="number-pad"
                value={editCalories}
                onChangeText={setEditCalories}
                placeholder="2000"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kcal</Text>
            </View>

            <View style={styles.macroInputsRow}>
              <View style={[styles.inputCard, { flex: 1, marginRight: 8, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={styles.inputHeader}>
                  <View style={[styles.inputIconContainer, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
                    <HugeiconsIcon icon={BeefIcon} size={16} color={isDark ? '#FC8181' : '#E53E3E'} />
                </View>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Protein</Text>
              </View>
              <TextInput 
                style={[styles.textInput, { color: colors.text }]} 
                keyboardType="number-pad"
                value={editProtein}
                onChangeText={setEditProtein}
                placeholder="150"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>g</Text>
            </View>

              <View style={[styles.inputCard, { flex: 1, marginLeft: 8, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={styles.inputHeader}>
                  <View style={[styles.inputIconContainer, { backgroundColor: isDark ? '#3B2A1A' : '#FFFBEB' }]}>
                    <HugeiconsIcon icon={Bread01Icon} size={16} color={isDark ? '#FBD38D' : '#DD6B20'} />
                  </View>
                  <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Carbs</Text>
                </View>
                <TextInput 
                  style={[styles.textInput, { color: colors.text }]} 
                  keyboardType="number-pad"
                  value={editCarbs}
                  onChangeText={setEditCarbs}
                  placeholder="200"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>g</Text>
              </View>
            </View>

            <View style={styles.macroInputsRow}>
              <View style={[styles.inputCard, { flex: 1, marginRight: 8, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={styles.inputHeader}>
                  <View style={[styles.inputIconContainer, { backgroundColor: isDark ? '#1A3B35' : '#E6FFFA' }]}>
                    <HugeiconsIcon icon={AvocadoIcon} size={16} color={isDark ? '#4FD1C5' : '#38B2AC'} />
                  </View>
                  <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Fats</Text>
                </View>
                <TextInput 
                  style={[styles.textInput, { color: colors.text }]} 
                  keyboardType="number-pad"
                  value={editFats}
                  onChangeText={setEditFats}
                  placeholder="70"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>g</Text>
              </View>

              <View style={[styles.inputCard, { flex: 1, marginLeft: 8, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={styles.inputHeader}>
                  <View style={[styles.inputIconContainer, { backgroundColor: isDark ? '#1A2A3B' : '#E0F2FE' }]}>
                    <HugeiconsIcon icon={DropletIcon} size={16} color={isDark ? '#63B3ED' : '#0EA5E9'} />
                  </View>
                  <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Water</Text>
                </View>
                <TextInput 
                  style={[styles.textInput, { color: colors.text }]} 
                  keyboardType="decimal-pad"
                  value={editWater}
                  onChangeText={setEditWater}
                  placeholder="2.5"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>L</Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button 
                title={isSaving ? "Saving..." : "Save Targets"} 
                onPress={handleSave} 
                disabled={isSaving}
                style={styles.saveButton}
              />
              <TouchableOpacity 
                style={styles.cancelLink} 
                onPress={() => setIsModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={[styles.cancelLinkText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    marginTop: 16,
    // Soft shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  editButton: {
    padding: 4,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
    // height: 100 // Space between arc and macros
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    height: 70,
    flex: 1,
    marginHorizontal: 4, // Spacing between blocks
  },
  macroTextContainer: {
    marginLeft: 8,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  macroLabel: {
    fontSize: 10,
    color: '#718096',
    marginTop: 2,
  },
  proteinBlock: {
    backgroundColor: '#FFF5F5', // Light red/pink
  },
  carbsBlock: {
    backgroundColor: '#FFFBEB', // Light yellow/orange
  },
  fatsBlock: {
    backgroundColor: '#E6FFFA', // Light teal
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 55, 72, 0.5)',
    justifyContent: 'center', // Center on screen for professional feel
    alignItems: 'center',
    padding: 24,
  },
  modalDialog: {
    width: Dimensions.get('window').width - 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
    flex: 1,
    textAlign: 'center',
    marginLeft: 32, 
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    padding: 8,
    marginBottom: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#718096',
  },
  macroInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textInput: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    paddingVertical: 2,
    paddingRight: 60, 
  },
  inputUnit: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    fontSize: 11,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  modalFooter: {
    marginTop: 8,
    alignItems: 'center',
  },
  saveButton: {
    width: '100%',
    height: 44,
    borderRadius: 22,
  },
  cancelLink: {
    marginTop: 8,
    padding: 4,
  },
  cancelLinkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A0AEC0',
  }
});
