import { AvocadoIcon, BeefIcon, Bread01Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useUser } from '@clerk/expo';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../lib/firebase';
import { Button } from './Button'; // Assuming you have a Button component
import { SegmentedHalfCircleProgress30 } from './Halfprogress'; // Adjust path if needed

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
};

export function CaloriesCard({ 
  targetCalories, targetProtein, targetCarbs, targetFats,
  remaining, progress, protein, carbs, fats 
}: CaloriesCardProps) {
  const { user } = useUser();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for editing
  const [editCalories, setEditCalories] = useState(targetCalories.toString());
  const [editProtein, setEditProtein] = useState(targetProtein.toString());
  const [editCarbs, setEditCarbs] = useState(targetCarbs.toString());
  const [editFats, setEditFats] = useState(targetFats.toString());

  const openEditModal = () => {
    setEditCalories(targetCalories.toString());
    setEditProtein(targetProtein.toString());
    setEditCarbs(targetCarbs.toString());
    setEditFats(targetFats.toString());
    setIsModalVisible(true);
  };

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
      };

      // update specifically the macros sub-object
      await updateDoc(userRef, {
        'profile.macros.dailyCalories': newMacros.dailyCalories,
        'profile.macros.proteinGrams': newMacros.proteinGrams,
        'profile.macros.carbsGrams': newMacros.carbsGrams,
        'profile.macros.fatsGrams': newMacros.fatsGrams,
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
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {/* <FireIcon size={20} color="#FF6B6B" variant="solid" style={styles.iconSpaced} /> */}
          <Text style={styles.titleText}>Calories</Text>
        </View>
        <TouchableOpacity style={styles.editButton} activeOpacity={0.7} onPress={openEditModal}>
          <HugeiconsIcon icon={PencilEdit02Icon} size={20} color="#009050" />
        </TouchableOpacity>
      </View>

      {/* Progress Arc Area */}
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

      {/* Macronutrient Row */}
      <View style={styles.macroRow}>
        {/* Protein Block */}
        <View style={[styles.macroBlock, styles.proteinBlock]}>
          <HugeiconsIcon icon={BeefIcon} size={20} color="#E53E3E" />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: '#E53E3E' }]}>{protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
        </View>

        {/* Carbs Block */}
        <View style={[styles.macroBlock, styles.carbsBlock]}>
          <HugeiconsIcon icon={Bread01Icon} size={20} color="#DD6B20" />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: '#DD6B20' }]}>{carbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
        </View>

        {/* Fats Block */}
        <View style={[styles.macroBlock, styles.fatsBlock]}>
          <HugeiconsIcon icon={AvocadoIcon} size={20} color="#38B2AC" />
          <View style={styles.macroTextContainer}>
            <Text style={[styles.macroValue, { color: '#38B2AC' }]}>{fats}g</Text>
            <Text style={styles.macroLabel}>Fats</Text>
          </View>
        </View>
      </View>

      {/* Edit Macros Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Daily Targets</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Daily Calories (kcal)</Text>
              <TextInput 
                style={styles.textInput} 
                keyboardType="number-pad"
                value={editCalories}
                onChangeText={setEditCalories}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput 
                style={styles.textInput} 
                keyboardType="number-pad"
                value={editProtein}
                onChangeText={setEditProtein}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput 
                style={styles.textInput} 
                keyboardType="number-pad"
                value={editCarbs}
                onChangeText={setEditCarbs}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fats (g)</Text>
              <TextInput 
                style={styles.textInput} 
                keyboardType="number-pad"
                value={editFats}
                onChangeText={setEditFats}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button 
                title="Cancel" 
                variant="outline" 
                style={{ flex: 1, marginRight: 8 }} 
                onPress={() => setIsModalVisible(false)} 
                disabled={isSaving}
              />
              <Button 
                title={isSaving ? "Saving..." : "Save"} 
                style={{ flex: 1, marginLeft: 8 }} 
                onPress={handleSave} 
                disabled={isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3748',
    backgroundColor: '#F7FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
  }
});
