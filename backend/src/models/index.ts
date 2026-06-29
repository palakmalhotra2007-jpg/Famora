import { Schema, model, Document, Types } from 'mongoose';
import type { FamilyAuraValue } from '../constants/aura';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  passwordHash?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  birthday?: Date;
  authProvider: string;
  authProviderId?: string;
  favoriteSongs: string[];
  photoStreak: number;
  longestStreak: number;
  lastUploadDate?: Date;
  aura?: FamilyAuraValue | null;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    passwordHash: String,
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    avatarUrl: String,
    bio: String,
    birthday: Date,
    authProvider: { type: String, default: 'email' },
    authProviderId: String,
    favoriteSongs: { type: [String], default: [] },
    photoStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastUploadDate: Date,
    aura: { type: String, enum: ['happy', 'relaxing', 'traveling', 'studying', 'working', 'watching_movies', 'gaming'], default: null },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);

export interface IFamily extends Document {
  name: string;
  newspaperName?: string;
  inviteCode: string;
  avatarUrl?: string;
  timezone: string;
  familyStreak: number;
  createdBy?: Types.ObjectId;
}

const familySchema = new Schema<IFamily>(
  {
    name: { type: String, required: true, trim: true },
    newspaperName: String,
    inviteCode: { type: String, required: true, unique: true, uppercase: true },
    avatarUrl: String,
    timezone: { type: String, default: 'UTC' },
    familyStreak: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Family = model<IFamily>('Family', familySchema);

export interface IFamilyMember extends Document {
  familyId: Types.ObjectId;
  userId: Types.ObjectId;
  role: string;
  nickname?: string;
}

const familyMemberSchema = new Schema<IFamilyMember>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'member' },
    nickname: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

familyMemberSchema.index({ familyId: 1, userId: 1 }, { unique: true });

export const FamilyMember = model<IFamilyMember>('FamilyMember', familyMemberSchema);

export interface IPostReaction {
  userId: Types.ObjectId;
  reactionType: string;
  createdAt: Date;
}

export interface IPost extends Document {
  familyId: Types.ObjectId;
  authorId: Types.ObjectId;
  caption?: string;
  mediaUrls: string[];
  mediaType: string;
  albumId?: Types.ObjectId;
  aiTags: string[];
  locationName?: string;
  latitude?: number;
  longitude?: number;
  reactions: IPostReaction[];
}

const postSchema = new Schema<IPost>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    caption: { type: String, maxlength: 2000 },
    mediaUrls: { type: [String], required: true },
    mediaType: { type: String, default: 'photo' },
    albumId: { type: Schema.Types.ObjectId },
    aiTags: { type: [String], default: [] },
    locationName: String,
    latitude: Number,
    longitude: Number,
    reactions: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: 'User' },
          reactionType: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

postSchema.index({ familyId: 1, createdAt: -1 });

export const Post = model<IPost>('Post', postSchema);

export interface IStory extends Document {
  familyId: Types.ObjectId;
  authorId: Types.ObjectId;
  mediaUrl: string;
  mediaType: string;
  expiresAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, default: 'photo' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Story = model<IStory>('Story', storySchema);

export interface IDailyChallenge extends Document {
  familyId: Types.ObjectId;
  challengeDate: Date;
  prompts: string[];
}

const dailyChallengeSchema = new Schema<IDailyChallenge>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    challengeDate: { type: Date, required: true },
    prompts: { type: [String], default: [] },
  },
  { timestamps: true }
);

dailyChallengeSchema.index({ familyId: 1, challengeDate: 1 }, { unique: true });

export const DailyChallenge = model<IDailyChallenge>('DailyChallenge', dailyChallengeSchema);

export interface IDailyUpload extends Document {
  challengeId: Types.ObjectId;
  userId: Types.ObjectId;
  mediaUrl: string;
  promptLabel?: string;
}

const dailyUploadSchema = new Schema<IDailyUpload>(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'DailyChallenge', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true },
    promptLabel: String,
  },
  { timestamps: true }
);

dailyUploadSchema.index({ challengeId: 1, userId: 1 });

export const DailyUpload = model<IDailyUpload>('DailyUpload', dailyUploadSchema);

export interface IMemory extends Document {
  familyId: Types.ObjectId;
  title: string;
  description?: string;
  category: string;
  coverUrl?: string;
  postIds: Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  locationName?: string;
  aiSummary?: string;
}

const memorySchema = new Schema<IMemory>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    title: { type: String, required: true },
    description: String,
    category: { type: String, required: true },
    coverUrl: String,
    postIds: { type: [Schema.Types.ObjectId], default: [] },
    startDate: Date,
    endDate: Date,
    locationName: String,
    aiSummary: String,
  },
  { timestamps: true }
);

memorySchema.index({ familyId: 1, category: 1 });

export const Memory = model<IMemory>('Memory', memorySchema);

export interface IEventRsvp {
  userId: Types.ObjectId;
  status: string;
  createdAt: Date;
}

