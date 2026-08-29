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
  phrases?: string[];
  playedBy?: string[];
}

export interface StandingEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  score: number | null;
  hasPlayed: boolean;
}

export interface GameSession {
  id: string;
  gameType: string;
  status: string;
  config: SkillGameConfig;
  scores: Record<string, number>;
  standings?: StandingEntry[];
  leaderName?: string | null;
  leaderScore?: number | null;
  yourScore?: number;
  improved?: boolean;
  previousScore?: number | null;
}