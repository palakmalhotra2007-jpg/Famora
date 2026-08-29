import { Platform, TextStyle } from 'react-native';

/** Classic print newspaper type stack (system serifs — no extra font packages). */
export const NP = {
  masthead: Platform.select<TextStyle>({
    ios: { fontFamily: 'Georgia' },
    android: { fontFamily: 'serif' },
    web: { fontFamily: 'Georgia, "Times New Roman", Times, serif' },
    default: { fontFamily: 'serif' },
  }),
  headline: Platform.select<TextStyle>({
    ios: { fontFamily: 'Georgia' },
    android: { fontFamily: 'serif' },
    web: { fontFamily: 'Georgia, "Times New Roman", Times, serif' },
    default: { fontFamily: 'serif' },
  }),
  body: Platform.select<TextStyle>({
    ios: { fontFamily: 'Georgia' },
    android: { fontFamily: 'serif' },
    web: { fontFamily: 'Georgia, "Times New Roman", Times, serif' },
    default: { fontFamily: 'serif' },
  }),
  sans: Platform.select<TextStyle>({
    ios: { fontFamily: 'Helvetica Neue' },
    android: { fontFamily: 'sans-serif' },
    web: { fontFamily: 'Helvetica, Arial, sans-serif' },
    default: {},
  }),
} as const;

export const INK = '#111111';
export const INK_MUTED = '#444444';
export const INK_LIGHT = '#666666';
export const PAPER = '#FAF8F2';
export const PAPER_LINE = '#2A2A2A';
export const PAPER_RULE = '#BBBBBB';

export const SECTION_DESK: Record<string, string> = {
  top_story: 'Front Page',
  headline: 'Front Page',
  family_wins: 'Local',
  birthdays: 'Celebrations',
  upcoming_events: 'Calendar',
  weekly_stats: 'Statistics',
  photo_of_day: 'Photography',
  member_spotlight: 'Profiles',
  memory_recap: 'Memories',
  memory_flashback: 'Archive',
  funny_moments: 'Lighter Side',
};

export function deskLabel(type: string): string {
  return (
    SECTION_DESK[type] ??
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function splitLines(content: string): string[] {
  return content
    .split(/\n|•/)
    .map((line) => line.trim().replace(/^📅\s*/, ''))
    .filter(Boolean);
}

export function splitSentences(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  return trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
}
