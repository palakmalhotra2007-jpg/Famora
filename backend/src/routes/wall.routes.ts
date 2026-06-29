import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WallEntry, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { toApiDoc, startOfDay, endOfDay } from '../utils/transform';

const router = Router();

const createEntrySchema = z.object({
  slot: z.enum(['morning', 'night']),
  message: z.string().min(1).max(280),
  photoUrl: z.string().optional(),
  wallDate: z.string().datetime().optional(),
});

router.get(
  '/:familyId/timeline',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const days = Math.min(parseInt(String(req.query.days ?? '14'), 10) || 14, 60);
      const since = startOfDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

      const entries = await WallEntry.find({ familyId, wallDate: { $gte: since } })
        .sort({ wallDate: -1, slot: 1, createdAt: -1 })
        .populate<{ authorId: InstanceType<typeof User> }>('authorId');

      const grouped = new Map<string, Array<Record<string, unknown>>>();

      entries.forEach((entry) => {
        const dateKey = startOfDay(entry.wallDate).toISOString();
        const serialized = {
          ...toApiDoc(entry),
          authorName: entry.authorId.displayName,
          authorAvatar: entry.authorId.avatarUrl,
        };
        const list = grouped.get(dateKey) ?? [];
        list.push(serialized);
        grouped.set(dateKey, list);
      });

      const timeline = [...grouped.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, items]) => ({ date, entries: items }));

      res.json({ success: true, data: timeline });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/today',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const todayStart = startOfDay();
      const todayEnd = endOfDay();

      const entries = await WallEntry.find({
        familyId,
        wallDate: { $gte: todayStart, $lte: todayEnd },
      })
        .sort({ slot: 1, createdAt: 1 })
        .populate<{ authorId: InstanceType<typeof User> }>('authorId');

      res.json({
        success: true,
        data: entries.map((entry) => ({
          ...toApiDoc(entry),
          authorName: entry.authorId.displayName,
          authorAvatar: entry.authorId.avatarUrl,
        })),
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
      const data = createEntrySchema.parse(req.body);
      const wallDate = data.wallDate ? startOfDay(new Date(data.wallDate)) : startOfDay();

      const existing = await WallEntry.findOne({
        familyId,
        authorId: req.user!.userId,
        wallDate,
        slot: data.slot,
      });

      if (existing) {
        existing.message = data.message;
        existing.photoUrl = data.photoUrl;
        await existing.save();
        const author = await User.findById(req.user!.userId);
        res.json({
          success: true,
          data: {
            ...toApiDoc(existing),
            authorName: author?.displayName,
            authorAvatar: author?.avatarUrl,
          },
        });
        return;
      }

      const entry = await WallEntry.create({
        familyId,
        authorId: req.user!.userId,
        slot: data.slot,
        wallDate,
        message: data.message,
        photoUrl: data.photoUrl,
      });

      const author = await User.findById(req.user!.userId);

      res.status(201).json({
        success: true,
        data: {
          ...toApiDoc(entry),
          authorName: author?.displayName,
          authorAvatar: author?.avatarUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
