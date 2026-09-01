/**
 * Global Zustand stores.
 *
 * Three stores are defined here:
 *
 *  useAuthStore   — authenticated user profile + session state.
 *                   Persisted via AsyncStorage.  The Supabase client
 *                   manages the actual JWT internally; this store only
 *                   holds the hydrated user object so the UI can render
 *                   without an extra fetch.
 *
 *  useFamilyStore — currently selected family + all families the user
 *                   belongs to.  Persisted via AsyncStorage so the last
 *                   selected family survives app restarts.
 *
 *  useThemeStore  — light / dark preference.  Not persisted (defaults
 *                   to 'light' on every launch; easy to add later).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '../theme';
import type { User, Family } from '../types';

// ── Auth ─────────────────────────────────────────────────────

interface AuthState {
  user:            User | null;
  isAuthenticated: boolean;
  /**
   * @deprecated The Supabase client manages tokens internally via
   * AsyncStorage.  This field is kept so legacy code that reads
   * `accessToken` doesn't break, but nothing should write a new token
   * here intentionally.
   */
  accessToken: string | null;
  setAuth:  (user: User, token?: string) => void;
  setUser:  (user: User) => void;
  logout:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken: accessToken ?? null, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name:    'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ── Family ───────────────────────────────────────────────────

interface FamilyState {
  currentFamily: Family | null;
  families:      Family[];
  setCurrentFamily: (family: Family | null) => void;
  setFamilies:      (families: Family[]) => void;
  clearFamily:      () => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      currentFamily: null,
      families:      [],

      setCurrentFamily: (family)   => set({ currentFamily: family }),
      setFamilies:      (families) => set({ families }),
      clearFamily:      ()         => set({ currentFamily: null, families: [] }),
    }),
    {
      name:    'family-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ── Theme ────────────────────────────────────────────────────

interface ThemeState {
  mode:        ThemeMode;
  toggleTheme: () => void;
  setTheme:    (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  toggleTheme: () => set((s) => ({ mode: s.mode === 'light' ? 'dark' : 'light' })),
  setTheme:    (mode) => set({ mode }),
}));
