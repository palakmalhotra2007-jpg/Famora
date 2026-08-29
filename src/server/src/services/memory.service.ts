import { Memory, Post, User } from '../models';
import { config } from '../config';
import { logger } from '../utils/logger';
import { toApiDoc } from '../utils/transform';

export async function searchMemories(
  familyId: string,
  searchQuery: string
): Promise<Record<string, unknown>[]> {
  const regex = new RegExp(searchQuery, 'i');

  const memories = await Memory.find({
    familyId,
    $or: [
      { title: regex },
      { description: regex },
      { category: regex },
      { locationName: regex },
    ],
  })
    .sort({ startDate: -1, createdAt: -1 })
    .limit(20);

  if (memories.length > 0) {
    return memories.map((m) => toApiDoc(m)!);
  }

  if (config.openai.apiKey) {
    try {
      return await aiSearchMemories(familyId, searchQuery);
    } catch (error) {
      logger.warn('AI memory search failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  const posts = await Post.find({
    familyId,
    $or: [{ caption: regex }, { locationName: regex }, { aiTags: regex }],
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate<{ authorId: InstanceType<typeof User> }>('authorId');

  return posts.map((post) => ({
    id: post.id,
    title: post.caption ?? post.locationName ?? 'Memory',
    category: 'search_result',
    coverUrl: post.mediaUrls[0],
    startDate: post.get('createdAt') as Date,
    authorName: post.authorId.displayName,
  }));
}

async function aiSearchMemories(
  familyId: string,
  searchQuery: string
): Promise<Record<string, unknown>[]> {
  const memories = await Memory.find({ familyId }).select(
    'title description category locationName aiSummary'
  );

  if (memories.length === 0) return [];

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  const memoryList = memories
    .map((m) => `[${m.id}] ${m.title} (${m.category}) - ${m.description ?? ''}`)
    .join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Given these family memories:\n${memoryList}\n\nWhich memory IDs match the query: "${searchQuery}"? Return JSON: { "ids": ["id1", "id2"] }`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content) as { ids?: string[] };
  const ids = parsed.ids ?? [];

  return memories
    .filter((m) => ids.includes(m.id))
    .map((m) => toApiDoc(m)!);
}
