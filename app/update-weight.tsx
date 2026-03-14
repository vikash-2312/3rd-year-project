import { useUser } from "@clerk/expo";
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../lib/firebase";

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function UpdateWeight() {
  const { user } = useUser();
  const router = useRouter();
  const [currentWeight, setCurrentWeight] = useState<number>(70);
  const [selectedWeight, setSelectedWeight] = useState<number>(70);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCurrentWeight = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const weight = data.profile?.measurements?.weightKg || data.onboarding_weight || 70;
          setCurrentWeight(Number(weight));
          setSelectedWeight(Number(weight));
        }
      } catch (error) {
        console.error("Error fetching weight:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentWeight();
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      // 1. Update User Profile
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        'profile.measurements.weightKg': selectedWeight,
        'onboarding_weight': selectedWeight,
        'updatedAt': serverTimestamp()
      });

      // 2. Log Weight Change for graphing later
      await addDoc(collection(db, 'weight_logs'), {
        userId: user.id,
        weightKg: selectedWeight,
        date: todayStr,
        timestamp: serverTimestamp()
      });

      router.back();
    } catch (error) {
      console.error("Error updating weight:", error);
      alert("Failed to update weight. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const adjustWeight = (amount: number) => {
    setSelectedWeight(prev => {
      const newVal = Math.round((prev + amount) * 10) / 10;
      return Math.max(30, Math.min(250, newVal));
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009050" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <HugeiconsIcon icon={ArrowLeft02Icon} size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Weight</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Large Weight Display */}
          <View style={styles.displayContainer}>
            <Text style={styles.weightValue}>{selectedWeight.toFixed(1)}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          {/* Weight Adjuster */}
          <View style={styles.adjusterRow}>
            <TouchableOpacity style={styles.adjusterBtn} onPress={() => adjustWeight(-1)} activeOpacity={0.7}>
              <Text style={styles.adjusterBtnText}>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjusterBtnSmall} onPress={() => adjustWeight(-0.1)} activeOpacity={0.7}>
              <Text style={styles.adjusterBtnSmallText}>-0.1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjusterBtnSmall} onPress={() => adjustWeight(0.1)} activeOpacity={0.7}>
              <Text style={styles.adjusterBtnSmallText}>+0.1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjusterBtn} onPress={() => adjustWeight(1)} activeOpacity={0.7}>
              <Text style={styles.adjusterBtnText}>+1</Text>
            </TouchableOpacity>
          </View>

          {/* Quick preset buttons */}
          <View style={styles.presetsRow}>
            {[50, 60, 70, 80, 90, 100].map(w => (
              <TouchableOpacity
                key={w}
                style={[styles.presetBtn, selectedWeight === w && styles.presetBtnActive]}
                onPress={() => setSelectedWeight(w)}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, selectedWeight === w && styles.presetTextActive]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Updating your weight helps us calculate your calorie goals more accurately.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdate}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.updateButtonText}>Update Weight</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 40,
  },
  weightValue: {
    fontSize: 72,
    fontWeight: '900',
    color: '#009050',
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '700',
    color: '#718096',
    marginLeft: 8,
  },
  adjusterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  adjusterBtn: {
    width: 64,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#009050',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjusterBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  adjusterBtnSmall: {
    width: 64,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F0FFF4',
    borderWidth: 1.5,
    borderColor: '#C6F6D5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjusterBtnSmallText: {
    color: '#009050',
    fontSize: 16,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 40,
  },
  presetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  presetBtnActive: {
    backgroundColor: '#009050',
    borderColor: '#009050',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#718096',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  infoBox: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: '#F0FFF4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  infoText: {
    fontSize: 14,
    color: '#2F855A',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  updateButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#009050',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
