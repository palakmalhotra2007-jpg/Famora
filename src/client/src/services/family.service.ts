/**
 * Family data service.
 *
 * Every function talks directly to Supabase — no Express backend.
 * Grouped by domain: Media → Dashboard → Posts → Stories → Memories
 * → Events → Newspaper → Daily challenge → Bucket list → Games
 * → Achievements → Assistant → Locations → Mailbox → Wall → Podcast
 */
import { supabase } from '../lib/supabase';
import { dbInsert, dbInsertMany, dbUpdate, dbUpsert } from '../lib/db';
import type {
  HomeDashboard, Post, PostComment, Memory, Event, Story,
  DailyChallenge, BucketListItem, FamilyLocationsResponse, MemberLocationEntry,
  MailboxResponse, MailboxLetter, MailboxOpenCondition,
  WallEntry, WallTimelineDay, VoiceNote, PodcastWeekStatus, PodcastEpisode,
  FamilyMember,
} from '../types';
import type { GameSession, SkillGameConfig } from '../games/types';
import type { FamilyAuraId } from '../constants/aura';

// â”€â”€ Media URL helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const bucket = path.startsWith('audio/') ? 'audio'
    : path.startsWith('avatars/') ? 'avatars' : 'media';
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

async function uid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

function getWeekStart(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

// â”€â”€ Upload helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function uploadImage(uri: string): Promise<string> {
  const userId   = await uid();
  const filename = `${Date.now()}_${uri.split('/').pop()?.split('?')[0] ?? 'photo.jpg'}`;
  const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  // On web, expo-image-picker returns a blob: URL — fetch() handles it fine.
  // On native it returns a file:// path — also handled by fetch().
  // If fetch fails for any reason we surface the real message.
  let blob: Blob;
  try {
    const res = await fetch(uri);
    blob = await res.blob();
  } catch (e) {
    throw new Error(`Cannot read image: ${e instanceof Error ? e.message : String(e)}`);
  }

  const storagePath = `${userId}/${filename}`;
  const { error } = await supabase.storage
    .from('media')
    .upload(storagePath, blob, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return supabase.storage.from('media').getPublicUrl(storagePath).data.publicUrl;
}

export async function uploadAudio(uri: string): Promise<string> {
  const userId   = await uid();
  const filename = uri.split('/').pop()?.split('?')[0] ?? 'voice.m4a';
  const ext      = filename.split('.').pop()?.toLowerCase();
  const contentType = ext === 'webm' ? 'audio/webm' : ext === 'wav' ? 'audio/wav'
    : ext === 'mp3' ? 'audio/mpeg' : 'audio/m4a';

  let blob: Blob;
  try {
    const res = await fetch(uri);
    blob = await res.blob();
  } catch (e) {
    throw new Error(`Cannot read audio: ${e instanceof Error ? e.message : String(e)}`);
  }

  const storagePath = `${userId}/${Date.now()}_${filename}`;
  const { error } = await supabase.storage
    .from('audio')
    .upload(storagePath, blob, { contentType, upsert: true });
  if (error) throw new Error(`Audio upload failed: ${error.message}`);
  return supabase.storage.from('audio').getPublicUrl(storagePath).data.publicUrl;
}

// â”€â”€ Home Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchHomeDashboard(familyId: string): Promise<HomeDashboard> {
  const userId   = await uid();
  const now      = new Date();
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();
  const todayDate   = now.toISOString().slice(0, 10);

  const [fRes, mRes, evRes, postRes, npRes, chalRes, nextEvRes, locRes] = await Promise.all([
    supabase.from('families').select('*').eq('id', familyId).single(),
    supabase.from('family_members').select('role, nickname, users(*)').eq('family_id', familyId),
    supabase.from('events').select('*').eq('family_id', familyId)
      .gte('start_time', todayStart).lte('start_time', tomorrowEnd)
      .order('start_time', { ascending: true }).limit(5),
    supabase.from('posts')
      .select('*, users!posts_author_id_fkey(display_name, avatar_url)')
      .eq('family_id', familyId).order('created_at', { ascending: false }).limit(6),
    supabase.from('newspapers').select('*').eq('family_id', familyId)
      .eq('edition_date', todayDate).maybeSingle(),
    supabase.from('daily_challenges').select('*').eq('family_id', familyId)
      .eq('challenge_date', todayDate).maybeSingle(),
    supabase.from('events').select('*').eq('family_id', familyId)
      .gt('start_time', now.toISOString()).order('start_time', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('member_locations').select('*').eq('family_id', familyId),
  ]);

  if (fRes.error) throw new Error(fRes.error.message);

  const fam = fRes.data as Record<string, unknown>;
  type MRow = { role: string; nickname: string | null; users: Record<string, unknown> };
  const memberships = (mRes.data ?? []) as unknown as MRow[];
  const locMap = new Map((locRes.data ?? []).map((l) => {
    const r = l as Record<string, unknown>;
    return [String(r.user_id), r];
  }));

  const members: FamilyMember[] = memberships.map((m) => {
    const u   = m.users;
    const loc = locMap.get(String(u.id));
    const sharing = Boolean(loc?.sharing_enabled) && loc?.latitude != null;
    return {
      id: String(u.id), displayName: String(u.display_name ?? 'User'),
      avatarUrl: resolveMediaUrl(u.avatar_url as string | undefined),
      photoStreak: Number(u.photo_streak ?? 0),
      nickname: m.nickname ?? undefined, role: m.role,
      aura: (u.aura as FamilyAuraId | null) ?? null,
      location: sharing ? {
        latitude: Number(loc!.latitude), longitude: Number(loc!.longitude),
        locationName: (loc!.location_name as string) ?? null,
        updatedAt: (loc!.updated_at as string) ?? null,
      } : null,
    };
  });

  const day = now.getDate();
  const upcomingBirthdays = memberships.map((m) => m.users).filter((u) => {
    if (!u.birthday) return false;
    const bday = new Date(u.birthday as string);
    return bday.getMonth() === now.getMonth() && bday.getDate() >= day && bday.getDate() <= day + 7;
  }).map((u) => ({
    displayName: String(u.display_name),
    birthday: u.birthday as string | undefined,
    avatarUrl: resolveMediaUrl(u.avatar_url as string | undefined),
  }));

  const recentPosts: Post[] = (postRes.data ?? []).map((p) => {
    const r = p as Record<string, unknown>;
    const a = (r.users ?? {}) as Record<string, unknown>;
    return {
      id: String(r.id), authorId: String(r.author_id),
      authorName: String(a.display_name ?? 'Member'),
      authorAvatar: resolveMediaUrl(a.avatar_url as string | undefined),
      caption: r.caption as string | undefined,
      mediaUrls: ((r.media_urls as string[]) ?? []).map((u) => resolveMediaUrl(u) ?? u),
      mediaType: (r.media_type as 'photo' | 'video') ?? 'photo',
      reactions: [], commentCount: 0, createdAt: String(r.created_at),
    };
  });

  let challengeProgress = null;
  if (chalRes.data) {
    const ch = chalRes.data as Record<string, unknown>;
    const { data: ups } = await supabase.from('daily_uploads').select('user_id').eq('challenge_id', String(ch.id));
    const counts = new Map<string, number>();
    (ups ?? []).forEach((u) => { const k = (u as { user_id: string }).user_id; counts.set(k, (counts.get(k) ?? 0) + 1); });
    challengeProgress = { id: String(ch.id), membersCompleted: [...counts.values()].filter((c) => c >= 1).length, totalMembers: memberships.length };
  }

  const todayEvents: Event[] = (evRes.data ?? []).map((e) => {
    const r = e as Record<string, unknown>;
    return { id: String(r.id), title: String(r.title), description: r.description as string | undefined, eventType: String(r.event_type), startTime: String(r.start_time), endTime: r.end_time as string | undefined, location: r.location as string | undefined };
  });

  const newspaper = npRes.data ? (() => {
    const r = npRes.data as Record<string, unknown>;
    return { id: String(r.id), title: String(r.title), editionDate: String(r.edition_date), sections: (r.sections as never[]) ?? [], coverImageUrl: r.cover_image_url as string | undefined };
  })() : null;

  const nextEvent = nextEvRes.data ? (() => {
    const r = nextEvRes.data as Record<string, unknown>;
    return { id: String(r.id), title: String(r.title), eventType: String(r.event_type), startTime: String(r.start_time) };
  })() : null;

  return {
    family: { id: String(fam.id), name: String(fam.name), newspaperName: String(fam.newspaper_name ?? fam.name), inviteCode: String(fam.invite_code), familyStreak: Number(fam.family_streak ?? 0) },
    members, todayEvents, upcomingBirthdays, recentPosts, newspaper, nextEvent,
    familyStreak: Number(fam.family_streak ?? 0), challengeProgress,
  };
}

// â”€â”€ Posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchPosts(familyId: string, page = 1): Promise<{ data: Post[]; total: number }> {
  const limit = 20, from = (page - 1) * limit;
  const { data, error, count } = await supabase.from('posts')
    .select('*, users!posts_author_id_fkey(display_name, avatar_url), post_reactions(*), post_comments(*, users!post_comments_user_id_fkey(display_name, avatar_url))', { count: 'exact' })
    .eq('family_id', familyId).order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) throw new Error(error.message);

  const posts: Post[] = (data ?? []).map((p) => {
    const r = p as Record<string, unknown>;
    const a = (r.users ?? {}) as Record<string, unknown>;
    const rxns = (r.post_reactions ?? []) as Array<{ user_id: string; reaction_type: string }>;
    const cmts = (r.post_comments ?? []) as Array<Record<string, unknown>>;
    return {
      id: String(r.id), authorId: String(r.author_id),
      authorName: String(a.display_name ?? 'Member'),
      authorAvatar: resolveMediaUrl(a.avatar_url as string | undefined),
      caption: r.caption as string | undefined,
      mediaUrls: ((r.media_urls as string[]) ?? []).map((u) => resolveMediaUrl(u) ?? u),
      mediaType: (r.media_type as 'photo' | 'video') ?? 'photo',
      reactions: rxns.map((rx) => ({ type: rx.reaction_type as never, userId: rx.user_id })),
      comments: cmts.map((c) => {
        const ca = (c.users ?? {}) as Record<string, unknown>;
        return { id: String(c.id), userId: String(c.user_id), userName: String(ca.display_name ?? 'Member'), userAvatar: resolveMediaUrl(ca.avatar_url as string | undefined), text: String(c.text), createdAt: String(c.created_at) };
      }),
      commentCount: cmts.length, locationName: r.location_name as string | undefined, createdAt: String(r.created_at), aiTags: (r.ai_tags as string[]) ?? [],
    };
  });
  return { data: posts, total: count ?? posts.length };
}

