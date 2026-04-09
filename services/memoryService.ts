/**
 * memoryService.ts
 * 
 * Manages persistent user preferences (allergies, diet, dislikes, conditions)
 * using AsyncStorage. The AI chatbot reads this memory to personalize responses
 * and writes to it when the user shares new preferences.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// --- Types ---

export interface UserMemory {
  allergies: string[];
  diet_preference: string; // e.g. "vegetarian", "keto", "vegan"
  disliked_foods: string[];
  habits: string[];        // e.g. "late night snacking", "fast eater"
  weak_points: string[];   // e.g. "sweets", "soda", "skipping breakfast"
  conditions: string[];    // e.g. "diabetes", "high blood pressure"
  
  // --- Behavioral/Coaching (Memory 2.0) ---
  personality_pref: string; // "Strict", "Supportive", "Scientific"
  complexity_pref: string;  // "Quick/Easy", "Gourmet", "Takeout-heavy"
  meal_timing: string;      // "Intermittent Fasting", "Small/Frequent"
  unstructured_bio: string; // Free-form AI notes/reflections
}

// --- Constants ---

const getMemoryKey = (userId: string) => `@ai_user_memory_${userId}`;
const LEGACY_KEY = '@ai_fitness_user_memory'; // Migration handle

const DEFAULT_MEMORY: UserMemory = {
  allergies: [],
  diet_preference: '',
  disliked_foods: [],
  habits: [],
  weak_points: [],
  conditions: [],
  personality_pref: 'Supportive',
  complexity_pref: 'Quick/Easy',
  meal_timing: '',
  unstructured_bio: '',
};

// --- Public API ---

/**
 * Retrieves the full user memory object from persistent storage.
 * Returns default empty memory if nothing is stored yet.
 */
export async function getMemory(userId: string): Promise<UserMemory> {
  try {
    const key = getMemoryKey(userId);
    // 1. Try Firestore first (Production source of truth)
    try {
      const docRef = doc(db, 'users', userId, 'data', 'bio_memory');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserMemory;
        // Merge with defaults to ensure new Memory 2.0 fields are present
        const merged = { ...DEFAULT_MEMORY, ...data };
        await AsyncStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    } catch (fsError) {
      console.warn("[MemoryService] Firestore fetch failed, falling back to cache:", fsError);
    }

    // 2. Fallback to AsyncStorage (Cache/Legacy)
    let raw = await AsyncStorage.getItem(key);
    
    if (!raw) return { ...DEFAULT_MEMORY };

    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing fields from older versions
    return {
      allergies: parsed.allergies || [],
      diet_preference: parsed.diet_preference || parsed.diet || '',
      disliked_foods: parsed.disliked_foods || parsed.dislikes || [],
      habits: parsed.habits || [],
      weak_points: parsed.weak_points || [],
      conditions: parsed.conditions || [],
      personality_pref: parsed.personality_pref || 'Supportive',
      complexity_pref: parsed.complexity_pref || 'Quick/Easy',
      meal_timing: parsed.meal_timing || '',
      unstructured_bio: parsed.unstructured_bio || '',
    };
  } catch (error) {
    console.error(`[MemoryService] Error reading memory for ${userId}:`, error);
    return { ...DEFAULT_MEMORY };
  }
}

/**
 * Merges a partial update into the existing user memory.
 * Arrays are merged (union, no duplicates). Strings are overwritten.
 */
export async function updateMemory(userId: string, partial: Partial<UserMemory>): Promise<UserMemory> {
  try {
    const current = await getMemory(userId);

    // Merge arrays (deduplicated), overwrite strings
    const updated: UserMemory = {
      allergies: deduplicateArray([
        ...current.allergies,
        ...(partial.allergies || []),
      ]),
      diet_preference: partial.diet_preference !== undefined ? partial.diet_preference : current.diet_preference,
      disliked_foods: deduplicateArray([
        ...current.disliked_foods,
        ...(partial.disliked_foods || []),
      ]),
      habits: deduplicateArray([
        ...current.habits,
        ...(partial.habits || []),
      ]),
      weak_points: deduplicateArray([
        ...current.weak_points,
        ...(partial.weak_points || []),
      ]),
      conditions: deduplicateArray([
        ...current.conditions,
        ...(partial.conditions || []),
      ]),
      // Overwrite string preferences with fallback to current/default
      personality_pref: partial.personality_pref ?? current.personality_pref ?? DEFAULT_MEMORY.personality_pref,
      complexity_pref: partial.complexity_pref ?? current.complexity_pref ?? DEFAULT_MEMORY.complexity_pref,
      meal_timing: partial.meal_timing ?? current.meal_timing ?? DEFAULT_MEMORY.meal_timing,
      unstructured_bio: partial.unstructured_bio ?? current.unstructured_bio ?? DEFAULT_MEMORY.unstructured_bio,
    };

    // 1. Save to Firestore (Sync)
    try {
      const docRef = doc(db, 'users', userId, 'data', 'bio_memory');
      await setDoc(docRef, updated, { merge: true });
    } catch (fsError) {
      console.error("[MemoryService] Firestore sync failed:", fsError);
    }

    // 2. Save to AsyncStorage (Local Cache)
    await AsyncStorage.setItem(getMemoryKey(userId), JSON.stringify(updated));
    console.log(`[MemoryService] Memory synchronized for ${userId}:`, updated);
    return updated;
  } catch (error) {
    console.error(`[MemoryService] Error updating memory for ${userId}:`, error);
    throw error;
  }
}

/**
 * Resets user memory to empty defaults for a specific user.
 */
export async function clearMemory(userId: string): Promise<void> {
  try {
    // 1. Clear Firestore (source of truth)
    try {
      const docRef = doc(db, 'users', userId, 'data', 'bio_memory');
      await setDoc(docRef, DEFAULT_MEMORY);
    } catch (fsError) {
      console.error("[MemoryService] Firestore clear failed:", fsError);
    }

    // 2. Clear local cache
    await AsyncStorage.setItem(getMemoryKey(userId), JSON.stringify(DEFAULT_MEMORY));
    console.log(`[MemoryService] Memory cleared for ${userId}`);
  } catch (error) {
    console.error(`[MemoryService] Error clearing memory for ${userId}:`, error);
    throw error;
  }
}

// --- Helpers ---

function deduplicateArray(arr: string[]): string[] {
  return Array.from(new Set(arr.map(s => s.toLowerCase().trim()).filter(Boolean)));
}
