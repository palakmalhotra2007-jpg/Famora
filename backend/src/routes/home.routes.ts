import { Router, Request, Response, NextFunction } from 'express';
import {
  Family,
  FamilyMember,
  User,
  Post,
  Event,
  Newspaper,
  DailyChallenge,
  DailyUpload,
  MemberLocation,
} from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { toApiDoc, startOfDay, endOfDay } from '../utils/transform';

const router = Router();

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const todayStart = startOfDay();
      const todayEnd = endOfDay();
      const tomorrowEnd = endOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000));

      const [family, memberships, todayEvents, recentPosts, newspaper, challenge, nextEvent, locationRecords] =
        await Promise.all([
          Family.findById(familyId),
          FamilyMember.find({ familyId }).populate<{ userId: InstanceType<typeof User> }>('userId'),
          Event.find({ familyId, startTime: { $gte: todayStart, $lte: tomorrowEnd } })
            .sort({ startTime: 1 })
            .limit(5),
          Post.find({ familyId })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate<{ authorId: InstanceType<typeof User> }>('authorId'),
          Newspaper.findOne({ familyId, editionDate: { $gte: todayStart, $lte: todayEnd } }),
          DailyChallenge.findOne({ familyId, challengeDate: { $gte: todayStart, $lte: todayEnd } }),
          Event.findOne({ familyId, startTime: { $gt: new Date() } }).sort({ startTime: 1 }),
          MemberLocation.find({ familyId }),
        ]);

      const locationMap = new Map(locationRecords.map((l) => [l.userId.toString(), l]));

      const members = memberships.map((m) => {
        const loc = locationMap.get(m.userId.id);
        const sharing = loc?.sharingEnabled && loc.latitude != null && loc.longitude != null;
        const updatedAt = loc?.updatedAt;

        return {
          id: m.userId.id,
          displayName: m.userId.displayName,
          avatarUrl: m.userId.avatarUrl,
          photoStreak: m.userId.photoStreak,
          nickname: m.nickname,
          role: m.role,
          aura: m.userId.aura ?? null,
          location: sharing
            ? {
                latitude: loc!.latitude,
                longitude: loc!.longitude,
                locationName: loc!.locationName ?? null,
                updatedAt: updatedAt?.toISOString() ?? null,
              }
            : null,
        };
      });

      const now = new Date();
      const upcomingBirthdays = memberships
        .map((m) => m.userId)
        .filter((u) => {
          if (!u.birthday) return false;
          const bday = new Date(u.birthday);
          const todayDay = now.getDate();
          const bdayDay = bday.getDate();
          const dayDiff = bdayDay - todayDay;
          return bday.getMonth() === now.getMonth() && dayDiff >= 0 && dayDiff <= 7;
        })
        .map((u) => ({
          displayName: u.displayName,
          birthday: u.birthday,
          avatarUrl: u.avatarUrl,
        }));

      let challengeProgress = null;
      if (challenge) {
        const uploads = await DailyUpload.find({ challengeId: challenge._id });
        const uploadCounts = new Map<string, number>();
        uploads.forEach((u) => {
          const key = u.userId.toString();
          uploadCounts.set(key, (uploadCounts.get(key) ?? 0) + 1);
        });
        const membersCompleted = [...uploadCounts.values()].filter((c) => c >= 2).length;
        challengeProgress = { id: challenge.id, membersCompleted, totalMembers: memberships.length };
      }

      const formattedPosts = recentPosts.map((p) => ({
        ...toApiDoc(p),
        authorName: p.authorId.displayName,
        authorAvatar: p.authorId.avatarUrl,
      }));

      res.json({
        success: true,
        data: {
          family: toApiDoc(family),
          members,
          todayEvents: todayEvents.map((e) => toApiDoc(e)),
          upcomingBirthdays,
          recentPosts: formattedPosts,
          newspaper: newspaper ? toApiDoc(newspaper) : null,
          nextEvent: nextEvent ? toApiDoc(nextEvent) : null,
          familyStreak: family?.familyStreak ?? 0,
          challengeProgress,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
