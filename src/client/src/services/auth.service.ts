import { supabase } from '../lib/supabase';
import { dbInsert, dbInsertMany, dbUpdate, dbUpsert } from '../lib/db';
import type { Database } from '../lib/database.types';
import type { Family, User } from '../types';
import type { FamilyAuraId } from '../constants/aura';

type UserRow   = Database['public']['Tables']['users']['Row'];
type FamilyRow = Database['public']['Tables']['families']['Row'];

// ── Mappers ─────────────────────────────────────────────────

function mapDbUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email ?? undefined,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    birthday: row.birthday ?? undefined,
    photoStreak: row.photo_streak,
    longestStreak: row.longest_streak,
    favoriteSongs: row.favorite_songs ?? [],
    aura: (row.aura as FamilyAuraId | null) ?? null,
  };
}

function mapDbFamily(row: FamilyRow, extra?: { role?: string; memberCount?: number }): Family {
  return {
    id: row.id,
    name: row.name,
    newspaperName: row.newspaper_name ?? row.name,
    inviteCode: row.invite_code,
    avatarUrl: row.avatar_url ?? undefined,
    familyStreak: row.family_streak,
    memberCount: extra?.memberCount,
    role: extra?.role,
  };
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function fetchUserProfile(userId: string): Promise<User> {
  // Retry up to 3 times — the DB trigger that creates the profile row
  // can take a moment after Supabase Auth signup
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('users').select('*').eq('id', userId).maybeSingle();
    if (data) return mapDbUser(data as UserRow);
    if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
    if (error && attempt === 2) throw new Error(error.message);
  }
  throw new Error('Could not load profile');
}

// ── Auth ────────────────────────────────────────────────────

export async function register(email: string, password: string, displayName: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Registration failed');

  // Force-create the profile row in case the DB trigger hasn't fired yet
  await supabase.from('users').upsert(
    { id: data.user.id, email, display_name: displayName, auth_provider: 'email' },
    { onConflict: 'id' }
  );

  return fetchUserProfile(data.user.id);
}

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Login failed');
  return fetchUserProfile(data.user.id);
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchMe(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return fetchUserProfile(user.id);
}

export async function setFamilyAura(aura: FamilyAuraId | null): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await dbUpdate(
    'users',
    { aura, updated_at: new Date().toISOString() },
    { id: user.id }
  );
  if (error || !data) throw new Error(error?.message ?? 'Failed to update aura');
  return mapDbUser(data as UserRow);
}

// ── Families ────────────────────────────────────────────────

export async function fetchFamilies(): Promise<Family[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('family_members')
    .select('role, families(*)')
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  return (data ?? []).map((m) => {
    const row = m as unknown as { role: string; families: FamilyRow };
    return mapDbFamily(row.families, { role: row.role });
  });
}

export async function createFamily(name: string, newspaperName?: string): Promise<Family> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: family, error: familyErr } = await dbInsert('families', {
    name,
    newspaper_name: newspaperName ?? `${name} Times`,
    invite_code: generateInviteCode(),
    created_by: user.id,
  });
  if (familyErr || !family) throw new Error(familyErr?.message ?? 'Failed to create family');

  const { error: memberErr } = await dbInsertMany('family_members', [{
    family_id: (family as FamilyRow).id,
    user_id: user.id,
    role: 'admin',
  }]);
  if (memberErr) throw new Error(memberErr.message);

  return mapDbFamily(family as FamilyRow, { role: 'admin' });
}

export async function joinFamily(inviteCode: string): Promise<Family> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: family, error: findErr } = await supabase
    .from('families').select('*').eq('invite_code', inviteCode.toUpperCase()).single();
  if (findErr || !family) throw new Error('Invalid invite code');

  const { error: memberErr } = await dbInsertMany('family_members', [{
    family_id: (family as FamilyRow).id,
    user_id: user.id,
    role: 'member',
  }]);
  if (memberErr) {
    if (memberErr.message.includes('23505')) throw new Error('Already a member of this family');
    throw new Error(memberErr.message);
  }

  return mapDbFamily(family as FamilyRow, { role: 'member' });
}

export async function addFamilyMember(
  familyId: string,
  payload: { displayName: string; email?: string; role?: string; nickname?: string }
): Promise<{ id: string; displayName: string; email?: string; role: string }> {
  const cleanName  = payload.displayName.trim();
  const cleanEmail = payload.email?.trim().toLowerCase()
    ?? `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@famora.local`;

  const { data: existing } = await supabase
    .from('users').select('id').eq('email', cleanEmail).maybeSingle();

  let userId: string;

  if (existing) {
    userId = (existing as { id: string }).id;
  } else {
    const { data: newUser, error: userErr } = await dbInsert('users', {
      id: crypto.randomUUID(),
      display_name: cleanName,
      email: cleanEmail,
      auth_provider: 'invite',
    });
    if (userErr || !newUser) throw new Error(userErr?.message ?? 'Failed to create member');
    userId = (newUser as { id: string }).id;
  }

  const { error: memberErr } = await dbInsertMany('family_members', [{
    family_id: familyId,
    user_id: userId,
    role: payload.role ?? 'member',
    nickname: payload.nickname ?? null,
  }]);
  if (memberErr) {
    if (memberErr.message.includes('23505')) throw new Error('User is already in this family');
    throw new Error(memberErr.message);
  }

  return { id: userId, displayName: cleanName, email: cleanEmail, role: payload.role ?? 'member' };
}
