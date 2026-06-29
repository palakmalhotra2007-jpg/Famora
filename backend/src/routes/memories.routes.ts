import { Router, Request, Response, NextFunction } from 'express';
import { Memory, Post } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { searchMemories } from '../services/memory.service';
import { toApiDoc } from '../utils/transform';

const router = Router();

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const category = req.query.category as string | undefined;

      const filter: Record<string, unknown> = { familyId };
      if (category) filter.category = category;

      const memories = await Memory.find(filter)
        .sort({ startDate: -1, createdAt: -1 });

      res.json({ success: true, data: memories.map((m) => toApiDoc(m)) });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/search',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const q = req.query.q as string;

      if (!q) throw new AppError(400, 'Search query required');

      const results = await searchMemories(String(familyId), q);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/map',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;

      const pins = await Post.find({
        familyId,
        latitude: { $ne: null },
        longitude: { $ne: null },
      }).sort({ createdAt: -1 });

      const locationNames = new Set(
        pins.map((p) => p.locationName).filter(Boolean)
      );

      res.json({
        success: true,
        data: {
          pins: pins.map((p) => toApiDoc(p)),
          stats: {
            cities: locationNames.size,
            totalPins: pins.length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
