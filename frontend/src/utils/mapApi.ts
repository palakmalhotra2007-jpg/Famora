import { Family, User } from '../types';
import type { FamilyAuraId } from '../constants/aura';

export function mapUser(data: Record<string, unknown>): User {
  return {
    id: String(data.id),
    email: data.email as string | undefined,
    displayName: String(data.displayName ?? 'User'),
    avatarUrl: data.avatarUrl as string | undefined,
    bio: data.bio as string | undefined,
    birthday: data.birthday as string | undefined,
    photoStreak: Number(data.photoStreak ?? 0),
    longestStreak: Number(data.longestStreak ?? 0),
    favoriteSongs: (data.favoriteSongs as string[]) ?? [],
    aura: (data.aura as FamilyAuraId | null | undefined) ?? null,
  };
}

export function mapFamily(data: Record<string, unknown>): Family {
  return {
    id: String(data.id),
    name: String(data.name),
    newspaperName: String(data.newspaperName ?? data.name),
    inviteCode: String(data.inviteCode),
    avatarUrl: data.avatarUrl as string | undefined,
    familyStreak: Number(data.familyStreak ?? 0),
    memberCount: data.memberCount != null ? Number(data.memberCount) : undefined,
    role: data.role as string | undefined,
  };
}