export interface IEvent extends Document {
  familyId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  description?: string;
  eventType: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  reminderMinutes: number;
  rsvps: IEventRsvp[];
}

const eventSchema = new Schema<IEvent>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    eventType: { type: String, default: 'general' },
    startTime: { type: Date, required: true },
    endTime: Date,
    location: String,
    reminderMinutes: { type: Number, default: 60 },
    rsvps: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: 'User' },
          status: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

eventSchema.index({ familyId: 1, startTime: 1 });

export const Event = model<IEvent>('Event', eventSchema);

export interface INewspaperSection {
  type: string;
  title: string;
  content: string;
  imageUrl?: string;
}

export interface INewspaper extends Document {
  familyId: Types.ObjectId;
  editionDate: Date;
  title: string;
  sections: INewspaperSection[];
  coverImageUrl?: string;
}

const newspaperSectionSchema = new Schema(
  {
    type: String,
    title: String,
    content: String,
    imageUrl: String,
  },
  { _id: false }
);

const newspaperSchema = new Schema<INewspaper>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    editionDate: { type: Date, required: true },
    title: { type: String, required: true },
    sections: { type: [newspaperSectionSchema], default: [] },
    coverImageUrl: String,
  },
  { timestamps: true }
);

newspaperSchema.index({ familyId: 1, editionDate: 1 }, { unique: true });

export const Newspaper = model<INewspaper>('Newspaper', newspaperSchema);

export interface IPlaylistTrack {
  _id?: Types.ObjectId;
  title: string;
  artist: string;
  album?: string;
  addedBy?: Types.ObjectId;
  addedAt: Date;
}

export interface IPlaylist extends Document {
  familyId: Types.ObjectId;
  name: string;
  description?: string;
  spotifyPlaylistId?: string;
  coverUrl?: string;
  createdBy?: Types.ObjectId;
  tracks: IPlaylistTrack[];
}

const playlistTrackSchema = new Schema<IPlaylistTrack>(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: String,
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const playlistSchema = new Schema<IPlaylist>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    name: { type: String, required: true },
    description: String,
    spotifyPlaylistId: String,
    coverUrl: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    tracks: { type: [playlistTrackSchema], default: [] },
  },
  { timestamps: true }
);

export const Playlist = model<IPlaylist>('Playlist', playlistSchema);

export interface IGameSession extends Document {
  familyId: Types.ObjectId;
  gameType: string;
  status: string;
  config: Record<string, unknown>;
  scores: Map<string, number>;
  winnerId?: Types.ObjectId;
  startedAt?: Date;
  endedAt?: Date;
}

const gameSessionSchema = new Schema<IGameSession>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    gameType: { type: String, required: true },
    status: { type: String, default: 'waiting' },
    config: { type: Schema.Types.Mixed, default: {} },
    scores: { type: Map, of: Number, default: {} },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

export const GameSession = model<IGameSession>('GameSession', gameSessionSchema);

export interface IBucketListItem extends Document {
  familyId: Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  isCompleted: boolean;
  completedAt?: Date;
  memoryIds: Types.ObjectId[];
  createdBy?: Types.ObjectId;
}

const bucketListSchema = new Schema<IBucketListItem>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    title: { type: String, required: true },
    description: String,
    category: String,
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
    memoryIds: { type: [Schema.Types.ObjectId], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const BucketListItem = model<IBucketListItem>('BucketListItem', bucketListSchema);

export interface ITimeCapsule extends Document {
  familyId: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  contentType: string;
  contentUrl?: string;
  textContent?: string;
  unlockType: string;
  unlockDate?: Date;
  unlockMilestone?: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

const timeCapsuleSchema = new Schema<ITimeCapsule>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    contentType: { type: String, required: true },
    contentUrl: String,
    textContent: String,
    unlockType: { type: String, required: true },
    unlockDate: Date,
    unlockMilestone: String,
    isUnlocked: { type: Boolean, default: false },
    unlockedAt: Date,
  },
  { timestamps: true }
);

export const TimeCapsule = model<ITimeCapsule>('TimeCapsule', timeCapsuleSchema);

export interface IAchievement extends Document {
  familyId: Types.ObjectId;
  userId?: Types.ObjectId;
  achievementType: string;
  title: string;
  description?: string;
  badgeUrl?: string;
  celebrationCardUrl?: string;
  earnedAt: Date;
}

const achievementSchema = new Schema<IAchievement>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    achievementType: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    badgeUrl: String,
    celebrationCardUrl: String,
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Achievement = model<IAchievement>('Achievement', achievementSchema);

export interface IPhotoSpot extends Document {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  category?: string;
  bestTime?: string;
  crowdLevel?: string;
  goldenHour?: Date;
  photoTips?: string;
  previewUrls: string[];
  nearbyCafes: string[];
}

