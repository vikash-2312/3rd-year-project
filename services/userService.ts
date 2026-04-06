import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Uploads a profile picture to Supabase Storage and updates the user's Firestore profile.
 */
export async function uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
  const file = new FileSystem.File(imageUri);
  const arrayBuffer = await file.arrayBuffer();

  const timestamp = Date.now();
  const fileName = `profiles/${userId}_${timestamp}.jpg`;
  
  // Using the confirmed 'progress_photos' bucket but in a 'profiles' folder for safety
  const { data, error } = await supabase.storage
    .from('progress_photos') 
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error("Supabase Profile Upload Error:", error);
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
