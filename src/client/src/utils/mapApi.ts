// Legacy mappers — kept for any components that still reference them.
// The main services (auth.service.ts, family.service.ts) now map directly
// from Supabase rows to app types without going through these helpers.

import type { Family, User } from '../types';
import type { FamilyAuraId } from '../constants/aura';

export function mapUser(data: Record<string, unknown>): User {
  return {
    id: String(data.id),
    email: data.email as string | undefined,
    displayName: String(data.displayName ?? data.display_name ?? 'User'),
    avatarUrl: data.avatarUrl as string | undefined,
    bio: data.bio as string | undefined,
    birthday: data.birthday as string | undefined,
    photoStreak: Number(data.photoStreak ?? data.photo_streak ?? 0),
    longestStreak: Number(data.longestStreak ?? data.longest_streak ?? 0),
    favoriteSongs: (data.favoriteSongs ?? data.favorite_songs ?? []) as string[],
    aura: (data.aura as FamilyAuraId | null | undefined) ?? null,
  };
}

export function mapFamily(data: Record<string, unknown>): Family {
  return {
    id: String(data.id),
    name: String(data.name),
    newspaperName: String(data.newspaperName ?? data.newspaper_name ?? data.name),
    inviteCode: String(data.inviteCode ?? data.invite_code),
    avatarUrl: data.avatarUrl as string | undefined,
    familyStreak: Number(data.familyStreak ?? data.family_streak ?? 0),
    memberCount: data.memberCount != null ? Number(data.memberCount) : undefined,
    role: data.role as string | undefined,
  };
}
