import { useUser } from '@clerk/expo';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { router } from 'expo-router';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft02Icon, PlusSignIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { db } from '../lib/firebase';
import { Button } from '../components/Button';

export default function LogWater() {
  const { user } = useUser();
  const [ml, setMl] = useState(250); // Default 1 glass
  const GLASS_ML = 250;
  const HALF_GLASS_ML = 125;
  const MAX_ML = 1000; // 4 glasses max as per user request
  const [isLogging, setIsLogging] = useState(false);

  const increment = () => {
    if (ml < MAX_ML) {
      setMl(prev => prev + HALF_GLASS_ML);
    }
  };

  const decrement = () => {
    if (ml > 0) {
      setMl(prev => prev - HALF_GLASS_ML);
    }
  };

  const currentGlasses = ml / GLASS_ML;

  const renderVisualGlasses = () => {
    const fullGlasses = Math.floor(currentGlasses);
    const hasHalf = currentGlasses % 1 !== 0;
    const glasses = [];

    // If 0ml, show one empty glass
    if (ml === 0) {
      return (
        <View style={styles.visualContainer}>
          <Image 
            source={require('../assets/images/full_glass.png')} 
            style={[styles.bigGlass, styles.emptyGlass]} 
            resizeMode="contain"
          />
        </View>
      );
    }

    // Show full glasses
    for (let i = 0; i < fullGlasses; i++) {
      glasses.push(
        <Image 
          key={`full-${i}`}
          source={require('../assets/images/full_glass.png')} 
          style={styles.bigGlass} 
          resizeMode="contain"
        />
      );
    }

    // Show half glass if needed
    if (hasHalf) {
      glasses.push(
        <Image 
          key="half"
          source={require('../assets/images/half_glass.png')} 
          style={styles.bigGlass} 
          resizeMode="contain"
        />
      );
    }

    return (
      <View style={styles.visualContainer}>
        {glasses}
      </View>
    );
  };

  const handleLog = async () => {
    if (!user || isLogging || ml === 0) return;

    setIsLogging(true);
    try {
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      await addDoc(collection(db, 'logs'), {
        userId: user.id,
        type: 'water',
        waterLiters: ml / 1000,
        date: dateStr,
        timestamp: serverTimestamp(),
      });
      router.back();
    } catch (error) {
      console.error("Error logging water:", error);
      alert("Failed to log water. Please try again.");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <HugeiconsIcon icon={ArrowLeft02Icon} size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Water Intake</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.displaySection}>
          {renderVisualGlasses()}
          
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              onPress={decrement} 
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <HugeiconsIcon icon={MinusSignIcon} size={24} color="#009050" />
            </TouchableOpacity>
            
            <View style={styles.mlContainer}>
              <Text style={styles.mlText}>{ml}</Text>
              <Text style={styles.unitText}>ml</Text>
            </View>

            <TouchableOpacity 
              onPress={increment} 
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={24} color="#009050" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Standard glass: {GLASS_ML}ml
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title={isLogging ? "Logging..." : "Log Water"} 
          onPress={handleLog}
          disabled={ml === 0 || isLogging}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displaySection: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 40,
  },
  visualContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 180,
    marginBottom: 40,
    gap: 12,
  },
  bigGlass: {
    width: 80,
    height: 120,
  },
  emptyGlass: {
    opacity: 0.1,
    tintColor: '#D1D5DB',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mlContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  mlText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2D3748',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
  },
  infoBox: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 20,
  },
  infoText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
});