const photoSpotSchema = new Schema<IPhotoSpot>(
  {
    name: { type: String, required: true },
    description: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    category: String,
    bestTime: String,
    crowdLevel: String,
    goldenHour: Date,
    photoTips: String,
    previewUrls: { type: [String], default: [] },
    nearbyCafes: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const PhotoSpot = model<IPhotoSpot>('PhotoSpot', photoSpotSchema);

export interface INotification extends Document {
  userId: Types.ObjectId;
  familyId?: Types.ObjectId;
  type: string;
  title: string;
  body?: string;
  data: Record<string, unknown>;
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'Family' },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: String,
    data: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);

export interface IAssistantMessage extends Document {
  familyId: Types.ObjectId;
  userId: Types.ObjectId;
  role: string;
  content: string;
  actionType?: string;
  actionData?: Record<string, unknown>;
}

const assistantMessageSchema = new Schema<IAssistantMessage>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    content: { type: String, required: true },
    actionType: String,
    actionData: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const AssistantMessage = model<IAssistantMessage>('AssistantMessage', assistantMessageSchema);

export interface IMemberLocation extends Document {
  familyId: Types.ObjectId;
  userId: Types.ObjectId;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationName?: string;
  sharingEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const memberLocationSchema = new Schema<IMemberLocation>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    locationName: { type: String, maxlength: 200 },
    sharingEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

memberLocationSchema.index({ familyId: 1, userId: 1 }, { unique: true });
memberLocationSchema.index({ familyId: 1, sharingEnabled: 1, updatedAt: -1 });

export const MemberLocation = model<IMemberLocation>('MemberLocation', memberLocationSchema);

export type MailboxOpenCondition = 'anytime' | 'bad_day' | 'birthday' | 'after_exams' | 'custom';

export interface IMailboxLetter extends Document {
  familyId: Types.ObjectId;
  authorId: Types.ObjectId;
  recipientId: Types.ObjectId;
  title: string;
  body: string;
  openCondition: MailboxOpenCondition;
  openConditionText?: string;
  isOpened: boolean;
  openedAt?: Date;
}

const mailboxLetterSchema = new Schema<IMailboxLetter>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 5000 },
    openCondition: {
      type: String,
      enum: ['anytime', 'bad_day', 'birthday', 'after_exams', 'custom'],
      default: 'anytime',
    },
    openConditionText: { type: String, maxlength: 200 },
    isOpened: { type: Boolean, default: false },
    openedAt: Date,
  },
  { timestamps: true }
);

mailboxLetterSchema.index({ familyId: 1, recipientId: 1, createdAt: -1 });
mailboxLetterSchema.index({ familyId: 1, authorId: 1, createdAt: -1 });

export const MailboxLetter = model<IMailboxLetter>('MailboxLetter', mailboxLetterSchema);

export interface IWallEntry extends Document {
  familyId: Types.ObjectId;
  authorId: Types.ObjectId;
  slot: 'morning' | 'night';
  wallDate: Date;
  message: string;
  photoUrl?: string;
}

const wallEntrySchema = new Schema<IWallEntry>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    slot: { type: String, enum: ['morning', 'night'], required: true },
    wallDate: { type: Date, required: true },
    message: { type: String, required: true, maxlength: 280 },
    photoUrl: String,
  },
  { timestamps: true }
);

wallEntrySchema.index({ familyId: 1, wallDate: -1, slot: 1 });
wallEntrySchema.index({ familyId: 1, authorId: 1, wallDate: 1, slot: 1 }, { unique: true });

export const WallEntry = model<IWallEntry>('WallEntry', wallEntrySchema);

export interface IVoiceNote extends Document {
  familyId: Types.ObjectId;
  authorId: Types.ObjectId;
  audioUrl: string;
  durationSec: number;
  caption?: string;
  transcript?: string;
  weekStart: Date;
}

const voiceNoteSchema = new Schema<IVoiceNote>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    audioUrl: { type: String, required: true },
    durationSec: { type: Number, required: true, min: 1 },
    caption: { type: String, maxlength: 200 },
    transcript: { type: String, maxlength: 4000 },
    weekStart: { type: Date, required: true },
  },
  { timestamps: true }
);

voiceNoteSchema.index({ familyId: 1, weekStart: 1, createdAt: -1 });
voiceNoteSchema.index({ familyId: 1, authorId: 1, weekStart: 1 }, { unique: true });

export const VoiceNote = model<IVoiceNote>('VoiceNote', voiceNoteSchema);

export interface IPodcastEpisode extends Document {
  familyId: Types.ObjectId;
  weekStart: Date;
  title: string;
  script: string;
  voiceNoteIds: Types.ObjectId[];
  generatedBy?: Types.ObjectId;
}

const podcastEpisodeSchema = new Schema<IPodcastEpisode>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    weekStart: { type: Date, required: true },
    title: { type: String, required: true, maxlength: 200 },
    script: { type: String, required: true },
    voiceNoteIds: [{ type: Schema.Types.ObjectId, ref: 'VoiceNote' }],
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

podcastEpisodeSchema.index({ familyId: 1, weekStart: 1 }, { unique: true });

export const PodcastEpisode = model<IPodcastEpisode>('PodcastEpisode', podcastEpisodeSchema);
