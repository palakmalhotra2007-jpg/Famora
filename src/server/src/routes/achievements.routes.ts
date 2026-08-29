import { Router, Request, Response, NextFunction } from 'express';
import { Achievement, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { toApiDoc } from '../utils/transform';

const router = Router();

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const userId = req.query.userId as string | undefined;

      const filter: Record<string, unknown> = { familyId };
      if (userId) filter.userId = userId;

      const achievements = await Achievement.find(filter)
        .sort({ earnedAt: -1 })
        .populate<{ userId: InstanceType<typeof User> | null }>('userId');

      const data = achievements.map((a) => ({
        ...toApiDoc(a),
        userName: a.userId?.displayName ?? null,
        userAvatar: a.userId?.avatarUrl ?? null,
      }));

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
