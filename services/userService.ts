import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { decode } from 'base64-arraybuffer';

/**
 * Uploads a profile picture to Supabase Storage and updates the user's Firestore profile.
 */
export async function uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
  // 1. Read the file as Base64 to ensure no corruption during transfer
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: 'base64' as any,
  });
  
  // 2. Convert Base64 to ArrayBuffer (the format Supabase Storage expects)
  const arrayBuffer = decode(base64);

  const timestamp = Date.now();
  const fileName = `profiles/${userId}_${timestamp}.jpg`;
  
  // 3. Upload to Supabase Storage
  // NOTE: Ensure the 'progress_photos' bucket is set to 'Public' in your dashboard
  const { data, error } = await supabase.storage
    .from('progress_photos') 
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error("Supabase Profile Upload Error Detail:", {
      message: error.message,
      name: error.name,
      status: (error as any).status
    });
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get the public URL with cache busting
  const { data: urlData } = supabase.storage
    .from('progress_photos')
    .getPublicUrl(fileName);

  const photoURL = `${urlData.publicUrl}?t=${timestamp}`;

  // Update Firestore
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    'profile.photoURL': photoURL
  });

  return photoURL;
}
