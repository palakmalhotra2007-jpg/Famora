import { apiGet, apiPost, apiPatch } from './api';
import { mapFamily, mapUser } from '../utils/mapApi';
import { Family, User } from '../types';
import type { FamilyAuraId } from '../constants/aura';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function register(email: string, password: string, displayName: string): Promise<AuthResponse> {
  const data = await apiPost<Record<string, unknown>>('/auth/register', { email, password, displayName });
  return {
    user: mapUser(data.user as Record<string, unknown>),
    accessToken: String(data.accessToken),
    refreshToken: String(data.refreshToken),
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await apiPost<Record<string, unknown>>('/auth/login', { email, password });
  return {
    user: mapUser(data.user as Record<string, unknown>),
    accessToken: String(data.accessToken),
    refreshToken: String(data.refreshToken),
  };
}

export async function fetchMe(): Promise<User> {
  const data = await apiGet<Record<string, unknown>>('/auth/me');
  return mapUser(data);
}

export async function setFamilyAura(aura: FamilyAuraId | null): Promise<User> {
  const data = await apiPatch<Record<string, unknown>>('/auth/me/aura', { aura });
  return mapUser(data);
}

export async function fetchFamilies(): Promise<Family[]> {
  const data = await apiGet<Record<string, unknown>[]>('/auth/families');
  return data.map(mapFamily);
}

export async function createFamily(name: string, newspaperName?: string): Promise<Family> {
  const data = await apiPost<Record<string, unknown>>('/auth/families', { name, newspaperName });
  return mapFamily(data);
}

export async function joinFamily(inviteCode: string): Promise<Family> {
  const data = await apiPost<Record<string, unknown>>('/auth/families/join', { inviteCode });
  return mapFamily(data);
}
