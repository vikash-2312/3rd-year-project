import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, query, setDoc, where, getDocFromServer, getDocsFromServer, limit, documentId } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AuthCheckResult {
  route: '/(tabs)' | '/(onboarding)/1' | '/';
  profileFound: boolean;
}

/**
 * Checks if the user already has a complete profile in Firestore.
 * Supports legacy profile migration by email.
 */
export async function checkAndMigrateProfile(
  userId: string, 
  email?: string,
  name?: string
): Promise<AuthCheckResult> {
  console.log('[AuthCheck] Starting check for:', userId, email);
  
  if (!userId) return { route: '/', profileFound: false };

  // Helper: Liberal field verification to catch all legacy and multi-format profiles
  const isProfileComplete = (data: any) => {
    if (!data) return false;
    
    // 1. Explicit success flags
    if (data.hasOnboarded === true || data.onboardingCompleted === true) return true;
    
    // 2. Liberal Data normalization
    const profile = data.profile || {};
    const measurements = profile.measurements || data.measurements || {};
    
    // Check for core profile data in MANY possible locations
    const gender = profile.gender || data.gender || data.onboarding_gender;
    const goal = profile.goal || data.goal || data.onboarding_goal;
    const activity = profile.activityLevel || data.activityLevel || data.onboarding_activity;
    
    // Check for weight/height in ALL possible locations (root, nested, legacy)
    const weight = measurements.weightKg || data.weightKg || data.weight || data.onboarding_weight;
    const height = measurements.heightCm || measurements.heightFt || data.height || data.heightFt || data.onboarding_height;

    // IF WE HAVE A PROFILE OBJECT WITH DATA, OR SUFFICIENT ROOT FIELDS, IT'S COMPLETE
    const hasCoreInfo = !!(gender || goal || activity);
    const hasPhysics = !!(weight || height);
    
    // If the profile object has more than 2 keys, they've clearly been through the flow
    const profileKeys = Object.keys(profile).length;
    
    const complete = (hasCoreInfo && hasPhysics) || (profileKeys >= 3) || (data.hasOnboarded === true);
    
    if (!complete) {
        console.log('[AuthCheck] Profile still looks incomplete:', { gender, goal, weight, height, profileKeys });
    }
    
    return complete;
  };

  try {
    const userRef = doc(db, 'users', userId);
    
    // 1. PRIMARY CHECK: Targeted Surgical Query
    // We query by Document ID specifically. 
    console.log('[AuthCheck] Performing Targeted Profile Check...');
    const usersRef = collection(db, 'users');
    const q0 = query(usersRef, where(documentId(), '==', userId));
    
    let userSnap = await getDocsFromServer(q0);
    let currentData = userSnap.docs[0]?.data() || null;
    
    // 2. RETRY LOGIC (Bypasses the "Shadowing" bug)
    // If the document is found but looks incomplete, it's likely a background write "shadow."
    // We wait 250ms for the write to flush and try a final time.
    if (currentData && !isProfileComplete(currentData)) {
        console.warn('[AuthCheck] Data shadow detected. Retrying in 250ms...');
        await new Promise(resolve => setTimeout(resolve, 250));
        userSnap = await getDocsFromServer(q0);
        currentData = userSnap.docs[0]?.data() || null;
    }

    if (currentData && isProfileComplete(currentData)) {
      console.log('[AuthCheck] SUCCESS: Profile validated!');
      await AsyncStorage.setItem(`has_onboarded_${userId}`, 'true');
      return { route: '/(tabs)', profileFound: true };
    }

    // 3. Migration Fallback: Case-Insensitive Email Search (Parallel Query)
    if (email) {
      const trimmedLower = email.trim().toLowerCase();
      const originalEmail = email.trim();
      
      let legacyProfile = null;

      const q1_lower = query(usersRef, where('email', '==', trimmedLower), limit(5));
      const q1_orig = query(usersRef, where('email', '==', originalEmail), limit(5));
      const [snap1_l, snap1_o] = await Promise.all([
        getDocsFromServer(q1_lower), 
        getDocsFromServer(q1_orig)
      ]);
      
      const allFoundDocs = [...snap1_l.docs, ...snap1_o.docs];
      
      for (const docSnap of allFoundDocs) {
        const data = docSnap.data();
        if (docSnap.id !== userId && isProfileComplete(data)) {
          legacyProfile = { id: docSnap.id, data: data };
          break;
        }
      }

      if (legacyProfile) {
        console.log('[AuthCheck] SUCCESS: Legacy profile found -> Migrating');
        await setDoc(userRef, {
          ...legacyProfile.data,
          id: userId,
          email: trimmedLower, 
          updatedAt: new Date(),
          hasOnboarded: true
        }, { merge: true });
        
        await AsyncStorage.setItem(`has_onboarded_${userId}`, 'true');
        return { route: '/(tabs)', profileFound: true };
      }
    }

    // 4. Last Resort: Initial Onboarding Setup
    if (!currentData || !isProfileComplete(currentData)) {
        if (email || name) {
            await setDoc(userRef, {
              id: userId,
              email: email?.toLowerCase() || '',
              name: name || '',
              createdAt: new Date(),
              hasOnboarded: false
            }, { merge: true });
        }
        return { route: '/(onboarding)/1', profileFound: false };
    }

    return { route: '/(tabs)', profileFound: true };

  } catch (error) {
    console.error('[AuthCheck] Critical error:', error);
    return { route: '/', profileFound: false };
  }
}
