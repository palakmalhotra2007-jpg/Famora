/**
 * Typed Supabase database helpers.
 *
 * Supabase v2's strict generic chain is hard to satisfy cleanly at every
 * call site.  These four wrappers use `any` in one place internally so
 * every caller stays readable and type-safe at the boundary.
 *
 * Usage:
 *   const { data, error } = await dbInsert('posts', { family_id, author_id, ... });
 */

import { supabase } from './supabase';
import type { Database } from './database.types';

type Tables           = Database['public']['Tables'];
type TableName        = keyof Tables;
type Row<T extends TableName>    = Tables[T]['Row'];
type InsertRow<T extends TableName> = Tables[T]['Insert'];
type UpdateRow<T extends TableName> = Tables[T]['Update'];

// ── Insert a single row, returning it ────────────────────────

export async function dbInsert<T extends TableName>(
  table: T,
  values: InsertRow<T>,
): Promise<{ data: Row<T> | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .insert(values)
    .select('*')
    .maybeSingle();

  return {
    data:  data as Row<T> | null,
    error: error ? new Error(String(error.message)) : null,
  };
}

// ── Insert multiple rows (no return value needed) ────────────

export async function dbInsertMany<T extends TableName>(
  table: T,
  values: InsertRow<T>[],
): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).insert(values);
  return { error: error ? new Error(String(error.message)) : null };
}

// ── Update rows matching a partial key, returning the first ──

export async function dbUpdate<T extends TableName>(
  table: T,
  values: UpdateRow<T>,
  match: Partial<Row<T>>,
): Promise<{ data: Row<T> | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from(table) as any).update(values);

  for (const [key, value] of Object.entries(match as Record<string, unknown>)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query.select('*').maybeSingle();

  return {
    data:  data as Row<T> | null,
    error: error ? new Error(String(error.message)) : null,
  };
}

// ── Upsert a single row, returning it ────────────────────────

export async function dbUpsert<T extends TableName>(
  table: T,
  values: InsertRow<T>,
  opts?: { onConflict?: string },
): Promise<{ data: Row<T> | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .upsert(values, opts)
    .select('*')
    .maybeSingle();

  return {
    data:  data as Row<T> | null,
    error: error ? new Error(String(error.message)) : null,
  };
}