export async function createPost(familyId: string, payload: { caption?: string; mediaUrls: string[]; mediaType?: 'photo' | 'video' }): Promise<Post> {
  const userId = await uid();
  const { data, error } = await dbInsert('posts', { family_id: familyId, author_id: userId, caption: payload.caption ?? null, media_urls: payload.mediaUrls, media_type: payload.mediaType ?? 'photo' });
  if (error || !data) throw new Error(error?.message ?? 'Failed to create post');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), authorId: userId, authorName: 'You', mediaUrls: (r.media_urls as string[]) ?? [], mediaType: (r.media_type as 'photo' | 'video') ?? 'photo', caption: r.caption as string | undefined, reactions: [], commentCount: 0, createdAt: String(r.created_at) };
}

export async function addPostComment(_familyId: string, postId: string, text: string): Promise<PostComment> {
  const userId = await uid();
  const { data, error } = await dbInsert('post_comments', { post_id: postId, user_id: userId, text });
  if (error || !data) throw new Error(error?.message ?? 'Failed to add comment');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), userId, userName: 'You', text: String(r.text), createdAt: String(r.created_at) };
}

export async function reactToPost(_familyId: string, postId: string, reactionType: string): Promise<void> {
  const userId = await uid();
  await dbUpsert('post_reactions', { post_id: postId, user_id: userId, reaction_type: reactionType }, { onConflict: 'post_id,user_id' });
}

