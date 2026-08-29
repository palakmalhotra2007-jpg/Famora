import { Request, Response, NextFunction } from 'express';
import { FamilyMember } from '../models';
import { AppError } from './errorHandler';
import { isValidObjectId } from '../utils/transform';

export async function requireFamilyMember(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const familyId = req.params.familyId ?? req.body.familyId ?? req.query.familyId;
  const userId = req.user?.userId;

  if (!userId) {
    next(new AppError(401, 'Authentication required'));
    return;
  }

  if (!familyId || typeof familyId !== 'string' || !isValidObjectId(familyId)) {
    next(new AppError(400, 'Valid family ID required'));
    return;
  }

  const membership = await FamilyMember.findOne({ familyId, userId });

  if (!membership) {
    next(new AppError(403, 'Not a member of this family'));
    return;
  }

  next();
}
