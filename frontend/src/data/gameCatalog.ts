import { Ionicons } from '@expo/vector-icons';

export type SkillGameMode =
  | 'tap_sprint'
  | 'reaction_rush'
  | 'typing_speed'
  | 'quick_math'
  | 'memory_flash'
  | 'balloon_blitz';

export interface GameMeta {
  name: string;
  description: string;
  category: string;
  mode: SkillGameMode;
  emoji: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentSoft: string;
  ages: string;
}

export const SKILL_GAMES: Record<string, GameMeta> = {
  tap_sprint: {
    name: 'Tap Party',
    description: 'Tap the big button as many times as you can — great for little hands!',
    category: 'Speed',
    mode: 'tap_sprint',
    emoji: '👏',
    icon: 'hand-left-outline',
    accent: '#2563EB',
    accentSoft: '#DBEAFE',
    ages: 'All ages',
  },
  reaction_rush: {
    name: 'Ready, Set, Go!',
    description: 'Wait for green, then tap fast. Grandpa vs grandkid — who reacts quicker?',
    category: 'Reflex',
    mode: 'reaction_rush',
    emoji: '🚦',
    icon: 'flash-outline',
    accent: '#0D9488',
    accentSoft: '#CCFBF1',
    ages: '6+',
  },
  typing_speed: {
    name: 'Word Chain',
    description: 'Tap words in order to build family phrases — no typing needed.',
    category: 'Words',
    mode: 'typing_speed',
    emoji: '🔗',
    icon: 'text-outline',
    accent: '#7C3AED',
    accentSoft: '#EDE9FE',
    ages: 'All ages',
  },
  quick_math: {
    name: 'Number Pop',
    description: 'Pick the right answer to cheerful number puzzles.',
    category: 'Brain',
    mode: 'quick_math',
    emoji: '🔢',
    icon: 'calculator-outline',
    accent: '#EA580C',
    accentSoft: '#FFEDD5',
    ages: '7+',
  },
  memory_flash: {
    name: 'Pattern Pal',
    description: 'Watch the emoji pattern flash, then copy it back.',
    category: 'Memory',
    mode: 'memory_flash',
    emoji: '🧩',
    icon: 'grid-outline',
    accent: '#DB2777',
    accentSoft: '#FCE7F3',
    ages: 'All ages',
  },
  balloon_blitz: {
    name: 'Balloon Pop',
    description: 'Pop colorful balloons before they float away — instant smiles.',
    category: 'Arcade',
    mode: 'balloon_blitz',
    emoji: '🎈',
    icon: 'balloon-outline',
    accent: '#2563EB',
    accentSoft: '#DBEAFE',
    ages: 'All ages',
  },
};

export function gameFromType(type: string) {
  const game = SKILL_GAMES[type];
  if (game) return { id: type, ...game, players: 'Whole family' };
  return {
    id: type,
    name: type.replace(/_/g, ' '),
    description: 'Play together and beat the family high score.',
    category: 'Fun',
    mode: 'tap_sprint' as const,
    emoji: '🎮',
    icon: 'game-controller-outline' as const,
    accent: '#2563EB',
    accentSoft: '#DBEAFE',
    ages: 'All ages',
    players: 'Whole family',
  };
}

export function scoreLabel(mode: string): string {
  if (mode === 'tap_sprint') return 'taps';
  if (mode === 'typing_speed') return 'words';
  if (mode === 'balloon_blitz') return 'pops';
  if (mode === 'quick_math') return 'correct';
  if (mode === 'memory_flash') return 'level';
  return 'pts';
}
