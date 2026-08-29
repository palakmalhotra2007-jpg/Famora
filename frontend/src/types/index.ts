import type { FamilyAuraId } from '../constants/aura';

export interface User {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  birthday?: string;
  photoStreak: number;
  longestStreak: number;
  favoriteSongs?: string[];
  aura?: FamilyAuraId | null;
}

export interface Family {
  id: string;
  name: string;
  newspaperName: string;
  inviteCode: string;
  avatarUrl?: string;
  familyStreak: number;
  memberCount?: number;
  role?: string;
}

export interface FamilyMember {
  id: string;
  displayName: string;
  avatarUrl?: string;
  photoStreak: number;
  nickname?: string;
  role: string;
  aura?: FamilyAuraId | null;
  location?: MemberLocationInfo | null;
}

export interface MemberLocationInfo {
  latitude: number;
  longitude: number;
  locationName?: string | null;
  updatedAt?: string | null;
}

export interface MemberLocationEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  sharingEnabled: boolean;
  isSelf?: boolean;
  latitude: number | null;
  longitude: number | null;
  locationName?: string | null;
  updatedAt?: string | null;
  aura?: FamilyAuraId | null;
}

export interface FamilyLocationsResponse {
  members: MemberLocationEntry[];
  sharingCount: number;
  auraCount: number;
}

export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  caption?: string;
  mediaUrls: string[];
  mediaType: 'photo' | 'video';
  reactions?: Reaction[];
  comments?: PostComment[];
  commentCount: number;
  locationName?: string;
  createdAt: string;
  aiTags?: string[];
}

export interface Reaction {
  type: 'loved' | 'funny' | 'emotional' | 'proud' | 'celebrate';
  userId: string;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  expiresAt: string;
}

export interface EventRsvp {
  userId: string;
  status: 'going' | 'maybe' | 'declined';
}

export type EventType =
  | 'birthday'
  | 'anniversary'
  | 'vacation'
  | 'dinner'
  | 'movie'
  | 'school'
  | 'doctor'
  | 'general';

export interface Event {
  id: string;
  title: string;
  description?: string;
  eventType: EventType | string;
  startTime: string;
  endTime?: string;
  location?: string;
  createdByName?: string;
  rsvps?: EventRsvp[];
}

export interface NewspaperSection {
  type: string;
  title: string;
  content: string;
  imageUrl?: string;
}

export interface Newspaper {
  id: string;
  title: string;
  editionDate: string;
  sections: NewspaperSection[];
  coverImageUrl?: string;
}

export interface DailyChallenge {
  id: string;
  challengeDate: string;
  prompts: string[];
  uploads: DailyUpload[];
  members: ChallengeMember[];
  progress: {
    membersCompleted: number;
    totalMembers: number;
    userUploads: number;
  };
}

export interface DailyUpload {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  mediaUrl: string;
  promptLabel?: string;
}

export interface ChallengeMember {
  id: string;
  displayName: string;
  avatarUrl?: string;
  uploadCount: number;
}

export interface Memory {
  id: string;
  title: string;
  description?: string;
  category: string;
  coverUrl?: string;
  startDate?: string;
  locationName?: string;
}

export interface GameType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  players: string;
}

export interface BucketListItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Achievement {
  id: string;
  achievementType: string;
  title: string;
  description?: string;
  badgeUrl?: string;
  earnedAt: string;
  userName?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PhotoSpot {
  id: string;
  name: string;
  description?: string;
  category?: string;
  bestTime?: string;
  crowdLevel?: string;
  previewUrls?: string[];
}

export interface HomeDashboard {
  family: Family;
  members: FamilyMember[];
  todayEvents: Event[];
  upcomingBirthdays: UpcomingBirthday[];
  recentPosts: Post[];
  newspaper: Newspaper | null;
  nextEvent: Event | null;
  familyStreak: number;
  challengeProgress?: ChallengeProgress | null;
}

export interface UpcomingBirthday {
  displayName: string;
  birthday?: string;
  avatarUrl?: string;
}

export interface ChallengeProgress {
  id: string;
  membersCompleted: number;
  totalMembers: number;
}

export type MailboxOpenCondition = 'anytime' | 'bad_day' | 'birthday' | 'after_exams' | 'custom';

export interface MailboxLetter {
  id: string;
  title: string;
  body: string | null;
  openCondition: MailboxOpenCondition;
  openConditionLabel?: string;
  openConditionText?: string;
  isOpened: boolean;
  isSealed?: boolean;
  isForMe?: boolean;
  isFromMe?: boolean;
  authorName?: string;
  authorAvatar?: string;
  recipientName?: string;
  recipientAvatar?: string;
  recipientId?: string;
  authorId?: string;
  createdAt?: string;
  openedAt?: string;
}

export interface MailboxResponse {
  inbox: MailboxLetter[];
  sent: MailboxLetter[];
}

export interface WallEntry {
  id: string;
  slot: 'morning' | 'night';
  wallDate: string;
  message: string;
  photoUrl?: string;
  authorName?: string;
  authorAvatar?: string;
  authorId?: string;
  createdAt?: string;
}

export interface WallTimelineDay {
  date: string;
  entries: WallEntry[];
}

export interface VoiceNote {
  id: string;
  audioUrl: string;
  durationSec: number;
  caption?: string;
  transcript?: string;
  authorName?: string;
  authorAvatar?: string;
  authorId?: string;
  createdAt?: string;
}

export interface PodcastWeekStatus {
  weekStart: string;
  members: Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
    hasVoiceNote: boolean;
    voiceNoteId: string | null;
  }>;
  submittedCount: number;
  totalMembers: number;
  allSubmitted: boolean;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  script: string;
  weekStart: string;
  generatedByName?: string | null;
  voiceNotes?: VoiceNote[];
  createdAt?: string;
}

export const REACTIONS = [
  { type: 'loved' as const, emoji: '❤️', label: 'Loved It' },
  { type: 'funny' as const, emoji: '😂', label: 'Funny' },
  { type: 'emotional' as const, emoji: '🥹', label: 'Emotional' },
  { type: 'proud' as const, emoji: '👏', label: 'Proud' },
  { type: 'celebrate' as const, emoji: '🎉', label: 'Celebrate' },
];
