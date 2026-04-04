/**
 * memoryService.ts
 * 
 * Manages persistent user preferences (allergies, diet, dislikes, conditions)
 * using AsyncStorage. The AI chatbot reads this memory to personalize responses
 * and writes to it when the user shares new preferences.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---

export interface UserMemory {
  allergies: string[];
  diet: string;         // e.g. "vegetarian", "keto", "vegan"
  dislikes: string[];
  conditions: string[]; // e.g. "diabetes", "high blood pressure"
}

// --- Constants ---

const MEMORY_KEY = '@ai_fitness_user_memory';

const DEFAULT_MEMORY: UserMemory = {
  allergies: [],
  diet: '',
  dislikes: [],
  conditions: [],
};

// --- Public API ---

/**
 * Retrieves the full user memory object from persistent storage.
 * Returns default empty memory if nothing is stored yet.
 */
export async function getMemory(): Promise<UserMemory> {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_KEY);
    if (!raw) return { ...DEFAULT_MEMORY };

    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing fields from older versions
    return {
      allergies: parsed.allergies || [],
      diet: parsed.diet || '',
      dislikes: parsed.dislikes || [],
      conditions: parsed.conditions || [],
    };
  } catch (error) {
    console.error('[MemoryService] Error reading memory:', error);
    return { ...DEFAULT_MEMORY };
  }
}

/**
 * Merges a partial update into the existing user memory.
 * Arrays are merged (union, no duplicates). Strings are overwritten.
 * 
 * Example:
 *   existing: { allergies: ["peanuts"], diet: "keto" }
 *   update:   { allergies: ["shellfish"], diet: "vegetarian" }
 *   result:   { allergies: ["peanuts", "shellfish"], diet: "vegetarian" }
 */
export async function updateMemory(partial: Partial<UserMemory>): Promise<UserMemory> {
  try {
    const current = await getMemory();

    // Merge arrays (deduplicated), overwrite strings
    const updated: UserMemory = {
      allergies: deduplicateArray([
        ...current.allergies,
        ...(partial.allergies || []),
      ]),
      diet: partial.diet !== undefined ? partial.diet : current.diet,
      dislikes: deduplicateArray([
        ...current.dislikes,
        ...(partial.dislikes || []),
      ]),
      conditions: deduplicateArray([
        ...current.conditions,
        ...(partial.conditions || []),
      ]),
    };

    await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(updated));
    console.log('[MemoryService] Memory updated:', updated);
    return updated;
  } catch (error) {
    console.error('[MemoryService] Error updating memory:', error);
    throw error;
  }
}

/**
 * Resets user memory to empty defaults.
 */
export async function clearMemory(): Promise<void> {
  try {
    await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(DEFAULT_MEMORY));
    console.log('[MemoryService] Memory cleared');
  } catch (error) {
    console.error('[MemoryService] Error clearing memory:', error);
    throw error;
  }
}

// --- Helpers ---

function deduplicateArray(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.toLowerCase().trim()).filter(Boolean))];
}
