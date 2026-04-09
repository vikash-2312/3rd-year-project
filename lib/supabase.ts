import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials (with fallback to existing values)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tguirkhpsknzkeskodam.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_NGigvslosEocWAHGlTwTtg_vN7xV8ri';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
