import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';

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
    // 1. Prepare file buffer
    // using newer expo-file-system File API if possible, otherwise readAsStringAsync
    const file = new FileSystem.File(imageUri);
    const arrayBuffer = await file.arrayBuffer();

    // 2. Generate path: chat_cache/userId/timestamp_uuid.jpg
    const timestamp = Date.now();
    const fileName = `${userId}/chat_${timestamp}.jpg`;
    const storagePath = fileName;

    // 3. Upload to Supabase 'chat_history' bucket
    // Note: ensure this bucket is set to 'public' in Supabase dashboard
    const { data, error } = await supabase.storage
      .from('chat_history')
      .upload(storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      // Fallback: If 'chat_history' doesn't exist, try 'progress_photos' if available
      // but ideally we want a dedicated bucket.
      console.error("[ChatStorage] Supabase Upload Error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // 4. Get Public URL
    const { data: urlData } = supabase.storage
      .from('chat_history')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error("[ChatStorage] Failed to upload chat image:", err);
    throw err;
  }
}