// â”€â”€ Stories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchStories(familyId: string): Promise<Story[]> {
  const { data, error } = await supabase.from('stories')
    .select('*, users!stories_author_id_fkey(display_name, avatar_url)')
    .eq('family_id', familyId).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => {
    const r = s as Record<string, unknown>;
    const a = (r.users ?? {}) as Record<string, unknown>;
    return { id: String(r.id), authorId: String(r.author_id), authorName: String(a.display_name ?? 'Member'), authorAvatar: resolveMediaUrl(a.avatar_url as string | undefined), mediaUrl: resolveMediaUrl(r.media_url as string) ?? String(r.media_url), mediaType: (r.media_type as 'photo' | 'video') ?? 'photo', expiresAt: String(r.expires_at) };
  });
}

// â”€â”€ Memories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchMemories(familyId: string): Promise<Memory[]> {
  const { data, error } = await supabase.from('memories').select('*').eq('family_id', familyId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => {
    const r = m as Record<string, unknown>;
    return { id: String(r.id), title: String(r.title), description: r.description as string | undefined, category: String(r.category ?? 'general'), coverUrl: resolveMediaUrl(r.cover_url as string | undefined), startDate: r.start_date as string | undefined, locationName: r.location_name as string | undefined };
  });
}

// â”€â”€ Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mapEv(row: Record<string, unknown>): Event {
  const c = (row.users ?? {}) as Record<string, unknown>;
  return { id: String(row.id), title: String(row.title), description: row.description as string | undefined, eventType: String(row.event_type), startTime: String(row.start_time), endTime: row.end_time as string | undefined, location: row.location as string | undefined, createdByName: c.display_name as string | undefined };
}

