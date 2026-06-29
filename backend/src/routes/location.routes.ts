import { Router, Request, Response, NextFunction } from 'express';
import { FamilyMember, MemberLocation, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { emitToFamily } from '../socket';

const router = Router();

function serializeLocation(
  user: InstanceType<typeof User>,
  record: InstanceType<typeof MemberLocation> | null,
  viewerUserId: string
) {
  const isSelf = user.id === viewerUserId;
  const sharingEnabled = record?.sharingEnabled ?? false;
  const canSeeCoords = sharingEnabled && record?.latitude != null && record?.longitude != null;
  const updatedAt = record?.updatedAt;

  return {
    userId: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    sharingEnabled,
    isSelf,
    latitude: canSeeCoords ? record!.latitude : null,
    longitude: canSeeCoords ? record!.longitude : null,
    locationName: canSeeCoords ? record!.locationName ?? null : null,
    updatedAt: canSeeCoords && updatedAt ? updatedAt.toISOString() : null,
    aura: user.aura ?? null,
  };
}

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const viewerUserId = req.user!.userId;

      const memberships = await FamilyMember.find({ familyId }).populate<{
        userId: InstanceType<typeof User>;
      }>('userId');

      const userIds = memberships.map((m) => m.userId.id);
      const records = await MemberLocation.find({ familyId, userId: { $in: userIds } });
      const recordMap = new Map(records.map((r) => [r.userId.toString(), r]));

      const members = memberships.map((m) =>
        serializeLocation(m.userId, recordMap.get(m.userId.id) ?? null, viewerUserId)
      );

      const sharingCount = members.filter((m) => m.sharingEnabled).length;
      const auraCount = members.filter((m) => m.aura).length;

      res.json({
        success: true,
        data: { members, sharingCount, auraCount },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:familyId/me',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const userId = req.user!.userId;
      const { latitude, longitude, accuracy, locationName } = req.body as {
        latitude?: number;
        longitude?: number;
        accuracy?: number;
        locationName?: string;
      };

      if (
        latitude === undefined ||
        longitude === undefined ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new AppError(400, 'Valid latitude and longitude required');
      }

      let record = await MemberLocation.findOne({ familyId, userId });
      if (!record) {
        record = await MemberLocation.create({
          familyId,
          userId,
          sharingEnabled: false,
        });
      }

      if (!record.sharingEnabled) {
        throw new AppError(403, 'Location sharing is disabled. Enable it in Profile first.');
      }

      record.latitude = latitude;
      record.longitude = longitude;
      if (accuracy !== undefined && Number.isFinite(accuracy)) {
        record.accuracy = accuracy;
      }
      if (locationName !== undefined) {
        record.locationName = locationName.trim().slice(0, 200) || undefined;
      }

      await record.save();

      const user = await User.findById(userId);
      if (!user) throw new AppError(404, 'User not found');

      const payload = serializeLocation(user, record, userId);
      emitToFamily(String(familyId), 'location-updated', payload);

      res.json({ success: true, data: payload });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:familyId/me/sharing',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const userId = req.user!.userId;
      const { sharingEnabled } = req.body as { sharingEnabled?: boolean };

      if (typeof sharingEnabled !== 'boolean') {
        throw new AppError(400, 'sharingEnabled must be a boolean');
      }

      let record = await MemberLocation.findOneAndUpdate(
        { familyId, userId },
        { $set: { sharingEnabled } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (!sharingEnabled) {
        record.latitude = undefined;
        record.longitude = undefined;
        record.accuracy = undefined;
        record.locationName = undefined;
        await record.save();
      }

      const user = await User.findById(userId);
      if (!user) throw new AppError(404, 'User not found');

      const payload = serializeLocation(user, record, userId);
      emitToFamily(String(familyId), 'location-updated', payload);

      res.json({ success: true, data: payload });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
