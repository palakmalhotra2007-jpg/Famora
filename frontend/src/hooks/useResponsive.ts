import { Platform, useWindowDimensions } from 'react-native';
import { spacing } from '../theme';

export type Breakpoint = 'compact' | 'medium' | 'wide';

const BREAKPOINT_MEDIUM = 640;
const BREAKPOINT_WIDE = 1024;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= BREAKPOINT_WIDE ? 'wide' : width >= BREAKPOINT_MEDIUM ? 'medium' : 'compact';

  const isCompact = breakpoint === 'compact';
  const isMedium = breakpoint === 'medium';
  const isWide = breakpoint === 'wide';
  const isWeb = Platform.OS === 'web';

  const contentMaxWidth = isWide ? 1120 : isMedium ? 768 : Math.min(width, 540);
  const horizontalPadding = isWide ? spacing.xl : isMedium ? spacing.lg : 12;
  const auraGridColumns = isWide ? 7 : isMedium ? 4 : 2;
  const memberGridColumns = isWide ? 5 : isMedium ? 4 : 0;
  const photoGridColumns = isWide ? 6 : isMedium ? 4 : 3;
  const gameGridColumns = isWide ? 3 : isMedium ? 2 : 1;

  return {
    width,
    height,
    breakpoint,
    isCompact,
    isMedium,
    isWide,
    isWeb,
    contentMaxWidth,
    horizontalPadding,
    auraGridColumns,
    memberGridColumns,
    photoGridColumns,
    gameGridColumns,
  };
}

export function gridTileWidth(
  containerWidth: number,
  columns: number,
  gap: number
): number {
  if (containerWidth <= 0 || columns <= 0) return 0;
  return (containerWidth - gap * (columns - 1)) / columns;
}
