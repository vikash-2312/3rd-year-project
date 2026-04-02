import { Add01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodSearchResult, searchFoods } from '../lib/fatsecret';

export default function FoodSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search: triggers after 500ms pause and 3+ chars
  const handleSearch = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const data = await searchFoods(text, 10);
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const renderFoodItem = ({ item }: { item: FoodSearchResult }) => (
    <View style={styles.foodCard}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>
          {item.food_name}
          {item.brand_name ? ` (${item.brand_name})` : ''}
        </Text>
        <Text style={styles.foodServing}>{item.serving}</Text>
        <Text style={styles.foodCalories}>{item.calories} kcal</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: '/log-food',
            params: {
              foodId: item.food_id,
              foodName: item.food_name,
              brandName: item.brand_name || '',
              serving: item.serving,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
            }
          });
        }}
      >
        <HugeiconsIcon icon={Add01Icon} size={20} color="#009050" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#2D3748" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Search Food</Text>

      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search food database..."
          placeholderTextColor="#A0AEC0"
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#009050" style={styles.loader} />
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.food_id}
          renderItem={renderFoodItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : hasSearched ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubText}>Try a different search term</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Start typing to search</Text>
          <Text style={styles.emptySubText}>Search requires at least 3 characters</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
  },
  searchBarContainer: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4,
  },
  foodServing: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: '#009050',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: '#A0AEC0',
  },
});
