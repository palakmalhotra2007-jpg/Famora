# HomeHub — Information Architecture

## Product Overview

**HomeHub** is a private, invitation-only digital home for families. No public profiles, followers, or ads. All content is scoped to a **Family** unit.

## Core Entities

| Entity | Description |
|--------|-------------|
| **User** | Individual account (auth via Google, Apple, phone, email) |
| **Family** | Private group; one user can belong to multiple families |
| **FamilyMember** | User ↔ Family join with role (admin, member, child) |
| **Post** | Photo/video with caption, reactions, comments |
| **Story** | 24h ephemeral content |
| **DailyChallenge** | Daily photo prompts per family |
| **DailyUpload** | Member's daily photo submissions |
| **Memory** | AI-organized memory cluster (trips, festivals, etc.) |
| **Event** | Calendar event with RSVP |
| **Newspaper** | AI-generated daily family edition |
| **Playlist** | Shared Spotify playlist metadata |
| **Game** | Family game session & scores |
| **BucketListItem** | Shared family dreams |
| **TimeCapsule** | Locked content until unlock date |
| **Achievement** | Milestones & badges |
| **Notification** | Push/in-app notifications |
| **Spot** | AI-recommended photo locations |

## Navigation Hierarchy

```
App
├── Auth Stack
│   ├── Welcome
│   ├── Sign In (Google / Apple / Phone / Email)
│   ├── Create Family
│   └── Join Family (Invite Code)
│
└── Main Tabs
    ├── 🏠 Home
    │   ├── Home Dashboard
    │   ├── Family Newspaper (detail)
    │   ├── Today's Events
    │   └── Quick Actions
    │
    ├── 📸 Memories
    │   ├── Feed (Family Instagram)
    │   ├── Stories
    │   ├── Daily Challenge
    │   ├── Timeline
    │   ├── Map
    │   └── Time Capsules
    │
    ├── 🎮 Family
    │   ├── Games Hub
    │   ├── Game Detail / Play
    │   ├── Bucket List
    │   ├── Achievements
    │   └── AI Assistant
    │
    ├── 🎵 Media
    │   ├── Now Playing
    │   ├── Playlists
    │   ├── Weekly/Monthly Movies
    │   └── Photo Spots
    │
    └── 👤 Profile
        ├── My Profile
        ├── Family Members
        ├── Settings
        ├── Notifications
        └── Travel Stats
```

## Feature Modules

### Module 1: Family Newspaper
- **Trigger**: Cron job daily at 6 AM (family timezone)
- **Data sources**: Posts, events, birthdays, streaks, travel
- **Output**: Structured sections + PDF/image export
- **API**: `GET /api/newspapers/today`, `GET /api/newspapers/:id/export`

### Module 2: Family Feed
- **CRUD**: Posts, albums, stories
- **Reactions**: loved, funny, emotional, proud, celebrate
- **AI**: Auto-tagging into categories
- **API**: `/api/posts`, `/api/stories`, `/api/reactions`

### Module 3: Daily Photo Challenge
- **Rules**: 2+ photos/day per member
- **Reminders**: Push when incomplete
- **Outputs**: Daily album, weekly movie, streaks
- **API**: `/api/challenges/today`, `/api/challenges/upload`

### Module 4: Memory Timeline
- **AI search**: Natural language queries
- **Clusters**: trips, festivals, birthdays, pets, etc.
- **API**: `/api/memories`, `/api/memories/search`

### Module 5: Family Map
- **Geo from EXIF** on uploads
- **Stats**: countries, cities, bucket map
- **API**: `/api/map/pins`, `/api/map/stats`

### Module 6: Shared Music
- **Spotify OAuth** + playlist sync
- **Now playing** via Spotify API
- **API**: `/api/music/playlists`, `/api/music/now-playing`

### Module 7: Events
- **Types**: birthday, anniversary, vacation, etc.
- **RSVP**, countdowns, reminders
- **API**: `/api/events`

### Module 8: Photo Spots
- **AI recommendations** based on location + season
- **Golden hour** notifications
- **API**: `/api/spots/nearby`, `/api/spots/recommendations`

### Module 9: Family Games
- **16+ game types** with scoring & leaderboards
- **API**: `/api/games`, `/api/games/:id/sessions`

### Module 10: Bucket List
- **Shared dreams** with completion tracking
- **API**: `/api/bucket-list`

### Module 11: Time Capsule
- **Lock until** date or milestone
- **API**: `/api/time-capsules`

### Module 12: Achievements
- **Auto-detected** milestones
- **Celebration cards** via AI
- **API**: `/api/achievements`

### Module 13: AI Assistant
- **Concierge** actions: summaries, itineraries, gifts, collages
- **API**: `/api/assistant/chat`, `/api/assistant/actions`

## Data Flow

```
Mobile App (Expo)
    ↓ REST (React Query)
Express API
    ↓                    ↓
MongoDB               Redis (cache, sessions, pub/sub)
    ↓
S3 / Firebase Storage (media)
    ↓
OpenAI (newspaper, search, assistant)
Spotify API (music)
FCM (push)
Socket.io (realtime)
```

## Security Model

- JWT access + refresh tokens
- Family-scoped authorization on every resource
- Invite codes for family join (expiring)
- No cross-family data leakage
- Rate limiting on AI endpoints

## Folder Structure

```
homehub/
├── docs/
├── frontend/          # React Native (Expo)
└── backend/           # Node.js + Express + MongoDB
```
