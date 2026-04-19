import { AvocadoIcon, BeefIcon, Bread01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useUser } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../lib/firebase';
import { Button } from '../components/Button';
import { getFoodDetails, Serving } from '../lib/fatsecret';

export default function LogFoodScreen() {
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams();

  // Helper to parse initial quantity from serving string (e.g. "Per 100g" -> 100, "1 cup" -> 1)
  const parseInitialQuantity = (servingStr: string) => {
    const match = servingStr.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 1;
  };

  const parseInitialUnit = (servingStr: string) => {
    return servingStr.replace(/Per /i, '').replace(/\d+(\.\d+)?/, '').trim() || 'serving';
  };

  const initialQty = parseInitialQuantity((params.serving as string) || '1');
  const initialUnit = parseInitialUnit((params.serving as string) || 'serving');

  // We store the "Base" values (per 1 unit of quantity) so we can scale accurately
  // Safe parser: avoids NaN/Infinity from bad params or zero initialQty
  const safeDivide = (raw: string | undefined, qty: number) => {
    const val = parseFloat(raw as string);
    const safeQty = qty || 1;
    return isNaN(val) ? 0 : val / safeQty;
  };
  const [baseCalories, setBaseCalories] = useState(() => safeDivide((params.calories || params.aiCalories) as string, initialQty));
  const [baseProtein, setBaseProtein] = useState(() => safeDivide((params.protein || params.aiProtein) as string, initialQty));
  const [baseCarbs, setBaseCarbs] = useState(() => safeDivide((params.carbs || params.aiCarbs) as string, initialQty));
  const [baseFat, setBaseFat] = useState(() => safeDivide((params.fat || params.aiFat) as string, initialQty));
  const [baseFiber, setBaseFiber] = useState(() => safeDivide(params.fiber as string, initialQty));
  const [baseSugar, setBaseSugar] = useState(() => safeDivide(params.sugar as string, initialQty));
  const [baseAddedSugar, setBaseAddedSugar] = useState(() => safeDivide(params.addedSugar as string, initialQty));
  const [baseCalcium, setBaseCalcium] = useState(() => safeDivide(params.calcium as string, initialQty));
  const [baseSodium, setBaseSodium] = useState(() => safeDivide(params.sodium as string, initialQty));

  // States
  const [foodName] = useState((params.foodName || params.aiName) as string || 'Selected Food');
  const [brandName] = useState((params.brandName as string) || '');
  
  const [quantity, setQuantity] = useState(initialQty.toString());
  const [unit, setUnit] = useState(initialUnit);

  const [calories, setCalories] = useState((params.calories || params.aiCalories) as string || '0');
  const [protein, setProtein] = useState((params.protein || params.aiProtein) as string || '0');
  const [carbs, setCarbs] = useState((params.carbs || params.aiCarbs) as string || '0');
  const [fat, setFat] = useState((params.fat || params.aiFat) as string || '0');
  const [fiber, setFiber] = useState(params.fiber as string || '0');
  const [sugar, setSugar] = useState(params.sugar as string || '0');
  const [addedSugar, setAddedSugar] = useState(params.addedSugar as string || '0');
  const [calcium, setCalcium] = useState(params.calcium as string || '0');
  const [sodium, setSodium] = useState(params.sodium as string || '0');

  const [isLogging, setIsLogging] = useState(false);
  
  const [servings, setServings] = useState<Serving[]>([]);
  const [isFetchingServings, setIsFetchingServings] = useState(false);
  const [selectedServing, setSelectedServing] = useState<Serving | null>(null);

  React.useEffect(() => {
    if (params.foodId) {
      setIsFetchingServings(true);
      getFoodDetails(params.foodId as string)
        .then(data => {
          setServings(data);
          if (data.length > 0) {
            const matchedServing = data.find(s => {
              const desc = s.serving_description.toLowerCase().replace(/\s+/g, '');
              const target = initialUnit.toLowerCase().replace(/\s+/g, '');
              return desc === target || s.measurement_description.toLowerCase() === target || desc.includes(target);
            }) || data[0];
            
            setSelectedServing(matchedServing);
            setUnit(matchedServing.measurement_description);
            
            const units = parseFloat(matchedServing.number_of_units || '1');
            const multiplier = units > 0 ? 1 / units : 1;
            const newBaseCals = parseFloat(matchedServing.calories || '0') * multiplier;
            const newBaseProtein = parseFloat(matchedServing.protein || '0') * multiplier;
            const newBaseCarbs = parseFloat(matchedServing.carbs || '0') * multiplier;
            const newBaseFat = parseFloat(matchedServing.fat || '0') * multiplier;
            const newBaseFiber = parseFloat(matchedServing.fiber || '0') * multiplier;
            const newBaseSugar = parseFloat(matchedServing.sugar || '0') * multiplier;
            const newBaseAddedSugar = parseFloat(matchedServing.added_sugar || '0') * multiplier;
            const newBaseCalcium = parseFloat(matchedServing.calcium || '0') * multiplier;
            const newBaseSodium = parseFloat(matchedServing.sodium || '0') * multiplier;
            
            setBaseCalories(newBaseCals);
            setBaseProtein(newBaseProtein);
            setBaseCarbs(newBaseCarbs);
            setBaseFat(newBaseFat);
            setBaseFiber(newBaseFiber);
            setBaseSugar(newBaseSugar);
            setBaseAddedSugar(newBaseAddedSugar);
            setBaseCalcium(newBaseCalcium);
            setBaseSodium(newBaseSodium);

            setQuantity(prevQty => {
              const num = parseFloat(prevQty) || 1;
              setCalories((newBaseCals * num).toFixed(0));
              setProtein((newBaseProtein * num).toFixed(1));
              setCarbs((newBaseCarbs * num).toFixed(1));
              setFat((newBaseFat * num).toFixed(1));
              setFiber((newBaseFiber * num).toFixed(1));
              setSugar((newBaseSugar * num).toFixed(1));
              setAddedSugar((newBaseAddedSugar * num).toFixed(1));
              setCalcium((newBaseCalcium * num).toFixed(0));
              setSodium((newBaseSodium * num).toFixed(0));
              return prevQty;
            });
          }
        })
        .catch(e => console.log('Failed to fetch detailed servings:', e))
        .finally(() => setIsFetchingServings(false));
    }
  }, [params.foodId]);

  const handleSelectServing = (s: Serving) => {
    setSelectedServing(s);
    setUnit(s.measurement_description);
    
    const units = parseFloat(s.number_of_units || '1');
    const multiplier = units > 0 ? 1 / units : 1;
    const newBaseCals = parseFloat(s.calories || '0') * multiplier;
    const newBaseProtein = parseFloat(s.protein || '0') * multiplier;
    const newBaseCarbs = parseFloat(s.carbs || '0') * multiplier;
    const newBaseFat = parseFloat(s.fat || '0') * multiplier;
    const newBaseFiber = parseFloat(s.fiber || '0') * multiplier;
    const newBaseSugar = parseFloat(s.sugar || '0') * multiplier;
    const newBaseAddedSugar = parseFloat(s.added_sugar || '0') * multiplier;
    const newBaseCalcium = parseFloat(s.calcium || '0') * multiplier;
    const newBaseSodium = parseFloat(s.sodium || '0') * multiplier;
    
    setBaseCalories(newBaseCals);
    setBaseProtein(newBaseProtein);
    setBaseCarbs(newBaseCarbs);
    setBaseFat(newBaseFat);
    setBaseFiber(newBaseFiber);
    setBaseSugar(newBaseSugar);
    setBaseAddedSugar(newBaseAddedSugar);
    setBaseCalcium(newBaseCalcium);
    setBaseSodium(newBaseSodium);

    const num = parseFloat(quantity);
    if (!isNaN(num) && num >= 0) {
      setCalories((newBaseCals * num).toFixed(0));
      setProtein((newBaseProtein * num).toFixed(1));
      setCarbs((newBaseCarbs * num).toFixed(1));
      setFat((newBaseFat * num).toFixed(1));
      setFiber((newBaseFiber * num).toFixed(1));
      setSugar((newBaseSugar * num).toFixed(1));
      setAddedSugar((newBaseAddedSugar * num).toFixed(1));
      setCalcium((newBaseCalcium * num).toFixed(0));
      setSodium((newBaseSodium * num).toFixed(0));
    }
  };

  // Handle scaling when quantity changes
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setCalories((baseCalories * num).toFixed(0));
      setProtein((baseProtein * num).toFixed(1));
      setCarbs((baseCarbs * num).toFixed(1));
      setFat((baseFat * num).toFixed(1));
      setFiber((baseFiber * num).toFixed(1));
      setSugar((baseSugar * num).toFixed(1));
      setAddedSugar((baseAddedSugar * num).toFixed(1));
      setCalcium((baseCalcium * num).toFixed(0));
      setSodium((baseSodium * num).toFixed(0));
    }
  };

  const handleLogFood = async () => {
    if (!user) return;
    setIsLogging(true);

    try {
      // Create a log entry
      const logData = {
        userId: user.id,
        type: 'food',
        name: foodName,
        brand: brandName,
        serving: `${quantity} ${unit}`,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        fiber: parseFloat(fiber) || 0,
        sugar: parseFloat(sugar) || 0,
        addedSugar: parseFloat(addedSugar) || 0,
        calcium: parseFloat(calcium) || 0,
        sodium: parseFloat(sodium) || 0,
        timestamp: serverTimestamp(),
        date: format(new Date(), 'yyyy-MM-dd'), // Local date for grouping
      };

      console.log('[LogFood] Saving log:', logData);
      await addDoc(collection(db, 'logs'), logData);
      
      Alert.alert('Success', 'Food logged successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error('Error logging food:', error);
      Alert.alert('Error', 'Failed to log food. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Food</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.foodName}>{foodName}</Text>
          {brandName ? <Text style={styles.brandName}>{brandName}</Text> : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Serving Size</Text>
            {isFetchingServings ? (
              <ActivityIndicator size="small" color="#009050" style={{ marginVertical: 10, alignSelf: 'flex-start' }} />
            ) : servings.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servingsScroll} contentContainerStyle={styles.servingsScrollContent}>
                {servings.map(s => (
                  <TouchableOpacity 
                    key={s.serving_id} 
                    style={[styles.servingPill, selectedServing?.serving_id === s.serving_id && styles.servingPillActive]}
                    onPress={() => handleSelectServing(s)}
                  >
                    <Text style={[styles.servingPillText, selectedServing?.serving_id === s.serving_id && styles.servingPillTextActive]}>
                      {s.serving_description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.servingInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 0.3, marginRight: 12 }]}
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="numeric"
                placeholder="Qty"
              />
              <TextInput
                style={[styles.textInput, { flex: 0.7 }]}
                value={unit}
                onChangeText={setUnit}
                placeholder="Unit (e.g. cup, g)"
              />
            </View>
          </View>

          <View style={styles.caloriesCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <View style={styles.fireDot} />
              </View>
              <Text style={styles.cardTitle}>Calories</Text>
            </View>
            <View style={styles.calorieInputContainer}>
              <TextInput
                style={styles.calorieInput}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
              />
              <Text style={styles.kcalLabel}>kcal</Text>
            </View>
          </View>

          <View style={styles.macrosGrid}>
            <View style={[styles.macroItem, styles.proteinBg]}>
              <View style={styles.macroHeader}>
                <HugeiconsIcon icon={BeefIcon} size={18} color="#E53E3E" />
                <Text style={[styles.macroLabel, { color: '#E53E3E' }]}>Protein</Text>
              </View>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>g</Text>
              </View>
            </View>

            <View style={[styles.macroItem, styles.carbsBg]}>
              <View style={styles.macroHeader}>
                <HugeiconsIcon icon={Bread01Icon} size={18} color="#DD6B20" />
                <Text style={[styles.macroLabel, { color: '#DD6B20' }]}>Carbs</Text>
              </View>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>g</Text>
              </View>
            </View>

            <View style={[styles.macroItem, styles.fatsBg]}>
              <View style={styles.macroHeader}>
                <HugeiconsIcon icon={AvocadoIcon} size={18} color="#38B2AC" />
                <Text style={[styles.macroLabel, { color: '#38B2AC' }]}>Fats</Text>
              </View>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>g</Text>
              </View>
            </View>

            <View style={[styles.macroItem, styles.fiberBg]}>
              <View style={styles.macroHeader}>
                <View style={styles.fiberDot} />
                <Text style={[styles.macroLabel, { color: '#3182CE' }]}>Fiber</Text>
              </View>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={fiber}
                  onChangeText={setFiber}
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>g</Text>
              </View>
            </View>

            <View style={[styles.macroItem, styles.sugarBg]}>
              <View style={styles.macroHeader}>
                <View style={styles.sugarDot} />
                <Text style={[styles.macroLabel, { color: '#805AD5' }]}>Sugar</Text>
              </View>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={sugar}
                  onChangeText={setSugar}
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>g</Text>
              </View>
            </View>

            <View style={[styles.macroItem, styles.addedSugarBg]}>
              <View style={styles.macroHeader}>
                <View style={styles.addedSugarDot} />
                <Text style={[styles.macroLabel, { color: '#B83280' }]}>Added Sugar</Text>
              </View>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={addedSugar}
                  onChangeText={setAddedSugar}
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>g</Text>
              </View>
            </View>

            <View style={[styles.macroItem, styles.calciumBg]}>
              <View style={styles.macroHeader}>
                <View style={styles.calciumDot} />
                <Text style={[styles.macroLabel, { color: '#2F855A' }]}>Calcium</Text>
              </View>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={calcium}
                  onChangeText={setCalcium}
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>mg</Text>
              </View>
            </View>

            <View style={[styles.macroItem, styles.sodiumBg]}>
              <View style={styles.macroHeader}>
                <View style={styles.sodiumDot} />
                <Text style={[styles.macroLabel, { color: '#C05621' }]}>Sodium</Text>
              </View>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={sodium}
                  onChangeText={setSodium}
                  keyboardType="numeric"
                />
                <Text style={styles.unitLabel}>mg</Text>
              </View>
            </View>
          </View>

          {/* Bottom Button */}
          <View style={styles.footer}>
            <Button
              title={isLogging ? "Logging..." : (isFetchingServings ? "Loading Details..." : "Log Food")}
              onPress={handleLogFood}
              disabled={isLogging || isFetchingServings}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  foodName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  brandName: {
    fontSize: 16,
    color: '#A0AEC0',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  servingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  servingsScroll: {
    marginBottom: 16,
    marginHorizontal: -24,
  },
  servingsScrollContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  servingPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  servingPillActive: {
    backgroundColor: '#E6FFFA',
    borderColor: '#38B2AC',
  },
  servingPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
  },
  servingPillTextActive: {
    color: '#2C7A7B',
    fontWeight: '600',
  },
  caloriesCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fireDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53E3E',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
  },
  calorieInputContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  calorieInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2D3748',
    minWidth: 100,
    padding: 0,
  },
  kcalLabel: {
    fontSize: 18,
    color: '#A0AEC0',
    marginLeft: 8,
    fontWeight: '600',
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 40,
  },
  macroItem: {
    width: '31%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    padding: 0,
    flex: 1,
  },
  unitLabel: {
    fontSize: 14,
    color: '#A0AEC0',
    marginLeft: 2,
    fontWeight: '600',
  },
  proteinBg: { backgroundColor: '#FFF5F5' },
  carbsBg: { backgroundColor: '#FFFBEB' },
  fatsBg: { backgroundColor: '#E6FFFA' },
  fiberBg: { backgroundColor: '#EBF8FF' },
  sugarBg: { backgroundColor: '#FAF5FF' },
  addedSugarBg: { backgroundColor: '#FFF5F7' },
  calciumBg: { backgroundColor: '#F0FFF4' },
  sodiumBg: { backgroundColor: '#FFFAF0' },
  fiberDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3182CE',
  },
  sugarDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#805AD5',
  },
  addedSugarDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#B83280',
  },
  calciumDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2F855A',
  },
  sodiumDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#C05621',
  },
  footer: {
    marginTop: 10,
  },
});
