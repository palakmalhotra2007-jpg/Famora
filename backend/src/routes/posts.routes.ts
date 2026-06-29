import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Post, Story, User } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc } from '../utils/transform';

const router = Router();

const createPostSchema = z.object({
  caption: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).min(1),
  mediaType: z.enum(['photo', 'video']).default('photo'),
  locationName: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

router.get(
  '/:familyId',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const skip = (page - 1) * limit;

      const [posts, total] = await Promise.all([
        Post.find({ familyId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate<{ authorId: InstanceType<typeof User> }>('authorId'),
        Post.countDocuments({ familyId }),
      ]);

      const data = posts.map((p) => ({
        ...toApiDoc(p),
        authorName: p.authorId.displayName,
        authorAvatar: p.authorId.avatarUrl,
        reactions: p.reactions.map((r) => ({
          type: r.reactionType,
          userId: r.userId.toString(),
        })),
        commentCount: 0,
      }));

      res.json({
        success: true,
        data,
        pagination: { page, limit, total },
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
      const data = createPostSchema.parse(req.body);

      const post = await Post.create({
        familyId,
        authorId: req.user!.userId,
        caption: data.caption,
        mediaUrls: data.mediaUrls,
        mediaType: data.mediaType,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
      });

      res.status(201).json({ success: true, data: toApiDoc(post) });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/:postId/reactions',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;
      const { reactionType } = req.body as { reactionType?: string };
      const validReactions = ['loved', 'funny', 'emotional', 'proud', 'celebrate'];
      if (!reactionType || !validReactions.includes(reactionType)) {
        throw new AppError(400, 'Invalid reaction type');
      }

      const post = await Post.findById(postId);
      if (!post) throw new AppError(404, 'Post not found');

      const existingIdx = post.reactions.findIndex(
        (r) => r.userId.toString() === req.user!.userId
      );

      if (existingIdx >= 0) {
        post.reactions[existingIdx].reactionType = reactionType;
      } else {
        const { Types } = await import('mongoose');
        post.reactions.push({
          userId: new Types.ObjectId(req.user!.userId),
          reactionType,
          createdAt: new Date(),
        });
      }

      await post.save();

      res.json({ success: true, data: { postId, reactionType, userId: req.user!.userId } });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:familyId/stories',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const stories = await Story.find({ familyId, expiresAt: { $gt: new Date() } })
        .sort({ createdAt: -1 })
        .populate<{ authorId: InstanceType<typeof User> }>('authorId');

      const data = stories.map((s) => ({
        ...toApiDoc(s),
        authorName: s.authorId.displayName,
        authorAvatar: s.authorId.avatarUrl,
      }));

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
