import { Router, Request, Response, NextFunction } from 'express';
import { Notification } from '../models';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { toApiDoc } from '../utils/transform';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const unreadOnly = req.query.unread === 'true';

    const filter: Record<string, unknown> = { userId: req.user!.userId };
    if (unreadOnly) filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, data: notifications.map((n) => toApiDoc(n)) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    res.json({ success: true, data: toApiDoc(notification) });
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany(
      { userId: req.user!.userId, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;
