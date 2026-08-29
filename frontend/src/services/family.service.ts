import { Platform } from 'react-native';
import { apiGet, apiPost, apiPatch, apiClient } from './api';
import {
  HomeDashboard,
  Post,
  PostComment,
  Memory,
  Event,
  Story,
  DailyChallenge,
  BucketListItem,
  FamilyLocationsResponse,
  MemberLocationEntry,
  MailboxResponse,
  MailboxLetter,
  MailboxOpenCondition,
  WallEntry,
  WallTimelineDay,
  VoiceNote,
  PodcastWeekStatus,
  PodcastEpisode,
} from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';

export function getUploadUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }
  return API_BASE;
}

export async function fetchHomeDashboard(familyId: string): Promise<HomeDashboard> {
  return apiGet<HomeDashboard>(`/home/${familyId}`);
}

export async function fetchPosts(familyId: string, page = 1): Promise<{ data: Post[]; total: number }> {
  const result = await apiGet<Post[]>(`/posts/${familyId}`, { page, limit: 20 });
  return { data: result, total: result.length };
}

export async function createPost(
  familyId: string,
  payload: { caption?: string; mediaUrls: string[]; mediaType?: 'photo' | 'video' }
): Promise<Post> {
  return apiPost<Post>(`/posts/${familyId}`, payload);
}

export async function addPostComment(
  familyId: string,
  postId: string,
  text: string
): Promise<PostComment> {
  return apiPost<PostComment>(`/posts/${familyId}/${postId}/comments`, { text });
}