export async function fetchEvents(familyId: string): Promise<Event[]> {
  const { data, error } = await supabase.from('events').select('*, users!events_created_by_fkey(display_name)').eq('family_id', familyId).order('start_time', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => mapEv(e as Record<string, unknown>));
}

export async function fetchEventsInRange(familyId: string, from: Date, to: Date): Promise<Event[]> {
  const { data, error } = await supabase.from('events').select('*, users!events_created_by_fkey(display_name)').eq('family_id', familyId).gte('start_time', from.toISOString()).lte('start_time', to.toISOString()).order('start_time', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => mapEv(e as Record<string, unknown>));
}

export async function createFamilyEvent(familyId: string, payload: { title: string; eventType: string; startTime: string; endTime?: string; location?: string; description?: string }): Promise<Event> {
  const userId = await uid();
  const { data, error } = await dbInsert('events', { family_id: familyId, created_by: userId, title: payload.title, event_type: payload.eventType, start_time: payload.startTime, end_time: payload.endTime ?? null, location: payload.location ?? null, description: payload.description ?? null });
  if (error || !data) throw new Error(error?.message ?? 'Failed to create event');
  return mapEv(data as Record<string, unknown>);
}

export async function rsvpToEvent(_familyId: string, eventId: string, status: 'going' | 'maybe' | 'declined'): Promise<void> {
  const userId = await uid();
  await dbUpsert('event_rsvps', { event_id: eventId, user_id: userId, status }, { onConflict: 'event_id,user_id' });
}

export async function deleteFamilyEvent(_familyId: string, eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw new Error(error.message);
}

// â”€â”€ Newspaper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchNewspaper(familyId: string, _lang?: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('newspapers').select('*').eq('family_id', familyId).eq('edition_date', new Date().toISOString().slice(0, 10)).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function fetchNewspaperAudio(_fId: string, _nId: string, _lang?: string): Promise<{ url: string; isDemo: boolean }> {
  return { url: '', isDemo: true };
}

// â”€â”€ Daily Challenge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchDailyChallenge(familyId: string): Promise<DailyChallenge> {
  const today  = new Date().toISOString().slice(0, 10);
  const userId = await uid();

  let { data: ch } = await supabase.from('daily_challenges').select('*').eq('family_id', familyId).eq('challenge_date', today).maybeSingle();
  if (!ch) {
    const { data: nc } = await dbInsert('daily_challenges', { family_id: familyId, challenge_date: today, prompts: ['Share a morning moment', 'Something that made you smile', 'A photo of where you are'] });
    ch = nc;
  }
  if (!ch) return { id: 'no-challenge', challengeDate: today, prompts: ['Share a moment from today'], uploads: [], members: [], progress: { membersCompleted: 0, totalMembers: 0, userUploads: 0 } };

  const r = ch as Record<string, unknown>;
  const [upRes, mRes] = await Promise.all([
    supabase.from('daily_uploads').select('*, users!daily_uploads_user_id_fkey(display_name, avatar_url)').eq('challenge_id', String(r.id)),
    supabase.from('family_members').select('users!family_members_user_id_fkey(id, display_name, avatar_url)').eq('family_id', familyId),
  ]);

  const uploads = (upRes.data ?? []).map((u) => {
    const ur = u as Record<string, unknown>;
    const a  = (ur.users ?? {}) as Record<string, unknown>;
    return { id: String(ur.id), userId: String(ur.user_id), displayName: String(a.display_name ?? 'Member'), avatarUrl: resolveMediaUrl(a.avatar_url as string | undefined), mediaUrl: resolveMediaUrl(ur.media_url as string) ?? String(ur.media_url), promptLabel: ur.prompt_label as string | undefined };
  });
  const members = (mRes.data ?? []).map((m) => {
    const u = (m as unknown as { users: Record<string, unknown> }).users;
    return { id: String(u.id), displayName: String(u.display_name ?? 'Member'), avatarUrl: resolveMediaUrl(u.avatar_url as string | undefined), uploadCount: uploads.filter((up) => up.userId === String(u.id)).length };
  });

  return { id: String(r.id), challengeDate: String(r.challenge_date), prompts: (r.prompts as string[]) ?? [], uploads, members, progress: { membersCompleted: members.filter((m) => m.uploadCount > 0).length, totalMembers: members.length, userUploads: uploads.filter((u) => u.userId === userId).length } };
}

export async function submitChallengeUpload(familyId: string, mediaUrl: string, promptLabel?: string): Promise<void> {
  const userId = await uid();
  const today  = new Date().toISOString().slice(0, 10);
  const { data: ch } = await supabase.from('daily_challenges').select('id').eq('family_id', familyId).eq('challenge_date', today).single();
  if (!ch) throw new Error('No challenge found for today');
  const { error } = await dbInsertMany('daily_uploads', [{ challenge_id: (ch as { id: string }).id, user_id: userId, media_url: mediaUrl, prompt_label: promptLabel ?? null }]);
  if (error) throw new Error(error.message);
}

