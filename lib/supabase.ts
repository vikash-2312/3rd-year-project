import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use environment variables for Supabase credentials (with fallback to existing values)
const supabaseUrl = 'https://tguirkhpsknzkeskodam.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndWlya2hwc2tuemtlc2tvZGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDYzNDgsImV4cCI6MjA5MDYyMjM0OH0.Dj38xZdAYD8L3ENAAVjTtl2WkGAFeWpFZ241LlXBpcI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
