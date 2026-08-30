/**
 * Typed Supabase DB helpers.
 *
 * Supabase v2's strict generic chain can be difficult to satisfy in isolation.
 * These helpers use `any` internally (one safe, contained escape hatch) so
 * that every call site is clean and readable without casting.
 */

import { supabase } from './supabase';
import type { Database } from './database.types';

type Tables  = Database['public']['Tables'];
type TName   = keyof Tables;
type Row<T extends TName>    = Tables[T]['Row'];
type Insert<T extends TName> = Tables[T]['Insert'];
type Upd<T extends TName>    = Tables[T]['Update'];

// ── Typed insert (single row, returns the inserted row) ──────
export async function dbInsert<T extends TName>(
  table: T,
  values: Insert<T>
): Promise<{ data: Row<T> | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .insert(values)
    .select('*')
    .maybeSingle();
  return { data: data as Row<T> | null, error: error ? new Error(String(error.message)) : null };
}

// ── Typed insert (many rows, no return) ──────────────────────
export async function dbInsertMany<T extends TName>(
  table: T,
  values: Insert<T>[]
): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).insert(values);
  return { error: error ? new Error(String(error.message)) : null };
}

// ── Typed update (match by column equality) ──────────────────
export async function dbUpdate<T extends TName>(
  table: T,
  values: Upd<T>,
  match: Partial<Row<T>>
): Promise<{ data: Row<T> | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase.from(table) as any).update(values);
  for (const [k, v] of Object.entries(match as Record<string, unknown>)) {
    q = q.eq(k, v);
  }
  const { data, error } = await q.select('*').maybeSingle();
  return { data: data as Row<T> | null, error: error ? new Error(String(error.message)) : null };
}

// ── Typed upsert ─────────────────────────────────────────────
export async function dbUpsert<T extends TName>(
  table: T,
  values: Insert<T>,
  opts?: { onConflict?: string }
): Promise<{ data: Row<T> | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .upsert(values, opts)
    .select('*')
    .maybeSingle();
  return { data: data as Row<T> | null, error: error ? new Error(String(error.message)) : null };
}