// â”€â”€ Bucket List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchBucketList(familyId: string): Promise<BucketListItem[]> {
  const { data, error } = await supabase.from('bucket_list_items').select('*').eq('family_id', familyId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => {
    const r = item as Record<string, unknown>;
    return { id: String(r.id), title: String(r.title), description: r.description as string | undefined, category: r.category as string | undefined, isCompleted: Boolean(r.is_completed), completedAt: r.completed_at as string | undefined };
  });
}

export async function createBucketItem(familyId: string, payload: string | { title: string; description?: string }, desc?: string): Promise<BucketListItem> {
  const userId = await uid();
  const title  = typeof payload === 'string' ? payload : payload.title;
  const description = (typeof payload === 'string' ? desc : payload.description) ?? null;
  const { data, error } = await dbInsert('bucket_list_items', { family_id: familyId, created_by: userId, title, description });
  if (error || !data) throw new Error(error?.message ?? 'Failed to create item');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), title: String(r.title), description: r.description as string | undefined, isCompleted: false };
}

export async function completeBucketItem(familyId: string, itemId: string): Promise<BucketListItem> {
  const { data, error } = await dbUpdate('bucket_list_items', { is_completed: true, completed_at: new Date().toISOString() }, { id: itemId });
  if (error || !data) throw new Error(error?.message ?? 'Failed to complete item');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), title: String(r.title), isCompleted: true, completedAt: r.completed_at as string | undefined };
}

// â”€â”€ Games â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchGameTypes(): Promise<string[]> {
  return ['tap_sprint', 'reaction_rush', 'typing_speed', 'quick_math', 'memory_flash', 'balloon_blitz'];
}

function rowToSession(row: Record<string, unknown>): GameSession {
  const scores = (row.scores as Record<string, number>) ?? {};
  const cfg    = (row.config as Partial<SkillGameConfig>) ?? {};
  const [, topScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const winner = (row.users ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id), gameType: String(row.game_type), status: String(row.status),
    config: { mode: (cfg.mode ?? 'tap_sprint') as SkillGameConfig['mode'], shared: cfg.shared ?? true, ...cfg },
    scores,
    leaderName: (winner.display_name as string | undefined) ?? null,
    leaderScore: topScore ?? null,
  };
}

export async function fetchGameSessions(familyId: string): Promise<GameSession[]> {
  const { data, error } = await supabase.from('game_sessions')
    .select('*, users!game_sessions_winner_id_fkey(display_name)')
    .eq('family_id', familyId).in('status', ['waiting', 'active']).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => rowToSession(s as Record<string, unknown>));
}

export async function fetchGameSession(_familyId: string, sessionId: string): Promise<GameSession> {
  const { data, error } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
  if (error || !data) throw new Error(error?.message ?? 'Session not found');
  return rowToSession(data as Record<string, unknown>);
}

export async function joinFamilyChallenge(familyId: string, gameType: string): Promise<GameSession> {
  const userId = await uid();
  const { data: existing } = await supabase.from('game_sessions').select('*').eq('family_id', familyId).eq('game_type', gameType).eq('status', 'active').maybeSingle();
  if (existing) return rowToSession(existing as Record<string, unknown>);

  const config: SkillGameConfig = { mode: gameType as SkillGameConfig['mode'], shared: true };
  const { data, error } = await dbInsert('game_sessions', {
    family_id: familyId, game_type: gameType, status: 'active',
    config: config as unknown as import('../lib/database.types').Json,
    scores: { [userId]: 0 } as unknown as import('../lib/database.types').Json,
    started_at: new Date().toISOString(),
  });
  if (error || !data) throw new Error(error?.message ?? 'Failed to start game');
  return rowToSession(data as Record<string, unknown>);
}

export const startGameSession = joinFamilyChallenge;

export async function submitGameScore(_familyId: string, sessionId: string, score: number): Promise<GameSession> {
  const userId = await uid();
  const { data: cur, error: fetchErr } = await supabase.from('game_sessions').select('scores').eq('id', sessionId).single();
  if (fetchErr || !cur) throw new Error(fetchErr?.message ?? 'Session not found');
  const prev    = ((cur as Record<string, unknown>).scores as Record<string, number>) ?? {};
  const updated = { ...prev, [userId]: Math.max(score, prev[userId] ?? 0) };
  const { data, error } = await dbUpdate('game_sessions', {
    scores: updated as unknown as import('../lib/database.types').Json,
    status: 'completed', ended_at: new Date().toISOString(),
  }, { id: sessionId });
  if (error || !data) throw new Error(error?.message ?? 'Failed to submit score');
  return rowToSession(data as Record<string, unknown>);
}

