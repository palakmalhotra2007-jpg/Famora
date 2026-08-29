import { Router, Request, Response, NextFunction } from 'express';
import { TimeCapsule, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc } from '../utils/transform';

const router = Router();

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const capsules = await TimeCapsule.find({
        familyId,
        $or: [{ isUnlocked: true }, { authorId: req.user!.userId }],
      })
        .sort({ unlockDate: 1 })
        .populate<{ authorId: InstanceType<typeof User> }>('authorId');

      const data = capsules.map((c) => ({
        ...toApiDoc(c),
        authorName: c.authorId.displayName,
      }));

      res.json({ success: true, data });
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
      const { title, contentType, contentUrl, textContent, unlockType, unlockDate, unlockMilestone } =
        req.body as Record<string, string>;

      if (!title || !contentType || !unlockType) {
        throw new AppError(400, 'Title, content type, and unlock type required');
      }

      const capsule = await TimeCapsule.create({
        familyId,
        authorId: req.user!.userId,
        title,
        contentType,
        contentUrl,
        textContent,
        unlockType,
        unlockDate: unlockDate ? new Date(unlockDate) : undefined,
        unlockMilestone,
      });

      res.status(201).json({ success: true, data: toApiDoc(capsule) });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
