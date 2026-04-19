import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

/**
 * Uploads an image from the AI Coach chat to Supabase Storage.
 * This ensures chat history is persistent across devices.
 * 
 * @param userId - The ID of the current user
 * @param imageUri - The local URI of the image to upload
 * @returns The public download URL of the uploaded image
 */
export async function uploadChatImage(userId: string, imageUri: string): Promise<string> {
  try {
    // 1. Read the file as Base64 to ensure no corruption during transfer
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64' as any,
    });
    
    // 2. Convert Base64 to ArrayBuffer (the format Supabase Storage expects)
    const arrayBuffer = decode(base64);

    // 2. Generate path: chat/userId/timestamp.jpg
    const timestamp = Date.now();
    const storagePath = `chat/${userId}/chat_${timestamp}.jpg`;

    // 3. Upload to Supabase 'progress_photos' bucket (which is confirmed to exist)
    const { data, error } = await supabase.storage
      .from('progress_photos')
      .upload(storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error(`[ChatStorage] Upload failed. Error: ${error.message}`);
      throw error;
    }

    // 4. Get Public URL
    const { data: urlData } = supabase.storage
      .from('progress_photos')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error("[ChatStorage] Failed to upload chat image:", err);
    throw err;
  }
}
