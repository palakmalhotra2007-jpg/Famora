import { Platform, ViewStyle } from 'react-native';
import type { ThemeMode } from './index';

/** Soft card shadow with subtle blue tint in light mode */
export function pinShadow(mode: ThemeMode = 'light'): ViewStyle {
  if (mode === 'dark') {
    return Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.35)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 4,
      },
    }) as ViewStyle;
  }
  return Platform.select({
    web: { boxShadow: '0 2px 12px rgba(37,99,235,0.1)' },
    default: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 3,
    },
  }) as ViewStyle;
}

export function pinShadowHover(): ViewStyle {
  return Platform.select({
    web: { boxShadow: '0 4px 16px rgba(37,99,235,0.16)' },
    default: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 14,
      elevation: 6,
    },
  }) as ViewStyle;
}

/** Rounded card shell used across feeds and lists */
export function pinCardShell(mode: ThemeMode, pressed?: boolean): ViewStyle {
  return {
    backgroundColor: mode === 'dark' ? '#1E293B' : '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    ...(pressed ? pinShadowHover() : pinShadow(mode)),
  };
}
