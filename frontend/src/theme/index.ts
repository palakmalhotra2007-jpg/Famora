/** Famora blue brand palette — used app-wide */
export const brandBlue = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  accent: '#1E40AF',
  gradient: ['#1D4ED8', '#2563EB', '#3B82F6'] as const,
  gradientHero: ['#1E3A8A', '#2563EB', '#60A5FA'] as const,
  background: '#F0F6FF',
  surfaceTint: '#EFF6FF',
  border: '#E2E8F0',
} as const;

export const colors = {
  light: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceSecondary: brandBlue.surfaceTint,
    surfaceElevated: '#FFFFFF',
    primary: brandBlue.primary,
    primaryLight: brandBlue.primaryLight,
    secondary: '#0F172A',
    accent: brandBlue.accent,
    pin: brandBlue.primary,
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: brandBlue.border,
    borderLight: '#F1F5F9',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    glass: 'rgba(255,255,255,0.96)',
    glassBorder: 'rgba(37,99,235,0.08)',
    gradient: brandBlue.gradient,
    gradientCool: ['#1E3A8A', '#2563EB', '#60A5FA'] as const,
    shadow: 'rgba(37,99,235,0.12)',
    overlay: 'rgba(15,23,42,0.55)',
    spotify: '#121212',
    spotifySurface: '#181818',
    spotifyElevated: '#282828',
  },
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSecondary: '#334155',
    surfaceElevated: '#1E293B',
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    secondary: '#FFFFFF',
    accent: '#2563EB',
    pin: '#3B82F6',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    border: '#334155',
    borderLight: '#1E293B',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    glass: 'rgba(30,41,59,0.96)',
    glassBorder: 'rgba(59,130,246,0.15)',
    gradient: ['#1E3A8A', '#2563EB', '#3B82F6'] as const,
    gradientCool: ['#0F172A', '#1E3A8A', '#2563EB'] as const,
    shadow: 'rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.65)',
    spotify: '#000000',
    spotifySurface: '#121212',
    spotifyElevated: '#1A1A1A',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pin: 24,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.4 },
  headline: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  title: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.1 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.2 },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
} as const;

export type ThemeMode = 'light' | 'dark';
export type ThemeColors = (typeof colors)['light'] | (typeof colors)['dark'];
