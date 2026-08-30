import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '../theme';
import type { User, Family } from '../types';

// ─── Auth Store (Supabase session-backed) ────────────────────
// The Supabase client handles session persistence internally via AsyncStorage.
// This store only keeps the hydrated user profile + authenticated flag,
// which updates on Supabase onAuthStateChange (wired in App.tsx).

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** @deprecated — kept for legacy code; Supabase manages tokens internally */
  accessToken: string | null;
  setAuth: (user: User, token?: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

interface FamilyState {
  currentFamily: Family | null;
  families: Family[];
  setCurrentFamily: (family: Family | null) => void;
  setFamilies: (families: Family[]) => void;
  clearFamily: () => void;
}

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) =>
        set({ user, accessToken: accessToken ?? null, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      currentFamily: null,
      families: [],
      setCurrentFamily: (family) => set({ currentFamily: family }),
      setFamilies: (families) => set({ families }),
      clearFamily: () => set({ currentFamily: null, families: [] }),
    }),
    {
      name: 'family-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  toggleTheme: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
  setTheme: (mode) => set({ mode }),
}));
