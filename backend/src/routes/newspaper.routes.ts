import { Router, Request, Response, NextFunction } from 'express';
import { Newspaper } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { generateNewspaper } from '../services/newspaper.service';
import { toApiDoc, startOfDay, endOfDay } from '../utils/transform';

const router = Router();

router.get(
  '/:familyId/today',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const todayStart = startOfDay();
      const todayEnd = endOfDay();

      let newspaper = await Newspaper.findOne({
        familyId,
        editionDate: { $gte: todayStart, $lte: todayEnd },
      });

      if (!newspaper) {
        const generated = await generateNewspaper(String(familyId));
        res.json({ success: true, data: generated });
        return;
      }

      res.json({ success: true, data: toApiDoc(newspaper) });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/history',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 7, 30);

      const newspapers = await Newspaper.find({ familyId })
        .sort({ editionDate: -1 })
        .limit(limit)
        .select('editionDate title coverImageUrl createdAt');

      res.json({ success: true, data: newspapers.map((n) => toApiDoc(n)) });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/:newspaperId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId, newspaperId } = req.params;
      const newspaper = await Newspaper.findOne({ _id: newspaperId, familyId });

      if (!newspaper) {
        throw new AppError(404, 'Newspaper not found');
      }

      res.json({ success: true, data: toApiDoc(newspaper) });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
