import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { User, Family, FamilyMember } from '../models';
import { config } from '../config';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc } from '../utils/transform';
import { FAMILY_AURA_VALUES, isFamilyAura } from '../constants/aura';
import { emitToFamily } from '../socket';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateTokens(userId: string, email?: string) {
  const accessToken = jwt.sign({ userId, email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      email: data.email.toLowerCase(),
      passwordHash,
      displayName: data.displayName,
      authProvider: 'email',
    });

    const tokens = generateTokens(user.id, user.email);
    res.status(201).json({ success: true, data: { user: toApiDoc(user), ...tokens } });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });

    if (!user?.passwordHash) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const tokens = generateTokens(user.id, user.email);
    const safeUser = toApiDoc(user);
    delete safeUser?.passwordHash;

    res.json({ success: true, data: { user: safeUser, ...tokens } });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId).select('-passwordHash');

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ success: true, data: toApiDoc(user) });
  } catch (error) {
    next(error);
  }
});

router.patch('/me/aura', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { aura } = req.body as { aura?: string | null };

    if (aura !== null && aura !== undefined && !isFamilyAura(aura)) {
      throw new AppError(400, `aura must be one of: ${FAMILY_AURA_VALUES.join(', ')} or null`);
    }

    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $set: { aura: aura ?? null } },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const memberships = await FamilyMember.find({ userId: user.id });
    for (const membership of memberships) {
      emitToFamily(String(membership.familyId), 'aura-updated', {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        aura: user.aura ?? null,
      });
    }

    res.json({ success: true, data: toApiDoc(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/families', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, newspaperName } = req.body as { name?: string; newspaperName?: string };
    if (!name) throw new AppError(400, 'Family name required');

    const inviteCode = generateInviteCode();
    const family = await Family.create({
      name,
      newspaperName: newspaperName ?? `${name} Times`,
      inviteCode,
      createdBy: req.user!.userId,
    });

    await FamilyMember.create({
      familyId: family._id,
      userId: req.user!.userId,
      role: 'admin',
    });

    res.status(201).json({ success: true, data: toApiDoc(family) });
  } catch (error) {
    next(error);
  }
});

router.post('/families/join', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { inviteCode } = req.body as { inviteCode?: string };
    if (!inviteCode) throw new AppError(400, 'Invite code required');

    const family = await Family.findOne({ inviteCode: inviteCode.toUpperCase() });

    if (!family) {
      throw new AppError(404, 'Invalid invite code');
    }

    const existing = await FamilyMember.findOne({
      familyId: family._id,
      userId: req.user!.userId,
    });

    if (existing) {
      throw new AppError(409, 'Already a member of this family');
    }

    await FamilyMember.create({
      familyId: family._id,
      userId: req.user!.userId,
      role: 'member',
    });

    res.json({ success: true, data: toApiDoc(family) });
  } catch (error) {
    next(error);
  }
});

router.get('/families', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberships = await FamilyMember.find({ userId: req.user!.userId });

    const families = await Promise.all(
      memberships.map(async (membership) => {
        const family = await Family.findById(membership.familyId);
        const memberCount = await FamilyMember.countDocuments({ familyId: membership.familyId });

        return {
          ...toApiDoc(family!),
          role: membership.role,
          nickname: membership.nickname,
          memberCount,
        };
      })
    );

    res.json({ success: true, data: families.filter(Boolean) });
  } catch (error) {
    next(error);
  }
});

router.post('/families/:familyId/members', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyId } = req.params;
    const { displayName, email, role, nickname } = req.body as {
      displayName?: string;
      email?: string;
      role?: string;
      nickname?: string;
    };

    if (!displayName || !displayName.trim()) {
      throw new AppError(400, 'Display name is required');
    }

    const family = await Family.findById(familyId);
    if (!family) throw new AppError(404, 'Family not found');

    const cleanName = displayName.trim();
    const cleanEmail =
      email && email.trim()
        ? email.trim().toLowerCase()
        : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@famora.local`;

    let targetUser = await User.findOne({ email: cleanEmail });

    if (!targetUser) {
      const passwordHash = await bcrypt.hash('famora123', 12);
      targetUser = await User.create({
        email: cleanEmail,
        passwordHash,
        displayName: cleanName,
        authProvider: 'email',
      });
    }

    const existing = await FamilyMember.findOne({
      familyId: family._id,
      userId: targetUser._id,
    });

    if (existing) {
      throw new AppError(409, `${cleanName} is already a member of this family`);
    }

    const membership = await FamilyMember.create({
      familyId: family._id,
      userId: targetUser._id,
      role: role || 'member',
      nickname: nickname || undefined,
    });

    res.status(201).json({
      success: true,
      data: {
        id: targetUser.id,
        displayName: targetUser.displayName,
        email: targetUser.email,
        avatarUrl: targetUser.avatarUrl,
        role: membership.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
