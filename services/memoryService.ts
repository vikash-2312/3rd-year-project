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

const getMemoryKey = (userId: string) => `@ai_user_memory_${userId}`;
const LEGACY_KEY = '@ai_fitness_user_memory'; // Migration handle

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
export async function getMemory(userId: string): Promise<UserMemory> {
  try {
    const key = getMemoryKey(userId);
    let raw = await AsyncStorage.getItem(key);
    
    // --- LATE-MIGRATION BRIDGE (Identity-Lock Patch) ---
    if (!raw) {
      const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        console.log(`[MemoryService] 🏹 Migrating legacy data to vault for ${userId}`);
        await AsyncStorage.setItem(key, legacyRaw);
        await AsyncStorage.removeItem(LEGACY_KEY);
        raw = legacyRaw;
      }
    }

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

    await AsyncStorage.setItem(getMemoryKey(userId), JSON.stringify(updated));
    console.log(`[MemoryService] Memory updated for ${userId}:`, updated);
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
    await AsyncStorage.setItem(getMemoryKey(userId), JSON.stringify(DEFAULT_MEMORY));
    console.log(`[MemoryService] Memory cleared for ${userId}`);
  } catch (error) {
    console.error(`[MemoryService] Error clearing memory for ${userId}:`, error);
    throw error;
  }
}

// --- Helpers ---

function deduplicateArray(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.toLowerCase().trim()).filter(Boolean))];
}
