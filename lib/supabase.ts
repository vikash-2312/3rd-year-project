import { createClient } from '@supabase/supabase-js';

// Hard-coded keys using the MODERN Supabase Publishable Key format
const supabaseUrl = 'https://tguirkhpsknzkeskodam.supabase.co';
const supabaseAnonKey = 'sb_publishable_NGigvslosEocWAHGlTwTtg_vN7xV8ri';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