// â”€â”€ Achievements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchAchievements(familyId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from('achievements').select('*').eq('family_id', familyId).order('earned_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

// â”€â”€ Assistant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchAssistantHistory(familyId: string): Promise<Array<{ role: string; content: string }>> {
  const userId = await uid();
  const { data, error } = await supabase.from('assistant_messages').select('role, content').eq('family_id', familyId).eq('user_id', userId).order('created_at', { ascending: true }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ role: string; content: string }>;
}

export async function sendAssistantMessage(familyId: string, message: string, actionType?: string): Promise<{ content: string; role: string }> {
  const userId = await uid();
  await dbInsertMany('assistant_messages', [{ family_id: familyId, user_id: userId, role: 'user', content: message, action_type: actionType ?? null }]);
  const reply = "I'm your family assistant! Connect the Supabase Edge Function for full AI responses. Here to help!";
  await dbInsertMany('assistant_messages', [{ family_id: familyId, user_id: userId, role: 'assistant', content: reply }]);
  return { role: 'assistant', content: reply };
}

// â”€â”€ Locations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchMemberLocations(familyId: string): Promise<FamilyLocationsResponse> {
  const userId = await uid();
  const [mRes, lRes] = await Promise.all([
    supabase.from('family_members').select('users!family_members_user_id_fkey(id, display_name, avatar_url, aura)').eq('family_id', familyId),
    supabase.from('member_locations').select('*').eq('family_id', familyId),
  ]);
  const locMap = new Map((lRes.data ?? []).map((l) => { const r = l as Record<string, unknown>; return [String(r.user_id), r]; }));
  const members: MemberLocationEntry[] = (mRes.data ?? []).map((m) => {
    const u   = (m as unknown as { users: Record<string, unknown> }).users;
    const loc = locMap.get(String(u.id));
    return { userId: String(u.id), displayName: String(u.display_name ?? 'Member'), avatarUrl: resolveMediaUrl(u.avatar_url as string | undefined), aura: (u.aura as FamilyAuraId | null) ?? null, sharingEnabled: Boolean(loc?.sharing_enabled), isSelf: String(u.id) === userId, latitude: loc?.latitude != null ? Number(loc.latitude) : null, longitude: loc?.longitude != null ? Number(loc.longitude) : null, locationName: (loc?.location_name as string) ?? null, updatedAt: (loc?.updated_at as string) ?? null };
  });
  return { members, sharingCount: members.filter((m) => m.sharingEnabled && m.latitude != null).length, auraCount: members.filter((m) => m.aura).length };
}

export async function updateMyLocation(familyId: string, payload: { latitude: number; longitude: number; accuracy?: number; locationName?: string }): Promise<MemberLocationEntry> {
  const userId = await uid();
  const { data, error } = await dbUpsert('member_locations', { family_id: familyId, user_id: userId, latitude: payload.latitude, longitude: payload.longitude, accuracy: payload.accuracy ?? null, location_name: payload.locationName ?? null, updated_at: new Date().toISOString() }, { onConflict: 'family_id,user_id' });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Record<string, unknown>;
  return { userId, displayName: 'You', sharingEnabled: Boolean(r.sharing_enabled), isSelf: true, latitude: r.latitude != null ? Number(r.latitude) : null, longitude: r.longitude != null ? Number(r.longitude) : null, locationName: (r.location_name as string) ?? null, updatedAt: (r.updated_at as string) ?? null };
}

export async function setLocationSharing(familyId: string, sharingEnabled: boolean): Promise<MemberLocationEntry> {
  const userId = await uid();
  const { data, error } = await dbUpsert('member_locations', { family_id: familyId, user_id: userId, sharing_enabled: sharingEnabled, updated_at: new Date().toISOString() }, { onConflict: 'family_id,user_id' });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Record<string, unknown>;
  return { userId, displayName: 'You', sharingEnabled, isSelf: true, latitude: r.latitude != null ? Number(r.latitude) : null, longitude: r.longitude != null ? Number(r.longitude) : null, locationName: (r.location_name as string) ?? null, updatedAt: (r.updated_at as string) ?? null };
}