export async function uploadImage(uri: string, token: string): Promise<string> {
  const formData = new FormData();
  const filename = uri.split('/').pop()?.split('?')[0] ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';

  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    formData.append('file', blob, filename);
  } else {
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as unknown as Blob);
  }

  const base = getUploadUrl();
  const response = await fetch(`${base}/api/v1/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Upload failed');
  }

  const json = (await response.json()) as { data: { url: string } };
  return json.data.url;
}

export async function uploadAudio(uri: string, token: string): Promise<string> {
  const formData = new FormData();
  const filename = uri.split('/').pop()?.split('?')[0] ?? 'voice-note.m4a';
  const ext = filename.endsWith('.webm') ? 'webm' : filename.endsWith('.mp3') ? 'mp3' : filename.endsWith('.wav') ? 'wav' : 'm4a';
  const mimeType = ext === 'webm' ? 'audio/webm' : ext === 'mp3' ? 'audio/mpeg' : 'audio/m4a';

  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    formData.append('file', blob, filename.includes('.') ? filename : `voice-note.${ext}`);
  } else {
    formData.append('file', {
      uri,
      name: filename.includes('.') ? filename : `voice-note.${ext}`,
      type: mimeType,
    } as unknown as Blob);
  }

  const base = getUploadUrl();
  const response = await fetch(`${base}/api/v1/upload/audio`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Audio upload failed');
  }

  const json = (await response.json()) as { data: { url: string } };
  return json.data.url;
}

export async function fetchMemories(familyId: string): Promise<Memory[]> {
  return apiGet<Memory[]>(`/memories/${familyId}`);
}

export async function fetchAchievements(familyId: string): Promise<Record<string, unknown>[]> {
  return apiGet<Record<string, unknown>[]>(`/achievements/${familyId}`);
}

export async function fetchEvents(familyId: string): Promise<Event[]> {
  return apiGet<Event[]>(`/events/${familyId}`);
}

export async function fetchEventsInRange(
  familyId: string,
  from: Date,
  to: Date
): Promise<Event[]> {
  return apiGet<Event[]>(`/events/${familyId}`, {
    from: from.toISOString(),
    to: to.toISOString(),
  });
}

export async function createFamilyEvent(
  familyId: string,
  payload: {
    title: string;
    eventType: string;
    startTime: string;
    endTime?: string;
    location?: string;
    description?: string;
  }
): Promise<Event> {
  return apiPost<Event>(`/events/${familyId}`, payload);
}

export async function rsvpToEvent(
  familyId: string,
  eventId: string,
  status: 'going' | 'maybe' | 'declined'
): Promise<void> {
  await apiPost(`/events/${familyId}/${eventId}/rsvp`, { status });
}

export async function deleteFamilyEvent(familyId: string, eventId: string): Promise<void> {
  await apiClient.delete(`/events/${familyId}/${eventId}`);
}

export async function fetchNewspaper(familyId: string, lang?: string): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>(`/newspapers/${familyId}/today`, lang ? { lang } : undefined);
}

export async function fetchNewspaperAudio(
  familyId: string,
  newspaperId: string,
  lang?: string
): Promise<{ url: string; isDemo: boolean }> {
  return apiGet<{ url: string; isDemo: boolean }>(
    `/newspapers/${familyId}/${newspaperId}/audio`,
    lang ? { lang } : undefined
  );
}

export function resolveMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getUploadUrl();
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function fetchStories(familyId: string): Promise<Story[]> {
  return apiGet<Story[]>(`/posts/${familyId}/stories`);
}

export async function fetchDailyChallenge(familyId: string): Promise<DailyChallenge> {
  const data = await apiGet<{
    challenge: { id: string; challengeDate: string; prompts: string[] };
    uploads: Array<{
      id: string;
      userId: string;
      displayName: string;
      avatarUrl?: string;
      mediaUrl: string;
      promptLabel?: string;
    }>;
    members: Array<{ id: string; displayName: string; avatarUrl?: string; uploadCount: number }>;
    progress: { membersCompleted: number; totalMembers: number; userUploads: number };
  }>(`/challenges/${familyId}/today`);

  return {
    id: data.challenge.id,
    challengeDate: data.challenge.challengeDate,
    prompts: data.challenge.prompts,
    uploads: data.uploads.map((u) => ({
      id: u.id,
      userId: u.userId,
      displayName: u.displayName,
      avatarUrl: resolveMediaUrl(u.avatarUrl),
      mediaUrl: resolveMediaUrl(u.mediaUrl) ?? u.mediaUrl,
      promptLabel: u.promptLabel,
    })),
    members: data.members,
    progress: data.progress,
  };
}

export async function submitChallengeUpload(
  familyId: string,
  mediaUrl: string,
  promptLabel?: string
): Promise<void> {
  await apiPost(`/challenges/${familyId}/upload`, { mediaUrl, promptLabel });
}

export async function fetchBucketList(familyId: string): Promise<BucketListItem[]> {
  return apiGet<BucketListItem[]>(`/bucket-list/${familyId}`);
}

export async function createBucketItem(
  familyId: string,
  payload: string | { title: string; description?: string },
  desc?: string
): Promise<BucketListItem> {
  const body = typeof payload === 'string' ? { title: payload, description: desc } : payload;
  return apiPost<BucketListItem>(`/bucket-list/${familyId}`, body);
}

export async function completeBucketItem(
  familyId: string,
  itemId: string
): Promise<BucketListItem> {
  return apiPatch<BucketListItem>(`/bucket-list/${familyId}/${itemId}/complete`, {});
}

export async function addFamilyMember(
  familyId: string,
  payload: { displayName: string; email?: string; role?: string; nickname?: string }
): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>(`/auth/families/${familyId}/members`, payload);
}

export async function fetchGameTypes(): Promise<string[]> {
  return apiGet<string[]>('/games/types');
}

import { GameSession } from '../games/types';

export async function fetchGameSessions(familyId: string): Promise<GameSession[]> {
  return apiGet<GameSession[]>(`/games/${familyId}`);
}

export async function joinFamilyChallenge(familyId: string, gameType: string): Promise<GameSession> {
  return apiPost<GameSession>(`/games/${familyId}/challenge`, { gameType });
}

export async function startGameSession(familyId: string, gameType: string): Promise<GameSession> {
  return joinFamilyChallenge(familyId, gameType);
}

export async function fetchGameSession(familyId: string, sessionId: string): Promise<GameSession> {
  return apiGet<GameSession>(`/games/${familyId}/sessions/${sessionId}`);
}

export async function submitGameScore(
  familyId: string,
  sessionId: string,
  score: number
): Promise<GameSession> {
  return apiPost<GameSession>(`/games/${familyId}/sessions/${sessionId}/finish`, { score });
}

export async function sendAssistantMessage(
  familyId: string,
  message: string,
  actionType?: string
): Promise<{ content: string; role: string }> {
  const data = await apiPost<{ content: string; role: string }>(`/assistant/${familyId}/chat`, {
    message,
    actionType,
  });
  return data;
}

export async function fetchAssistantHistory(
  familyId: string
): Promise<Array<{ role: string; content: string }>> {
  return apiGet<Array<{ role: string; content: string }>>(`/assistant/${familyId}/history`);
}

export async function reactToPost(
  familyId: string,
  postId: string,
  reactionType: string
): Promise<void> {
  await apiPost(`/posts/${familyId}/${postId}/reactions`, { reactionType });
}

export async function fetchMemberLocations(familyId: string): Promise<FamilyLocationsResponse> {
  return apiGet<FamilyLocationsResponse>(`/locations/${familyId}`);
}

export async function updateMyLocation(
  familyId: string,
  payload: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    locationName?: string;
  }
): Promise<MemberLocationEntry> {
  return apiPost<MemberLocationEntry>(`/locations/${familyId}/me`, payload);
}

export async function setLocationSharing(
  familyId: string,
  sharingEnabled: boolean
): Promise<MemberLocationEntry> {
  return apiPatch<MemberLocationEntry>(`/locations/${familyId}/me/sharing`, { sharingEnabled });
}

export async function fetchMailbox(familyId: string): Promise<MailboxResponse> {
  return apiGet<MailboxResponse>(`/mailbox/${familyId}`);
}

export async function sendMailboxLetter(
  familyId: string,
  payload: {
    recipientId: string;
    title: string;
    body: string;
    openCondition: MailboxOpenCondition;
    openConditionText?: string;
  }
): Promise<MailboxLetter> {
  return apiPost<MailboxLetter>(`/mailbox/${familyId}`, payload);
}

export async function openMailboxLetter(familyId: string, letterId: string): Promise<MailboxLetter> {
  return apiPost<MailboxLetter>(`/mailbox/${familyId}/${letterId}/open`, {});
}

export async function fetchWallToday(familyId: string): Promise<WallEntry[]> {
  return apiGet<WallEntry[]>(`/wall/${familyId}/today`);
}

export async function fetchWallTimeline(familyId: string, days = 14): Promise<WallTimelineDay[]> {
  return apiGet<WallTimelineDay[]>(`/wall/${familyId}/timeline`, { days });
}

export async function postWallEntry(
  familyId: string,
  payload: { slot: 'morning' | 'night'; message: string; photoUrl?: string }
): Promise<WallEntry> {
  return apiPost<WallEntry>(`/wall/${familyId}`, payload);
}

export async function fetchPodcastWeekStatus(familyId: string): Promise<PodcastWeekStatus> {
  return apiGet<PodcastWeekStatus>(`/podcast/${familyId}/week-status`);
}

export async function fetchVoiceNotes(familyId: string): Promise<VoiceNote[]> {
  return apiGet<VoiceNote[]>(`/podcast/${familyId}/voice-notes`);
}

export async function submitVoiceNote(
  familyId: string,
  payload: { audioUrl: string; durationSec: number; caption?: string; transcript?: string }
): Promise<VoiceNote> {
  return apiPost<VoiceNote>(`/podcast/${familyId}/voice-notes`, payload);
}

export async function fetchPodcastEpisode(familyId: string): Promise<PodcastEpisode | null> {
  return apiGet<PodcastEpisode | null>(`/podcast/${familyId}/episode`);
}

export async function generatePodcastEpisode(familyId: string): Promise<PodcastEpisode> {
  return apiPost<PodcastEpisode>(`/podcast/${familyId}/generate`, {});
}

export async function uploadAudio(uri: string, token: string): Promise<string> {
  const formData = new FormData();
  const filename = uri.split('/').pop()?.split('?')[0] ?? 'voice.m4a';
  const ext = filename.split('.').pop()?.toLowerCase();
  const type =
    ext === 'webm' ? 'audio/webm' : ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : 'audio/m4a';

  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    formData.append('file', blob, filename);
  } else {
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as unknown as Blob);
  }

  const base = getUploadUrl();
  const response = await fetch(`${base}/api/v1/upload/audio`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Audio upload failed');
  }

  const json = (await response.json()) as { data: { url: string } };
  return json.data.url;
}
