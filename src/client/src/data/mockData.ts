import {
  FamilyMember,
  Post,
  Story,
  Event,
  Newspaper,
  DailyChallenge,
  Memory,
  GameType,
  BucketListItem,
  Achievement,
  Notification,
  PhotoSpot,
  HomeDashboard,
} from '../types';

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800',
  'https://images.unsplash.com/photo-1478145046317-39f10ddd1062?w=800',
  'https://images.unsplash.com/photo-1522673607210-164d1b6ce486?w=800',
];

export const mockMembers: FamilyMember[] = [
  { id: '1', displayName: 'Mom', avatarUrl: 'https://i.pravatar.cc/150?u=mom', photoStreak: 30, role: 'admin', aura: 'happy' },
  { id: '2', displayName: 'Dad', avatarUrl: 'https://i.pravatar.cc/150?u=dad', photoStreak: 28, role: 'member', aura: 'working' },
  { id: '3', displayName: 'Palak', avatarUrl: 'https://i.pravatar.cc/150?u=palak', photoStreak: 23, role: 'member', aura: 'studying' },
  { id: '4', displayName: 'Arjun', avatarUrl: 'https://i.pravatar.cc/150?u=arjun', photoStreak: 15, role: 'member' },
  { id: '5', displayName: 'Grandma', avatarUrl: 'https://i.pravatar.cc/150?u=grandma', photoStreak: 42, role: 'member', aura: 'relaxing' },
  { id: '6', displayName: 'Riya', avatarUrl: 'https://i.pravatar.cc/150?u=riya', photoStreak: 7, role: 'member', aura: 'gaming' },
];

export const mockPosts: Post[] = DEMO_IMAGES.map((url, i) => ({
  id: `post-${i}`,
  authorId: mockMembers[i % mockMembers.length].id,
  authorName: mockMembers[i % mockMembers.length].displayName,
  authorAvatar: mockMembers[i % mockMembers.length].avatarUrl,
  caption: ['Sunday brunch vibes ☕', 'Golden hour at the park 🌅', 'Family game night! 🎲', 'Road trip memories 🚗', 'Diwali celebrations ✨', 'Beach day fun 🏖️'][i],
  mediaUrls: [url],
  mediaType: 'photo' as const,
  commentCount: Math.floor(Math.random() * 10) + 1,
  reactions: [{ type: 'loved' as const, userId: '1' }],
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
  aiTags: ['family', 'memories'],
}));

export const mockStories: Story[] = mockMembers.slice(0, 4).map((m, i) => ({
  id: `story-${i}`,
  authorId: m.id,
  authorName: m.displayName,
  authorAvatar: m.avatarUrl,
  mediaUrl: DEMO_IMAGES[i],
  mediaType: 'photo' as const,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
}));

export const mockEvents: Event[] = [
  { id: '1', title: 'Movie Night', eventType: 'movie', startTime: new Date(Date.now() + 3600000 * 5).toISOString(), location: 'Living Room' },
  { id: '2', title: "Mom's Birthday", eventType: 'birthday', startTime: new Date(Date.now() + 86400000 * 3).toISOString() },
  { id: '3', title: 'Weekend Hike', eventType: 'vacation', startTime: new Date(Date.now() + 86400000 * 5).toISOString(), location: 'Blue Ridge Trail' },
];

export const mockNewspaper: Newspaper = {
  id: 'np-1',
  title: 'The Malhotra Daily',
  editionDate: new Date().toISOString().split('T')[0],
  sections: [
    { type: 'top_story', title: 'Top Story', content: 'Palak shared 3 new memories today! The family album is looking beautiful.', imageUrl: DEMO_IMAGES[0] },
    { type: 'family_wins', title: 'Family Wins', content: 'Grandma is on a 42-day photo streak! 🔥 Mom completed 30 days straight!' },
    { type: 'birthdays', title: "Today's Birthdays", content: 'No birthdays today — but every day is worth celebrating!' },
    { type: 'upcoming_events', title: 'Upcoming Events', content: '📅 Movie Night — Today\n📅 Mom\'s Birthday — In 3 days' },
    { type: 'weekly_stats', title: 'Weekly Statistics', content: '👨‍👩‍👧‍👦 6 family members • 📸 24 photos this week • 🔥 14-day family streak' },
    { type: 'photo_of_day', title: 'Photo of the Day', content: 'Captured by Palak during golden hour', imageUrl: DEMO_IMAGES[2] },
  ],
};

export const mockDailyChallenge: DailyChallenge = {
  id: 'dc-1',
  challengeDate: new Date().toISOString().split('T')[0],
  prompts: ['Morning coffee ☕', 'Work desk 💻', 'Lunch 🍽️', 'Pet 🐾', 'Sunset 🌅', 'Selfie 🤳'],
  uploads: mockMembers.slice(0, 4).flatMap((m, i) => [
    { id: `up-${i}a`, userId: m.id, displayName: m.displayName, avatarUrl: m.avatarUrl, mediaUrl: DEMO_IMAGES[i], promptLabel: 'Morning coffee ☕' },
    { id: `up-${i}b`, userId: m.id, displayName: m.displayName, avatarUrl: m.avatarUrl, mediaUrl: DEMO_IMAGES[(i + 1) % 6], promptLabel: 'Sunset 🌅' },
  ]),
  members: mockMembers.map((m) => ({ ...m, uploadCount: m.id === '4' || m.id === '5' ? 0 : 2 })),
  progress: { membersCompleted: 4, totalMembers: 6, userUploads: 2 },
};

