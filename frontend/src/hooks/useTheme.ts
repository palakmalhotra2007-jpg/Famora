import { useMemo } from 'react';
import { useThemeStore } from '../store';
import { colors, ThemeColors } from '../theme';

export function useTheme(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  return useMemo(() => colors[mode], [mode]);
}

export function useThemedStyles<T>(factory: (theme: ThemeColors) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
