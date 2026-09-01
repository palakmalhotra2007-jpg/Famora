/**
 * Legacy compatibility shim.
 *
 * All network I/O now goes through Supabase directly.
 * This file keeps old `apiClient` imports working without needing a
 * mass rename across the codebase.
 *
 * New code should import `supabase` directly from `../lib/supabase`.
 * Storage URL resolution should use `resolveMediaUrl` from `family.service`.
 */
export { supabase as apiClient, supabase } from '../lib/supabase';
