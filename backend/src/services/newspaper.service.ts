import {
  Family,
  FamilyMember,
  User,
  Post,
  Event,
  Newspaper,
} from '../models';
import { config } from '../config';
import { logger } from '../utils/logger';
import { toApiDoc, startOfDay, endOfDay } from '../utils/transform';

interface NewspaperSection {
  type: string;
  title: string;
  content: string;
  imageUrl?: string;
}

export async function generateNewspaper(familyId: string): Promise<Record<string, unknown>> {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [family, memberships, recentPosts, upcomingEvents] = await Promise.all([
    Family.findById(familyId),
    FamilyMember.find({ familyId }).populate<{ userId: InstanceType<typeof User> }>('userId'),
    Post.find({ familyId, createdAt: { $gte: dayAgo } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate<{ authorId: InstanceType<typeof User> }>('authorId'),
    Event.find({ familyId, startTime: { $gte: new Date(), $lte: weekFromNow } })
      .sort({ startTime: 1 })
      .limit(5),
  ]);

  const members = memberships.map((m) => m.userId).filter(Boolean);
  const now = new Date();
  const birthdays = members.filter((u) => {
    if (!u.birthday) return false;
    const bday = new Date(u.birthday);
    return bday.getMonth() === now.getMonth() && bday.getDate() === now.getDate();
  });

  const sections: NewspaperSection[] = [
    {
      type: 'top_story',
      title: 'Top Story',
      content: recentPosts.length > 0
        ? `${(recentPosts[0].authorId as InstanceType<typeof User>).displayName} shared ${recentPosts.length} new memories today!`
        : 'A quiet day in the family — perfect for creating new memories.',
      imageUrl: recentPosts[0]?.mediaUrls[0],
    },
    {
      type: 'family_wins',
      title: 'Family Wins',
      content: members
        .filter((m) => m.photoStreak >= 7)
        .map((m) => `${m.displayName} is on a ${m.photoStreak}-day photo streak! 🔥`)
        .join(' ') || 'Start your photo streak today!',
    },
    {
      type: 'birthdays',
      title: "Today's Birthdays",
      content: birthdays.length > 0
        ? birthdays.map((b) => `🎂 Happy Birthday, ${b.displayName}!`).join(' ')
        : 'No birthdays today — but every day is worth celebrating!',
    },
    {
      type: 'upcoming_events',
      title: 'Upcoming Events',
      content: upcomingEvents.length > 0
        ? upcomingEvents.map((e) =>
            `📅 ${e.title} — ${e.startTime.toLocaleDateString()}`
          ).join('\n')
        : 'No upcoming events this week.',
    },
    {
      type: 'weekly_stats',
      title: 'Weekly Statistics',
      content: `👨‍👩‍👧‍👦 ${members.length} family members • 📸 ${recentPosts.length} photos today • 🔥 ${family?.familyStreak ?? 0}-day family streak`,
    },
    {
      type: 'photo_of_day',
      title: 'Photo of the Day',
      content: recentPosts.length > 0 ? "Captured by the family today" : "Upload today's memories!",
      imageUrl: recentPosts[Math.floor(Math.random() * recentPosts.length)]?.mediaUrls[0],
    },
  ];

  if (config.openai.apiKey) {
    try {
      const aiSections = await generateAISections(family, members, recentPosts, upcomingEvents);
      if (aiSections.length > 0) {
        sections.push(...aiSections);
      }
    } catch (error) {
      logger.warn('AI newspaper generation failed, using template', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  const title = family?.newspaperName ?? `${family?.name ?? 'Family'} Times`;

  const newspaper = await Newspaper.findOneAndUpdate(
    { familyId, editionDate: { $gte: todayStart, $lte: todayEnd } },
    { familyId, editionDate: todayStart, title, sections },
    { upsert: true, new: true }
  );

  return toApiDoc(newspaper)!;
}

async function generateAISections(
  family: InstanceType<typeof Family> | null,
  members: InstanceType<typeof User>[],
  posts: Awaited<ReturnType<typeof Post.find>>,
  events: InstanceType<typeof Event>[]
): Promise<NewspaperSection[]> {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  const prompt = `Generate 2 brief, warm newspaper sections for "${family?.newspaperName}" family newspaper.
Family: ${members.map((m) => m.displayName).join(', ')}
Recent activity: ${posts.length} posts today
Upcoming: ${events.map((e) => e.title).join(', ') || 'none'}

Return JSON with a "sections" array of objects: { "type": "funny_moments"|"memory_flashback", "title": string, "content": string }`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content) as { sections?: NewspaperSection[] };
  return parsed.sections ?? [];
}
