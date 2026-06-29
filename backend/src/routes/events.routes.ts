import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Event, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc } from '../utils/transform';

const router = Router();

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  eventType: z.enum(['birthday', 'anniversary', 'vacation', 'dinner', 'movie', 'school', 'doctor', 'general']).default('general'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  reminderMinutes: z.number().int().min(0).default(60),
});

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const from = req.query.from ? new Date(req.query.from as string) : new Date();
      const to = req.query.to
        ? new Date(req.query.to as string)
        : new Date(from.getFullYear(), from.getMonth() + 2, 0, 23, 59, 59, 999);

      const filter: Record<string, unknown> = {
        familyId,
        startTime: { $gte: from, $lte: to },
      };

      const events = await Event.find(filter)
        .sort({ startTime: 1 })
        .populate<{ createdBy: InstanceType<typeof User> }>('createdBy');

      const data = events.map((e) => ({
        ...toApiDoc(e),
        createdByName: e.createdBy.displayName,
        rsvps: e.rsvps.map((r) => ({
          userId: r.userId.toString(),
          status: r.status,
        })),
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
      const data = createEventSchema.parse(req.body);

      const event = await Event.create({
        familyId,
        createdBy: req.user!.userId,
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        location: data.location,
        reminderMinutes: data.reminderMinutes,
      });

      const populated = await Event.findById(event._id).populate<{ createdBy: InstanceType<typeof User> }>(
        'createdBy'
      );

      res.status(201).json({
        success: true,
        data: {
          ...toApiDoc(populated ?? event),
          createdByName: populated?.createdBy.displayName,
          rsvps: [],
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/:eventId/rsvp',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const { status } = req.body as { status?: string };
      const validStatuses = ['going', 'maybe', 'declined'];
      if (!status || !validStatuses.includes(status)) {
        throw new AppError(400, 'Invalid RSVP status');
      }

      const event = await Event.findById(eventId);
      if (!event) throw new AppError(404, 'Event not found');

      const existingIdx = event.rsvps.findIndex(
        (r) => r.userId.toString() === req.user!.userId
      );

      if (existingIdx >= 0) {
        event.rsvps[existingIdx].status = status;
      } else {
        event.rsvps.push({
          userId: new Types.ObjectId(req.user!.userId),
          status,
          createdAt: new Date(),
        });
      }

      await event.save();

      res.json({
        success: true,
        data: { eventId, userId: req.user!.userId, status },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:familyId/:eventId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId, eventId } = req.params;
      const event = await Event.findOneAndDelete({ _id: eventId, familyId });
      if (!event) throw new AppError(404, 'Event not found');

      res.json({ success: true, data: { id: eventId } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
