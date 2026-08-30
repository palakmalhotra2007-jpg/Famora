# Famora — Supabase Setup Guide

Famora now runs **entirely on Supabase** — no separate backend server needed.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public key** from  
   `Project Settings → API`.

---

## 2. Run the database schema

1. Open the **SQL Editor** in your Supabase dashboard.
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`.
3. Paste and click **Run**.

This creates all tables, row-level security policies, and storage buckets.

---

## 3. Configure the app

Copy `src/client/.env.example` to `src/client/.env` and fill in your values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

The anon key is safe to expose — all data access is controlled by RLS policies.

---

## 4. Supabase Auth settings

In your Supabase dashboard under **Authentication → Settings**:

- **Email confirmations** — disable for development, enable for production.
- **Site URL** — set to your app's URL / deep link scheme.

---

## 5. Storage buckets

The SQL migration creates three public buckets automatically:

| Bucket   | Purpose                          |
|----------|----------------------------------|
| `media`  | Photos, post images              |
| `audio`  | Voice notes                      |
| `avatars`| Profile pictures                 |

---

## 6. Run the app

```bash
cd src/client
npm install
npx expo start
```

---

## Optional: AI features (Newspaper & Assistant)

Full AI features (newspaper generation, family assistant) require a  
**Supabase Edge Function** that calls OpenAI. Until then:

- The Newspaper screen shows content stored directly in the `newspapers` table.
- The Assistant screen stores messages but replies with a placeholder.

To add full AI, deploy an Edge Function that reads from the DB, calls  
OpenAI, and writes the response back. See the Supabase Edge Functions docs:  
https://supabase.com/docs/guides/functions

---

## Architecture overview

```
React Native (Expo) app
        │
        ▼
@supabase/supabase-js
        │
   ┌────┴────┐
   │ Auth    │  signUp / signInWithPassword / onAuthStateChange
   │ DB      │  postgres via PostgREST (typed queries)
   │ Storage │  media, audio, avatars
   └─────────┘
        │
   Supabase (hosted Postgres + Auth + Storage + Realtime)
```
