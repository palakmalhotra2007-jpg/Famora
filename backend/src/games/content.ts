export type SkillGameMode =
  | 'tap_sprint'
  | 'reaction_rush'
  | 'typing_speed'
  | 'quick_math'
  | 'memory_flash'
  | 'balloon_blitz';

export interface SkillGameConfig {
  mode: SkillGameMode;
  shared: boolean;
  durationSeconds?: number;
  rounds?: number;
  words?: string[];
  phrases?: string[];
}

export const SKILL_GAMES: Record<
  string,
  {
    mode: SkillGameMode;
    name: string;
    description: string;
    category: string;
    durationSeconds?: number;
    rounds?: number;
  }
> = {
  tap_sprint: {
    mode: 'tap_sprint',
    name: 'Tap Party',
    description: 'Tap as fast as you can. Highest taps wins.',
    category: 'Speed',
    durationSeconds: 10,
  },
  reaction_rush: {
    mode: 'reaction_rush',
    name: 'Ready, Set, Go!',
    description: 'Wait for green, then tap. Fastest reactions win.',
    category: 'Reflex',
    rounds: 5,
  },
  typing_speed: {
    mode: 'typing_speed',
    name: 'Word Chain',
    description: 'Tap words in order to build phrases. Most words wins.',
    category: 'Words',
    durationSeconds: 45,
  },
  quick_math: {
    mode: 'quick_math',
    name: 'Number Pop',
    description: 'Pick the right answer to fun number puzzles.',
    category: 'Brain',
    durationSeconds: 45,
  },
  memory_flash: {
    mode: 'memory_flash',
    name: 'Pattern Pal',
    description: 'Watch the pattern, then repeat it. Longest streak wins.',
    category: 'Memory',
    rounds: 8,
  },
  balloon_blitz: {
    mode: 'balloon_blitz',
    name: 'Balloon Pop',
    description: 'Pop balloons before they float away. Most pops wins.',
    category: 'Arcade',
    durationSeconds: 30,
  },
};

export const GAME_TYPE_IDS = Object.keys(SKILL_GAMES);

export const TYPING_PHRASES = [
  'family time is the best',
  'we love game night',
  'home is where we laugh',
  'together we win',
  'memories last forever',
  'hugs make everything better',
  'share joy every day',
  'famora keeps us close',
  'grandma makes the best cookies',
  'let us play again',
];

export function buildSkillConfig(gameType: string): SkillGameConfig {
  const meta = SKILL_GAMES[gameType] ?? SKILL_GAMES.tap_sprint;
  return {
    mode: meta.mode,
    shared: true,
    durationSeconds: meta.durationSeconds,
    rounds: meta.rounds,
    phrases: meta.mode === 'typing_speed' ? [...TYPING_PHRASES] : undefined,
  };
}
