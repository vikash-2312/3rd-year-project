import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// --- Types ---

export interface ProgressPhoto {
  id: string;
  userId: string;
  imageUrl: string;
  storagePath: string; // Refers to Supabase path
  date: string; // YYYY-MM-DD
  weight?: number;
  createdAt: any; // Firestore Timestamp
}

// --- Upload ---

/**
 * Uploads a progress photo to Supabase Storage and saves metadata to Firestore.
 */
export async function uploadProgressPhoto(
  userId: string,
  imageUri: string,
  date: string,
  weight?: number
): Promise<ProgressPhoto> {
  // 1. Use the new Expo 54+ File API to get the ArrayBuffer directly
  // This is faster and avoids the deprecation warning
  const file = new FileSystem.File(imageUri);
  const arrayBuffer = await file.arrayBuffer();

  // 3. Upload to Supabase Storage
  const timestamp = Date.now();
  const fileName = `${userId}/${timestamp}.jpg`;
  const storagePath = fileName;

  const { data, error } = await supabase.storage
    .from('progress_photos')
    .upload(storagePath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false
    });

  if (error) {
    console.error("Supabase Storage Error Full:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // 4. Get the public download URL
  const { data: urlData } = supabase.storage
    .from('progress_photos')
    .getPublicUrl(storagePath);

  const imageUrl = urlData.publicUrl;

  // 5. Save metadata to Firestore (keeping your DB logic exactly the same!)
  const photoData = {
    userId,
    imageUrl,
    storagePath,
    date,
    ...(weight !== undefined && weight !== null ? { weight } : {}),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'progress_photos'), photoData);

  return {
    id: docRef.id,
    userId,
    imageUrl,
    storagePath,
    date,
    weight,
    createdAt: photoData.createdAt, // Consistent with local serverTimestamp fallback logic
  };
}

// --- Fetch (real-time) ---

/**
 * Subscribes to all progress photos for a user, sorted by date.
 */
export function subscribeToUserPhotos(
  userId: string,
  callback: (photos: ProgressPhoto[]) => void
): () => void {
  const photosQuery = query(
    collection(db, 'progress_photos'),
    where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(photosQuery, (snapshot) => {
    const photos: ProgressPhoto[] = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ProgressPhoto, 'id'>),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    callback(photos);
  });

  return unsubscribe;
}

// --- Delete ---

/**
 * Deletes a progress photo from both Supabase Storage and Firestore.
 */
export async function deleteProgressPhoto(
  photoId: string,
  storagePath: string
): Promise<void> {
  // 1. Delete from Supabase Storage
  const { error } = await supabase.storage
    .from('progress_photos')
    .remove([storagePath]);

  if (error) {
    console.error("Supabase Deletion Error:", error);
  }

  // 2. Delete from Firestore
  await deleteDoc(doc(db, 'progress_photos', photoId));
}

// --- Helpers ---

export function getBeforeAfterPhotos(photos: ProgressPhoto[]): {
  before: ProgressPhoto | null;
  after: ProgressPhoto | null;
} {
  if (photos.length === 0) return { before: null, after: null };
  if (photos.length === 1) return { before: photos[0], after: null };

  return {
    before: photos[0],
    after: photos[photos.length - 1],
  };
}

export function getDayNumber(photo: ProgressPhoto, firstPhoto: ProgressPhoto): number {
  const start = new Date(firstPhoto.date).getTime();
  const current = new Date(photo.date).getTime();
  return Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function getTimeLabel(photo: ProgressPhoto, firstPhoto: ProgressPhoto): string {
  const dayNum = getDayNumber(photo, firstPhoto);
  if (dayNum <= 7) return `Week 1`;
  if (dayNum <= 30) return `Week ${Math.ceil(dayNum / 7)}`;
  return `Month ${Math.ceil(dayNum / 30)}`;
}