// â”€â”€ Mailbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchMailbox(familyId: string): Promise<MailboxResponse> {
  const userId = await uid();
  const [inRes, outRes] = await Promise.all([
    supabase.from('mailbox_letters').select('*, sender:users!mailbox_letters_author_id_fkey(display_name, avatar_url)').eq('family_id', familyId).eq('recipient_id', userId).order('created_at', { ascending: false }),
    supabase.from('mailbox_letters').select('*, recipient:users!mailbox_letters_recipient_id_fkey(display_name, avatar_url)').eq('family_id', familyId).eq('author_id', userId).order('created_at', { ascending: false }),
  ]);
  const CONDITION_LABELS: Record<string, string> = {
    anytime: 'Open anytime',
    bad_day: 'Open when you are having a bad day',
    birthday: 'Open on your birthday',
    after_exams: 'Open after your exams',
    custom: 'Open when ready',
  };
  const mapLetter = (row: Record<string, unknown>, isInbox: boolean): MailboxLetter => {
    const s = (row.sender ?? {}) as Record<string, unknown>;
    const rec = (row.recipient ?? {}) as Record<string, unknown>;
    const cond = row.open_condition as MailboxOpenCondition;
    const isOpened = Boolean(row.is_opened);
    const condLabel = cond === 'custom'
      ? (row.open_condition_text as string | undefined) ?? 'Custom condition'
      : CONDITION_LABELS[cond] ?? cond;
    return {
      id: String(row.id),
      title: String(row.title),
      body: row.body as string,
      openCondition: cond,
      openConditionLabel: condLabel,
      openConditionText: row.open_condition_text as string | undefined,
      isOpened,
      isSealed: isInbox && !isOpened,
      isForMe: isInbox,
      isFromMe: !isInbox,
      authorName: s.display_name as string | undefined,
      authorAvatar: resolveMediaUrl(s.avatar_url as string | undefined),
      recipientName: rec.display_name as string | undefined,
      recipientAvatar: resolveMediaUrl(rec.avatar_url as string | undefined),
      authorId: row.author_id as string | undefined,
      recipientId: row.recipient_id as string | undefined,
      createdAt: row.created_at as string | undefined,
      openedAt: row.opened_at as string | undefined,
    };
  };
  return { inbox: (inRes.data ?? []).map((l) => mapLetter(l as Record<string, unknown>, true)), sent: (outRes.data ?? []).map((l) => mapLetter(l as Record<string, unknown>, false)) };
}

export async function sendMailboxLetter(familyId: string, payload: { recipientId: string; title: string; body: string; openCondition: MailboxOpenCondition; openConditionText?: string }): Promise<MailboxLetter> {
  const userId = await uid();
  const { data, error } = await dbInsert('mailbox_letters', { family_id: familyId, author_id: userId, recipient_id: payload.recipientId, title: payload.title, body: payload.body, open_condition: payload.openCondition, open_condition_text: payload.openConditionText ?? null });
  if (error || !data) throw new Error(error?.message ?? 'Failed to send letter');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), title: String(r.title), body: r.body as string, openCondition: r.open_condition as MailboxOpenCondition, isOpened: false, isFromMe: true, createdAt: r.created_at as string };
}

export async function openMailboxLetter(familyId: string, letterId: string): Promise<MailboxLetter> {
  const { data, error } = await dbUpdate('mailbox_letters', { is_opened: true, opened_at: new Date().toISOString() }, { id: letterId });
  if (error || !data) throw new Error(error?.message ?? 'Failed to open letter');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), title: String(r.title), body: r.body as string, openCondition: r.open_condition as MailboxOpenCondition, isOpened: true, openedAt: r.opened_at as string };
}

// â”€â”€ Wall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchWallByDate(familyId: string, date: string): Promise<WallEntry[]> {
  const { data, error } = await supabase.from('wall_entries').select('*, users!wall_entries_author_id_fkey(display_name, avatar_url)').eq('family_id', familyId).eq('wall_date', date).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => {
    const r = e as Record<string, unknown>;
    const a = (r.users ?? {}) as Record<string, unknown>;
    return { id: String(r.id), slot: r.slot as 'morning' | 'night', wallDate: String(r.wall_date), message: String(r.message), photoUrl: resolveMediaUrl(r.photo_url as string | undefined), authorName: a.display_name as string | undefined, authorAvatar: resolveMediaUrl(a.avatar_url as string | undefined), authorId: r.author_id as string | undefined, createdAt: r.created_at as string | undefined };
  });
}

export async function fetchWallToday(familyId: string): Promise<WallEntry[]> {
  return fetchWallByDate(familyId, new Date().toISOString().slice(0, 10));
}

export async function fetchWallTimeline(familyId: string, days = 14): Promise<WallTimelineDay[]> {
  const dates = Array.from({ length: days }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10); });
  const results = await Promise.all(dates.map((date) => fetchWallByDate(familyId, date)));
  return dates.map((date, i) => ({ date, entries: results[i] })).filter((d) => d.entries.length > 0);
}

