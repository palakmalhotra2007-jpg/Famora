import { Router, Request, Response, NextFunction } from 'express';
import { BucketListItem, User } from '../models';
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
      const items = await BucketListItem.find({ familyId })
        .sort({ isCompleted: 1, createdAt: -1 })
        .populate<{ createdBy: InstanceType<typeof User> | null }>('createdBy');

      const data = items.map((item) => ({
        ...toApiDoc(item),
        createdByName: item.createdBy?.displayName ?? null,
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
      const { title, description, category } = req.body as {
        title?: string;
        description?: string;
        category?: string;
      };

      if (!title) throw new AppError(400, 'Title required');

      const item = await BucketListItem.create({
        familyId,
        title,
        description,
        category,
        createdBy: req.user!.userId,
      });

      res.status(201).json({ success: true, data: toApiDoc(item) });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:familyId/:itemId/complete',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { itemId } = req.params;
      const item = await BucketListItem.findByIdAndUpdate(
        itemId,
        { isCompleted: true, completedAt: new Date() },
        { new: true }
      );

      if (!item) throw new AppError(404, 'Bucket list item not found');

      res.json({ success: true, data: toApiDoc(item) });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
