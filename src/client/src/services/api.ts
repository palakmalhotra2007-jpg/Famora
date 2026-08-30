// Re-export the supabase client so any legacy import of apiClient still resolves.
// All network calls now go through Supabase directly — no Express backend needed.
export { supabase as apiClient } from '../lib/supabase';
export { supabase } from '../lib/supabase';

// Kept for MemoriesScreen / family.service uploads that resolve storage URLs
export function getSupabaseStorageUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