export async function postWallEntry(familyId: string, payload: { slot: 'morning' | 'night'; message: string; photoUrl?: string }): Promise<WallEntry> {
  const userId = await uid();
  const today  = new Date().toISOString().slice(0, 10);
  const { data, error } = await dbUpsert('wall_entries', { family_id: familyId, author_id: userId, slot: payload.slot, wall_date: today, message: payload.message, photo_url: payload.photoUrl ?? null }, { onConflict: 'family_id,author_id,wall_date,slot' });
  if (error || !data) throw new Error(error?.message ?? 'Failed to post wall entry');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), slot: r.slot as 'morning' | 'night', wallDate: String(r.wall_date), message: String(r.message), photoUrl: resolveMediaUrl(r.photo_url as string | undefined), authorId: userId };
}

// â”€â”€ Podcast / Voice Notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchPodcastWeekStatus(familyId: string): Promise<PodcastWeekStatus> {
  const weekStart = getWeekStart();
  const [mRes, vnRes] = await Promise.all([
    supabase.from('family_members').select('users!family_members_user_id_fkey(id, display_name, avatar_url)').eq('family_id', familyId),
    supabase.from('voice_notes').select('id, author_id').eq('family_id', familyId).eq('week_start', weekStart),
  ]);
  const vnMap = new Map<string, string>((vnRes.data ?? []).map((vn) => [(vn as { author_id: string }).author_id, (vn as { id: string }).id]));
  const members = (mRes.data ?? []).map((m) => {
    const u = (m as unknown as { users: Record<string, unknown> }).users;
    const id = String(u.id);
    return { userId: id, displayName: String(u.display_name ?? 'Member'), avatarUrl: resolveMediaUrl(u.avatar_url as string | undefined), hasVoiceNote: vnMap.has(id), voiceNoteId: vnMap.get(id) ?? null };
  });
  return { weekStart, members, submittedCount: vnMap.size, totalMembers: members.length, allSubmitted: members.length > 0 && vnMap.size >= members.length };
}

export async function fetchVoiceNotes(familyId: string): Promise<VoiceNote[]> {
  const { data, error } = await supabase.from('voice_notes').select('*, users!voice_notes_author_id_fkey(display_name, avatar_url)').eq('family_id', familyId).eq('week_start', getWeekStart()).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((vn) => {
    const r = vn as Record<string, unknown>;
    const a = (r.users ?? {}) as Record<string, unknown>;
    return { id: String(r.id), audioUrl: resolveMediaUrl(r.audio_url as string) ?? String(r.audio_url), durationSec: Number(r.duration_sec), caption: r.caption as string | undefined, transcript: r.transcript as string | undefined, authorName: a.display_name as string | undefined, authorAvatar: resolveMediaUrl(a.avatar_url as string | undefined), authorId: r.author_id as string | undefined, createdAt: r.created_at as string | undefined };
  });
}

export async function submitVoiceNote(familyId: string, payload: { audioUrl: string; durationSec: number; caption?: string; transcript?: string }): Promise<VoiceNote> {
  const userId    = await uid();
  const weekStart = getWeekStart();
  const { data, error } = await dbUpsert('voice_notes', { family_id: familyId, author_id: userId, audio_url: payload.audioUrl, duration_sec: payload.durationSec, caption: payload.caption ?? null, transcript: payload.transcript ?? null, week_start: weekStart }, { onConflict: 'family_id,author_id,week_start' });
  if (error || !data) throw new Error(error?.message ?? 'Failed to submit voice note');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), audioUrl: String(r.audio_url), durationSec: Number(r.duration_sec), caption: r.caption as string | undefined, authorId: userId };
}

export async function fetchPodcastEpisode(familyId: string): Promise<PodcastEpisode | null> {
  const { data } = await supabase.from('podcast_episodes').select('*').eq('family_id', familyId).eq('week_start', getWeekStart()).maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return { id: String(r.id), title: String(r.title), script: String(r.script), weekStart: String(r.week_start), createdAt: r.created_at as string | undefined };
}

export async function generatePodcastEpisode(familyId: string): Promise<PodcastEpisode> {
  const userId    = await uid();
  const weekStart = getWeekStart();
  const script    = 'This week, your family shared moments together. From photos to bucket list dreams â€” you are creating memories that will last a lifetime!';
  const { data, error } = await dbUpsert('podcast_episodes', { family_id: familyId, week_start: weekStart, title: 'Family Podcast', script, generated_by: userId }, { onConflict: 'family_id,week_start' });
  if (error || !data) throw new Error(error?.message ?? 'Failed to generate podcast');
  const r = data as Record<string, unknown>;
  return { id: String(r.id), title: String(r.title), script: String(r.script), weekStart };
}

// Re-export for backward compat
export { addFamilyMember } from './auth.service';



