import fs from 'fs';
import path from 'path';
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

import { translateText } from '../utils/translate';

export async function translateNewspaper(
  newspaperDoc: Record<string, any>,
  targetLang: string
): Promise<Record<string, unknown>> {
  if (targetLang.toLowerCase() === 'en' || targetLang.toLowerCase() === 'english') {
    return newspaperDoc;
  }

  try {
    const translatedDoc = { ...newspaperDoc };
    
    // Translate Title
    if (newspaperDoc.title) {
      translatedDoc.title = await translateText(newspaperDoc.title, targetLang);
    }
    
    // Translate Sections
    if (Array.isArray(newspaperDoc.sections)) {
      translatedDoc.sections = await Promise.all(newspaperDoc.sections.map(async (s: NewspaperSection) => ({
        ...s,
        title: await translateText(s.title, targetLang),
        content: await translateText(s.content, targetLang),
      })));
    }
    
    return translatedDoc;
  } catch (error) {
    logger.error('Failed to translate newspaper', { error });
  }

  // Fallback to original if translation fails
  return newspaperDoc;
}

function chunkTextForTTS(text: string, maxLength: number = 180): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if ((currentChunk + ' ' + trimmed).trim().length <= maxLength) {
      currentChunk = (currentChunk + ' ' + trimmed).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (trimmed.length > maxLength) {
        const words = trimmed.split(/\s+/);
        let temp = '';
        for (const w of words) {
          if ((temp + ' ' + w).trim().length <= maxLength) {
            temp = (temp + ' ' + w).trim();
          } else {
            if (temp) chunks.push(temp);
            temp = w;
          }
        }
        currentChunk = temp;
      } else {
        currentChunk = trimmed;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

async function fetchGoogleTTS(text: string, lang: string): Promise<Buffer> {
  const chunks = chunkTextForTTS(text, 180);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
      lang
    )}&client=tw-ob&q=${encodeURIComponent(chunk)}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      buffers.push(Buffer.from(arrayBuf));
    }
  }

  return Buffer.concat(buffers);
}

export async function getNewspaperAudio(
  familyId: string,
  newspaperId: string,
  lang?: string
): Promise<{ url: string; isDemo: boolean }> {
  const newspaper = await Newspaper.findOne({ _id: newspaperId, familyId });
  if (!newspaper) {
    throw new Error('Newspaper not found');
  }

  const cleanLang = (lang || 'en').trim().toLowerCase();
  const filename = `newspaper-${newspaperId}-${cleanLang}.mp3`;
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const filePath = path.join(uploadsDir, filename);

  // 1. Check if cached audio exists
  if (fs.existsSync(filePath)) {
    return { url: `/uploads/${filename}`, isDemo: false };
  }

  // 2. Translate newspaper content to the target language if not English
  let translatedNewspaper = toApiDoc(newspaper)!;
  if (cleanLang !== 'en' && cleanLang !== 'english') {
    translatedNewspaper = await translateNewspaper(translatedNewspaper, cleanLang);
  }

  // 3. Construct text script to synthesize purely in the target language
  const sections = (translatedNewspaper.sections as NewspaperSection[]) ?? [];
  const parts: string[] = [];
  if (translatedNewspaper.title) {
    parts.push(String(translatedNewspaper.title));
  }
  for (const section of sections) {
    if (section.title && section.content) {
      parts.push(`${section.title}. ${section.content}`);
    } else if (section.content) {
      parts.push(section.content);
    }
  }
  const textToRead = parts.join('\n\n');

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 4. Try OpenAI TTS first
  if (config.openai.apiKey) {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: config.openai.apiKey });

      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: textToRead.slice(0, 4096),
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);
      return { url: `/uploads/${filename}`, isDemo: false };
    } catch (error) {
      logger.error('OpenAI TTS generation failed, trying Google TTS fallback', { error });
    }
  }

  // 5. Try Google TTS fallback in the exact native language (Hindi, Spanish, French, etc.)
  try {
    const buffer = await fetchGoogleTTS(textToRead, cleanLang);
    if (buffer.length > 0) {
      await fs.promises.writeFile(filePath, buffer);
      return { url: `/uploads/${filename}`, isDemo: false };
    }
  } catch (error) {
    logger.error('Google TTS fallback failed', { error });
  }

  // 6. Last resort demo fallback
  return {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isDemo: true,
  };
}
