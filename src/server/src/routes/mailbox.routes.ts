import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MailboxLetter, User, FamilyMember } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc } from '../utils/transform';

const router = Router();

const OPEN_CONDITION_LABELS: Record<string, string> = {
  anytime: 'Open anytime',
  bad_day: 'Open when you are having a bad day',
  birthday: 'Open on your birthday',
  after_exams: 'Open after your exams',
  custom: 'Open when the time is right',
};

const createLetterSchema = z.object({
  recipientId: z.string().min(1),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(5000),
  openCondition: z.enum(['anytime', 'bad_day', 'birthday', 'after_exams', 'custom']).default('anytime'),
  openConditionText: z.string().max(200).optional(),
});

function refId(ref: unknown): string {
  if (ref && typeof ref === 'object' && '_id' in ref) {
    return String((ref as { _id: unknown })._id);
  }
  return String(ref);
}

function serializeLetter(
  letter: InstanceType<typeof MailboxLetter>,
  viewerId: string,
  author?: InstanceType<typeof User> | null,
  recipient?: InstanceType<typeof User> | null
) {
  const recipientId = refId(letter.recipientId);
  const authorId = refId(letter.authorId);
  const isRecipient = recipientId === viewerId;
  const isAuthor = authorId === viewerId;
  const canReadBody = isAuthor || (isRecipient && (letter.isOpened || letter.openCondition === 'anytime'));

  return {
    ...toApiDoc(letter),
    authorName: author?.displayName,
    authorAvatar: author?.avatarUrl,
    recipientName: recipient?.displayName,
    recipientAvatar: recipient?.avatarUrl,
    openConditionLabel:
      letter.openCondition === 'custom' && letter.openConditionText
        ? letter.openConditionText
        : OPEN_CONDITION_LABELS[letter.openCondition] ?? letter.openCondition,
    body: canReadBody ? letter.body : null,
    isSealed: isRecipient && !letter.isOpened && letter.openCondition !== 'anytime',
    isForMe: isRecipient,
    isFromMe: isAuthor,
  };
}

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const viewerId = req.user!.userId;

      const letters = await MailboxLetter.find({
        familyId,
        $or: [{ recipientId: viewerId }, { authorId: viewerId }],
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate<{ authorId: InstanceType<typeof User> }>('authorId')
        .populate<{ recipientId: InstanceType<typeof User> }>('recipientId');

      const inbox = letters.filter((l) => refId(l.recipientId) === viewerId);
      const sent = letters.filter((l) => refId(l.authorId) === viewerId);

      res.json({
        success: true,
        data: {
          inbox: inbox.map((l) =>
            serializeLetter(l as unknown as InstanceType<typeof MailboxLetter>, viewerId, l.authorId, l.recipientId)
          ),
          sent: sent.map((l) =>
            serializeLetter(l as unknown as InstanceType<typeof MailboxLetter>, viewerId, l.authorId, l.recipientId)
          ),
        },
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
      const data = createLetterSchema.parse(req.body);

      const membership = await FamilyMember.findOne({ familyId, userId: data.recipientId });
      if (!membership) throw new AppError(400, 'Recipient must be a family member');

      const letter = await MailboxLetter.create({
        familyId,
        authorId: req.user!.userId,
        recipientId: data.recipientId,
        title: data.title,
        body: data.body,
        openCondition: data.openCondition,
        openConditionText: data.openConditionText,
        isOpened: data.openCondition === 'anytime',
        openedAt: data.openCondition === 'anytime' ? new Date() : undefined,
      });

      const populated = await MailboxLetter.findById(letter._id)
        .populate<{ authorId: InstanceType<typeof User> }>('authorId')
        .populate<{ recipientId: InstanceType<typeof User> }>('recipientId');

      if (!populated) throw new AppError(500, 'Could not create letter');

      res.status(201).json({
        success: true,
        data: serializeLetter(
          populated as unknown as InstanceType<typeof MailboxLetter>,
          req.user!.userId,
          populated.authorId,
          populated.recipientId
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/:letterId/open',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId, letterId } = req.params;
      const viewerId = req.user!.userId;

      const letter = await MailboxLetter.findOne({ _id: letterId, familyId, recipientId: viewerId });
      if (!letter) throw new AppError(404, 'Letter not found');

      if (!letter.isOpened) {
        letter.isOpened = true;
        letter.openedAt = new Date();
        await letter.save();
      }

      const populated = await MailboxLetter.findById(letter._id)
        .populate<{ authorId: InstanceType<typeof User> }>('authorId')
        .populate<{ recipientId: InstanceType<typeof User> }>('recipientId');

      if (!populated) throw new AppError(404, 'Letter not found');

      res.json({
        success: true,
        data: serializeLetter(
          populated as unknown as InstanceType<typeof MailboxLetter>,
          viewerId,
          populated.authorId,
          populated.recipientId
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
