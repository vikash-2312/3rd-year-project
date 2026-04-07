import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  initializeFirestore,
  // @ts-ignore
  experimentalForceLongPolling
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore with long polling for better reliability in Expo Go/React Native
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const saveUserToFirestore = async (userId: string, email: string, name?: string) => {
  try {
    const userRef = doc(db, "users", userId);
    
    // Only set the name if it's provided and not an empty string
    // to avoid overwriting existing data with empty strings during background syncs
    const updateData: any = {
      email,
      updatedAt: new Date(),
    };

    if (name && name.trim() !== '') {
      updateData.name = name;
    }

    // Using setDoc with merge: true is safer than getDoc + setDoc
    await setDoc(userRef, updateData, { merge: true });

    console.log("User successfully saved to Firestore");
  } catch (error) {
    console.error("Error saving user to Firestore: ", error);
    throw error; // Rethrow to handle in the UI if needed
  }
};

export { db };

// Firebase Storage (DEPRECATED - Moved to Supabase)
// const storage = getStorage(app);
// export { storage };