export const mockMemories: Memory[] = [
  { id: 'm1', title: 'Goa Trip 2025', category: 'trips', coverUrl: DEMO_IMAGES[5], startDate: '2025-01-15', locationName: 'Goa, India' },
  { id: 'm2', title: 'Diwali 2024', category: 'festivals', coverUrl: DEMO_IMAGES[4], startDate: '2024-11-01' },
  { id: 'm3', title: 'Grandma\'s 80th', category: 'birthdays', coverUrl: DEMO_IMAGES[1], startDate: '2024-08-20' },
  { id: 'm4', title: 'Weekend Hikes', category: 'weekends', coverUrl: DEMO_IMAGES[3], startDate: '2025-02-01' },
  { id: 'm5', title: 'Family Dinners', category: 'dinners', coverUrl: DEMO_IMAGES[0], startDate: '2025-03-01' },
  { id: 'm6', title: 'Pet Adventures', category: 'pets', coverUrl: DEMO_IMAGES[2], startDate: '2025-01-01' },
];

export const mockGames: GameType[] = [
  { id: 'family_trivia', name: 'Family Trivia', description: 'Test how well you know each other', icon: '🧠', category: 'Trivia', players: '2-8' },
  { id: 'photo_scavenger_hunt', name: 'Photo Scavenger Hunt', description: 'Find and snap items around you', icon: '📸', category: 'Photo', players: '2-6' },
  { id: 'guess_childhood_photo', name: 'Guess The Photo', description: 'Who is this adorable kid?', icon: '👶', category: 'Photo', players: '2-8' },
  { id: 'emoji_story', name: 'Emoji Story', description: 'Tell a story using only emojis', icon: '😂', category: 'Creative', players: '2-6' },
  { id: 'would_you_rather', name: 'Would You Rather', description: 'Tough choices, big laughs', icon: '🤔', category: 'Party', players: '2-8' },
  { id: 'meme_battle', name: 'Meme Battle', description: 'Create the funniest meme', icon: '😹', category: 'Creative', players: '2-6' },
  { id: 'movie_night_vote', name: 'Movie Night Vote', description: 'Democratic movie picking', icon: '🎬', category: 'Party', players: '2-8' },
  { id: 'secret_santa', name: 'Secret Santa', description: 'Gift exchange made easy', icon: '🎅', category: 'Party', players: '3-12' },
  { id: 'ai_pictionary', name: 'AI Pictionary', description: 'Draw and let AI guess', icon: '🎨', category: 'Creative', players: '2-6' },
  { id: 'family_bingo', name: 'Family Bingo', description: 'Classic bingo, family edition', icon: '🎯', category: 'Party', players: '2-8' },
];

export const mockBucketList: BucketListItem[] = [
  { id: 'b1', title: 'Visit Japan', description: 'Cherry blossoms and ramen', category: 'travel', isCompleted: false },
  { id: 'b2', title: 'See Northern Lights', description: 'Iceland or Norway', category: 'travel', isCompleted: false },
  { id: 'b3', title: 'Family Road Trip', description: 'Cross-country adventure', category: 'travel', isCompleted: true, completedAt: '2024-07-15' },
  { id: 'b4', title: 'Learn Guitar Together', category: 'learning', isCompleted: false },
  { id: 'b5', title: 'Go Skydiving', category: 'adventure', isCompleted: false },
];

export const mockAchievements: Achievement[] = [
  { id: 'a1', achievementType: 'streak', title: '100 Day Streak', description: 'Uploaded photos for 100 days straight', earnedAt: '2025-01-01', userName: 'Grandma' },
  { id: 'a2', achievementType: 'photos', title: '1000 Photos Shared', description: 'Family milestone reached!', earnedAt: '2024-12-15' },
  { id: 'a3', achievementType: 'trip', title: 'First International Trip', description: 'Goa 2025', earnedAt: '2025-01-20', userName: 'Palak' },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', type: 'upload', title: 'Grandma uploaded today\'s memories', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'n2', type: 'challenge', title: 'Only 4 of 6 completed today\'s album', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'n3', type: 'event', title: 'Movie Night begins in 15 minutes', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'n4', type: 'newspaper', title: 'Weekly Newspaper is ready', isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

export const mockPhotoSpots: PhotoSpot[] = [
  { id: 's1', name: 'Sunset Point Park', description: 'Stunning golden hour views', category: 'sunset', bestTime: '5:30 - 7:00 PM', crowdLevel: 'low' },
  { id: 's2', name: 'Hidden Garden Café', description: 'Cozy courtyard with fairy lights', category: 'cafe', bestTime: 'Morning', crowdLevel: 'medium' },
  { id: 's3', name: 'Mural Alley', description: 'Colorful street art backdrop', category: 'murals', bestTime: 'Afternoon', crowdLevel: 'low' },
];

export const mockHomeDashboard: HomeDashboard = {
  family: { id: 'demo-family', name: 'Malhotra', newspaperName: 'The Malhotra Daily', inviteCode: 'MALH2024', familyStreak: 14 },
  members: mockMembers,
  todayEvents: mockEvents.slice(0, 1),
  upcomingBirthdays: [{ displayName: 'Mom', avatarUrl: 'https://i.pravatar.cc/150?u=mom' }],
  recentPosts: mockPosts.slice(0, 4),
  newspaper: mockNewspaper,
  nextEvent: mockEvents[0],
  familyStreak: 14,
};

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
