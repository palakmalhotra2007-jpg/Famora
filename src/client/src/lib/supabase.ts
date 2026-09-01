/**
 * Supabase client singleton.
 *
 * Created once and reused across the entire app.  The client is typed
 * with the generated `Database` interface so every `.from()` call gets
 * full TypeScript completions.
 *
 * Session persistence is handled by AsyncStorage so the user stays
 * logged in across app restarts.  `detectSessionInUrl` is disabled
 * because Expo handles deep-link auth tokens separately.
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Missing Supabase credentials.\n' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in src/client/.env'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    storage:           AsyncStorage,
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false,
  },
});
