import { Router, Request, Response, NextFunction } from 'express';
import { GameSession, FamilyMember, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc } from '../utils/transform';
import { initializeGameConfig, getSessionConfig, submitPlayerScore } from '../games/engine';
import { GAME_TYPE_IDS } from '../games/content';

const router = Router();

function serializeSession(session: InstanceType<typeof GameSession>) {
  const doc = toApiDoc(session)!;
  const config = getSessionConfig(session);
  const scores: Record<string, number> = {};
  session.scores.forEach((value, key) => {
    scores[key] = value;
  });

  return { ...doc, config, scores };
}

async function buildStandings(familyId: string, session: InstanceType<typeof GameSession>) {
  const memberships = await FamilyMember.find({ familyId }).populate<{ userId: InstanceType<typeof User> }>(
    'userId'
  );

  const standings = memberships
    .map((m) => ({
      userId: m.userId.id,
      displayName: m.userId.displayName,
      avatarUrl: m.userId.avatarUrl,
      score: session.scores.get(m.userId.id) ?? null,
      hasPlayed: session.scores.has(m.userId.id),
    }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const leader = standings.find((s) => s.score !== null) ?? null;

  return {
    standings,
    leaderName: leader?.displayName ?? null,
    leaderScore: leader?.score ?? null,
  };
}

async function getOrCreateChallenge(familyId: string, gameType: string) {
  let session = await GameSession.findOne({ familyId, gameType, status: 'active' }).sort({ updatedAt: -1 });

  if (!session) {
    session = await GameSession.create({
      familyId,
      gameType,
      config: initializeGameConfig(gameType),
      status: 'active',
      startedAt: new Date(),
    });
  }

  return session;
}

router.get('/types', (_req: Request, res: Response) => {
  res.json({ success: true, data: GAME_TYPE_IDS });
});

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const sessions = await GameSession.find({ familyId, status: 'active' })
        .sort({ updatedAt: -1 })
        .limit(20);

      const data = await Promise.all(
        sessions.map(async (s) => ({
          ...serializeSession(s),
          ...(await buildStandings(String(familyId), s)),
        }))
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/challenge',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const { gameType } = req.body as { gameType?: string };

      if (!gameType || !GAME_TYPE_IDS.includes(gameType)) {
        throw new AppError(400, 'Invalid game type');
      }

      const session = await getOrCreateChallenge(String(familyId), gameType);
      const standings = await buildStandings(String(familyId), session);

      res.status(201).json({
        success: true,
        data: { ...serializeSession(session), ...standings },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const { gameType } = req.body as { gameType?: string };

      if (!gameType || !GAME_TYPE_IDS.includes(gameType)) {
        throw new AppError(400, 'Invalid game type');
      }

      const session = await getOrCreateChallenge(String(familyId), gameType);
      const standings = await buildStandings(String(familyId), session);

      res.status(201).json({
        success: true,
        data: { ...serializeSession(session), ...standings },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/sessions/:sessionId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId, sessionId } = req.params;
      const session = await GameSession.findOne({ _id: sessionId, familyId });
      if (!session) throw new AppError(404, 'Game session not found');

      res.json({
        success: true,
        data: {
          ...serializeSession(session),
          ...(await buildStandings(String(familyId), session)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/sessions/:sessionId/finish',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId, sessionId } = req.params;
      const { score } = req.body as { score?: number };

      if (score === undefined || score < 0 || !Number.isFinite(score)) {
        throw new AppError(400, 'Valid score required');
      }

      const session = await GameSession.findOne({ _id: sessionId, familyId });
      if (!session) throw new AppError(404, 'Game session not found');

      const { improved, previousScore } = submitPlayerScore(
        session,
        req.user!.userId,
        Math.round(score)
      );

      await session.save();

      const standings = await buildStandings(String(familyId), session);
      const yourScore = session.scores.get(req.user!.userId) ?? Math.round(score);

      res.json({
        success: true,
        data: {
          ...serializeSession(session),
          ...standings,
          improved,
          previousScore,
          yourScore,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/leaderboard',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const gameType = req.query.gameType as string | undefined;

      const query: Record<string, unknown> = { familyId, status: 'active' };
      if (gameType) query.gameType = gameType;

      const sessions = await GameSession.find(query).sort({ updatedAt: -1 }).limit(10);

      const data = await Promise.all(
        sessions.map(async (session) => ({
          gameType: session.gameType,
          sessionId: String(session._id),
          ...(await buildStandings(String(familyId), session)),
        }))
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
