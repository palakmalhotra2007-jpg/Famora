import { config } from '../config';
import { logger } from '../utils/logger';
import { Family, VoiceNote, FamilyMember, User, PodcastEpisode } from '../models';
import { startOfWeek } from '../utils/transform';

interface VoiceNoteDoc {
  authorName: string;
  caption?: string;
  transcript?: string;
  durationSec: number;
}

export async function buildPodcastScript(
  familyName: string,
  notes: VoiceNoteDoc[]
): Promise<string> {
  if (notes.length === 0) {
    return `Welcome to This Week in ${familyName}. No voice notes were shared yet — record yours to be part of next week's episode.`;
  }

  const snippets = notes
    .map((n) => {
      const text = n.transcript || n.caption || `shared a ${n.durationSec}-second update`;
      return `${n.authorName}: ${text}`;
    })
    .join('\n');

  if (!config.openai.apiKey) {
    return [
      `Welcome to This Week in ${familyName}.`,
      `Here is what everyone shared in their voice notes this week:`,
      snippets,
      `That wraps up this week's family podcast. Keep recording your voice notes so we can include you next time.`,
    ].join('\n\n');
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: config.openai.apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You write warm, concise family podcast scripts (300-500 words). Combine voice note summaries into a single narrator script titled "This Week in [Family Name]". No stage directions.',
        },
        {
          role: 'user',
          content: `Family: ${familyName}\nVoice notes:\n${snippets}`,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || [
      `Welcome to This Week in ${familyName}.`,
      snippets,
      `Thanks for listening to your family podcast.`,
    ].join('\n\n');
  } catch (error) {
    logger.warn('Podcast AI generation failed, using fallback', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return [
      `Welcome to This Week in ${familyName}.`,
      snippets,
      `Thanks for listening to your family podcast.`,
    ].join('\n\n');
  }
}

export async function getWeekVoiceStatus(familyId: string) {
  const weekStart = startOfWeek();
  const memberships = await FamilyMember.find({ familyId }).populate<{ userId: InstanceType<typeof User> }>(
    'userId'
  );
  const notes = await VoiceNote.find({ familyId, weekStart });

  const noteByUser = new Map(notes.map((n) => [n.authorId.toString(), n]));

  const members = memberships.map((m) => {
    const note = noteByUser.get(m.userId.id);
    return {
      userId: m.userId.id,
      displayName: m.userId.displayName,
      avatarUrl: m.userId.avatarUrl,
      hasVoiceNote: !!note,
      voiceNoteId: note ? String(note._id) : null,
    };
  });

  return {
    weekStart: weekStart.toISOString(),
    members,
    submittedCount: notes.length,
    totalMembers: memberships.length,
    allSubmitted: notes.length >= memberships.length && memberships.length > 0,
  };
}

export async function generateWeeklyEpisode(familyId: string, userId: string) {
  const weekStart = startOfWeek();
  const family = await Family.findById(familyId);
  if (!family) throw new Error('Family not found');

  const notes = await VoiceNote.find({ familyId, weekStart })
    .sort({ createdAt: 1 })
    .populate<{ authorId: InstanceType<typeof User> }>('authorId');

  if (notes.length === 0) {
    throw new Error('At least one voice note is required to generate the podcast');
  }

  const script = await buildPodcastScript(
    family.name,
    notes.map((n) => ({
      authorName: n.authorId.displayName,
      caption: n.caption,
      transcript: n.transcript,
      durationSec: n.durationSec,
    }))
  );

  const title = `This Week in ${family.name}`;
  const voiceNoteIds = notes.map((n) => n._id);

  const episode = await PodcastEpisode.findOneAndUpdate(
    { familyId, weekStart },
    {
      familyId,
      weekStart,
      title,
      script,
      voiceNoteIds,
      generatedBy: userId,
    },
    { upsert: true, new: true }
  );

  return episode;
}
