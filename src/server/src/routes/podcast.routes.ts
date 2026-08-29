import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VoiceNote, PodcastEpisode, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc, startOfWeek } from '../utils/transform';
import {
  generateWeeklyEpisode,
  getWeekVoiceStatus,
} from '../services/podcast.service';

const router = Router();

const voiceNoteSchema = z.object({
  audioUrl: z.string().min(1),
  durationSec: z.number().int().min(1).max(600),
  caption: z.string().max(200).optional(),
  transcript: z.string().max(4000).optional(),
});

router.get(
  '/:familyId/week-status',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getWeekVoiceStatus(String(req.params.familyId));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/voice-notes',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const weekStart = startOfWeek();

      const notes = await VoiceNote.find({ familyId, weekStart })
        .sort({ createdAt: 1 })
        .populate<{ authorId: InstanceType<typeof User> }>('authorId');

      res.json({
        success: true,
        data: notes.map((n) => ({
          ...toApiDoc(n),
          authorName: n.authorId.displayName,
          authorAvatar: n.authorId.avatarUrl,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/voice-notes',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const data = voiceNoteSchema.parse(req.body);
      const weekStart = startOfWeek();

      const note = await VoiceNote.findOneAndUpdate(
        { familyId, authorId: req.user!.userId, weekStart },
        {
          familyId,
          authorId: req.user!.userId,
          audioUrl: data.audioUrl,
          durationSec: data.durationSec,
          caption: data.caption,
          transcript: data.transcript,
          weekStart,
        },
        { upsert: true, new: true }
      );

      const author = await User.findById(req.user!.userId);

      res.status(201).json({
        success: true,
        data: {
          ...toApiDoc(note),
          authorName: author?.displayName,
          authorAvatar: author?.avatarUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/episode',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const weekStart = startOfWeek();

      const episode = await PodcastEpisode.findOne({ familyId, weekStart }).populate<{
        generatedBy: InstanceType<typeof User> | null;
      }>('generatedBy');

      if (!episode) {
        res.json({ success: true, data: null });
        return;
      }

      const notes = await VoiceNote.find({ _id: { $in: episode.voiceNoteIds } })
        .sort({ createdAt: 1 })
        .populate<{ authorId: InstanceType<typeof User> }>('authorId');

      res.json({
        success: true,
        data: {
          ...toApiDoc(episode),
          generatedByName: episode.generatedBy?.displayName ?? null,
          voiceNotes: notes.map((n) => ({
            ...toApiDoc(n),
            authorName: n.authorId.displayName,
            authorAvatar: n.authorId.avatarUrl,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/generate',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const status = await getWeekVoiceStatus(String(familyId));

      if (!status.members.find((m) => m.userId === req.user!.userId)?.hasVoiceNote) {
        throw new AppError(403, 'Record your weekly voice note before generating the podcast');
      }

      const episode = await generateWeeklyEpisode(String(familyId), req.user!.userId);
      const author = await User.findById(req.user!.userId);

      res.status(201).json({
        success: true,
        data: {
          ...toApiDoc(episode),
          generatedByName: author?.displayName ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('voice note')) {
        next(new AppError(400, error.message));
        return;
      }
      next(error);
    }
  }
);

export default router;
