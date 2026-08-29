import { Router, Request, Response, NextFunction } from 'express';
import { DailyChallenge, DailyUpload, FamilyMember, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc, startOfDay, endOfDay } from '../utils/transform';

const router = Router();

const DEFAULT_PROMPTS = [
  'Morning coffee ☕',
  'Work desk 💻',
  'Lunch 🍽️',
  'Pet 🐾',
  'Sunset 🌅',
  'Selfie 🤳',
  'Workout 💪',
  'Book 📖',
  'Friends 👋',
  'Evening walk 🚶',
];

async function getOrCreateTodayChallenge(familyId: string) {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  let challenge = await DailyChallenge.findOne({
    familyId,
    challengeDate: { $gte: todayStart, $lte: todayEnd },
  });

  if (!challenge) {
    challenge = await DailyChallenge.create({
      familyId,
      challengeDate: todayStart,
      prompts: DEFAULT_PROMPTS,
    });
  }

  return challenge;
}

router.get(
  '/:familyId/today',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const challenge = await getOrCreateTodayChallenge(String(familyId));

      const [uploads, memberships] = await Promise.all([
        DailyUpload.find({ challengeId: challenge._id })
          .sort({ createdAt: 1 })
          .populate<{ userId: InstanceType<typeof User> }>('userId'),
        FamilyMember.find({ familyId }).populate<{ userId: InstanceType<typeof User> }>('userId'),
      ]);

      const uploadCounts = new Map<string, number>();
      uploads.forEach((u) => {
        const key = u.userId.id;
        uploadCounts.set(key, (uploadCounts.get(key) ?? 0) + 1);
      });

      const members = memberships.map((m) => ({
        id: m.userId.id,
        displayName: m.userId.displayName,
        avatarUrl: m.userId.avatarUrl,
        uploadCount: uploadCounts.get(m.userId.id) ?? 0,
      }));

      const membersCompleted = members.filter((m) => m.uploadCount >= 2).length;
      const userUploads = uploads.filter((u) => u.userId.id === req.user!.userId).length;

      res.json({
        success: true,
        data: {
          challenge: toApiDoc(challenge),
          uploads: uploads.map((u) => ({
            ...toApiDoc(u),
            displayName: u.userId.displayName,
            avatarUrl: u.userId.avatarUrl,
          })),
          members,
          progress: {
            membersCompleted,
            totalMembers: members.length,
            userUploads,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/upload',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const { mediaUrl, promptLabel } = req.body as { mediaUrl?: string; promptLabel?: string };

      if (!mediaUrl) throw new AppError(400, 'Media URL required');

      const challenge = await getOrCreateTodayChallenge(String(familyId));

      const upload = await DailyUpload.create({
        challengeId: challenge._id,
        userId: req.user!.userId,
        mediaUrl,
        promptLabel,
      });

      await updateStreak(req.user!.userId);

      res.status(201).json({ success: true, data: toApiDoc(upload) });
    } catch (error) {
      next(error);
    }
  }
);

async function updateStreak(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  const todayStart = startOfDay();
  const yesterdayStart = startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000));

  let newStreak = 1;

  if (user.lastUploadDate) {
    const lastUpload = startOfDay(user.lastUploadDate);
    if (lastUpload.getTime() === yesterdayStart.getTime()) {
      newStreak = user.photoStreak + 1;
    } else if (lastUpload.getTime() === todayStart.getTime()) {
      newStreak = user.photoStreak;
    }
  }

  user.photoStreak = newStreak;
  user.longestStreak = Math.max(newStreak, user.longestStreak);
  user.lastUploadDate = todayStart;
  await user.save();
}

export default router;
