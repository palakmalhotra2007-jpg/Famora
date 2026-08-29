# Famora

A private digital home for families — connect, share memories, play games, and stay close despite distance.

## Architecture

```
famora/
├── docs/                 # Information architecture & UI flows
├── frontend/             # React Native (Expo) + TypeScript
└── backend/              # Node.js + Express + MongoDB + Redis
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Expo), TypeScript, React Navigation, Zustand, React Query |
| API | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Cache | Redis |
| Realtime | Socket.io |
| Storage | AWS S3 / Firebase Storage |
| AI | OpenAI API |
| Music | Spotify API |
| Push | Firebase Cloud Messaging |

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 7+
- Redis 7+
- Expo CLI (`npm install -g expo-cli`)

### Run Everything Concurrently

```bash
npm run dev
```

### Or Run Separately

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Features

- 🏠 **Home Dashboard** — Living room with streaks, events, newspaper preview
- 📰 **Family Newspaper** — AI-generated daily edition
- 📸 **Family Feed** — Private photo/video sharing with reactions
- 📷 **Daily Photo Challenge** — 2 photos/day, streaks, weekly movies
- 🗓 **Memory Timeline** — AI-organized memories with natural language search
- 🗺 **Family Map** — Geo-tagged photos and travel stats
- 🎵 **Shared Music** — Spotify playlists
- 📅 **Events** — Shared calendar with RSVP
- 📍 **Photo Spots** — AI location recommendations
- 🎮 **Family Games** — 16+ multiplayer games
- ✈️ **Bucket List** — Shared family dreams
- ⏳ **Time Capsules** — Locked memories
- 🏆 **Achievements** — Milestones and badges
- 🤖 **AI Assistant** — Family concierge

## Documentation

- [Information Architecture](./docs/INFORMATION_ARCHITECTURE.md)
- [UI Flows & Design System](./docs/UI_FLOWS.md)
