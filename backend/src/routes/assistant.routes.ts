import { Router, Request, Response, NextFunction } from 'express';
import { Family, AssistantMessage } from '../models';
import { authenticate } from '../middleware/auth';
import { requireFamilyMember } from '../middleware/familyAccess';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { logger } from '../utils/logger';
import { toApiDoc } from '../utils/transform';

const router = Router();

const SUGGESTED_ACTIONS = [
  { id: 'weekly_summary', label: 'Summarize this week', icon: '📊' },
  { id: 'birthday_message', label: 'Write a birthday message', icon: '🎂' },
  { id: 'weekend_ideas', label: 'Suggest weekend activities', icon: '🌳' },
  { id: 'travel_itinerary', label: 'Plan a family trip', icon: '✈️' },
  { id: 'gift_ideas', label: 'Recommend gifts', icon: '🎁' },
  { id: 'conversation_starters', label: 'Conversation starters', icon: '💬' },
  { id: 'photo_collage', label: 'Create memory collage', icon: '🖼️' },
  { id: 'shopping_list', label: 'Event shopping list', icon: '🛒' },
];

router.get('/actions', (_req: Request, res: Response) => {
  res.json({ success: true, data: SUGGESTED_ACTIONS });
});

router.get(
  '/:familyId/history',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const messages = await AssistantMessage.find({
        familyId,
        userId: req.user!.userId,
      })
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({ success: true, data: messages.reverse().map((m) => toApiDoc(m)) });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:familyId/chat',
  authenticate,
  requireFamilyMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { familyId } = req.params;
      const { message, actionType } = req.body as { message?: string; actionType?: string };

      if (!message) throw new AppError(400, 'Message required');

      await AssistantMessage.create({
        familyId,
        userId: req.user!.userId,
        role: 'user',
        content: message,
      });

      let assistantContent = generateFallbackResponse(message, actionType);

      if (config.openai.apiKey) {
        try {
          assistantContent = await generateAIResponse(String(familyId), message, actionType);
        } catch (error) {
          logger.warn('AI assistant failed, using fallback', {
            error: error instanceof Error ? error.message : 'Unknown',
          });
        }
      }

      const assistantMessage = await AssistantMessage.create({
        familyId,
        userId: req.user!.userId,
        role: 'assistant',
        content: assistantContent,
        actionType,
      });

      res.json({ success: true, data: toApiDoc(assistantMessage) });
    } catch (error) {
      next(error);
    }
  }
);

function generateFallbackResponse(message: string, actionType?: string): string {
  const responses: Record<string, string> = {
    weekly_summary: "This week, your family shared wonderful moments together. Keep capturing those daily photos to build your streak!",
    birthday_message: "Wishing you a day filled with love, laughter, and beautiful memories with the people who matter most. Happy Birthday! 🎂",
    weekend_ideas: "How about a family picnic at a nearby park, a movie night with everyone's favorite snacks, or a photo walk during golden hour?",
    travel_itinerary: "I'd love to help plan your trip! Tell me your destination, dates, and who's traveling, and I'll create a personalized itinerary.",
    gift_ideas: "Thoughtful gifts come from the heart. Consider a photo book of family memories, a personalized playlist, or an experience you can share together.",
    conversation_starters: "Try asking: 'What's the best thing that happened to you this week?' or 'If we could teleport anywhere for dinner, where would we go?'",
  };

  return responses[actionType ?? ''] ?? `I'm here to help your family stay connected! You asked: "${message}". How can I assist you further?`;
}

async function generateAIResponse(
  familyId: string,
  message: string,
  actionType?: string
): Promise<string> {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  const family = await Family.findById(familyId);
  const familyName = family?.name ?? 'your family';

  const systemPrompt = `You are a warm, helpful family concierge for "${familyName}". 
You help families stay connected, plan activities, create memories, and celebrate milestones.
Be concise, warm, and actionable. Never be robotic. Feel like a caring family friend.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: actionType ? `[Action: ${actionType}] ${message}` : message },
    ],
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content ?? generateFallbackResponse(message, actionType);
}

export default router;
