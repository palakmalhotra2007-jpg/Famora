import { Types } from 'mongoose';
import { IGameSession } from '../models';
import { buildSkillConfig, SkillGameConfig } from './content';

export interface GameSessionConfig extends SkillGameConfig {
  playedBy?: string[];
}

export function initializeGameConfig(gameType: string): GameSessionConfig {
  return {
    ...buildSkillConfig(gameType),
    playedBy: [],
  };
}

export function getSessionConfig(session: IGameSession): GameSessionConfig {
  const raw = session.config as Partial<GameSessionConfig>;
  return {
    mode: raw.mode ?? 'tap_sprint',
    shared: raw.shared ?? true,
    durationSeconds: raw.durationSeconds,
    rounds: raw.rounds,
    phrases: raw.phrases,
    playedBy: raw.playedBy ?? [],
  };
}

export function submitPlayerScore(
  session: IGameSession,
  userId: string,
  score: number
): { improved: boolean; previousScore: number | null } {
  const previous = session.scores.get(userId) ?? null;
  const improved = previous === null || score > previous;

  if (improved) {
    session.scores.set(userId, score);
  }

  const config = getSessionConfig(session);
  if (!config.playedBy?.includes(userId)) {
    config.playedBy = [...(config.playedBy ?? []), userId];
    session.config = config as unknown as Record<string, unknown>;
  }

  session.winnerId = resolveWinnerId(session);
  session.status = 'active';

  return { improved, previousScore: previous };
}

export function resolveWinnerId(session: IGameSession): Types.ObjectId | undefined {
  let topUserId: string | undefined;
  let topScore = -1;

  session.scores.forEach((value, key) => {
    if (value > topScore) {
      topScore = value;
      topUserId = key;
    }
  });

  return topUserId ? new Types.ObjectId(topUserId) : undefined;
}
