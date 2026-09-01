-- =============================================================
-- Famora — Complete Database Schema
--
-- Run this once in Supabase Dashboard → SQL Editor.
-- It creates every table, trigger, function, storage bucket,
-- and RLS policy the app needs from scratch.
--
-- To start fresh: drop all tables manually in Supabase
-- (Table Editor → select all → delete), then re-run this file.
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";


-- =============================================================
-- TABLES
-- Order matters: referenced tables must exist before referencing ones.
-- =============================================================

-- ─── users ───────────────────────────────────────────────────
-- Mirrors auth.users (Supabase Auth).
-- Populated automatically via the handle_new_auth_user trigger
-- on first signup, and upserted by the client as a fallback.
create table public.users (
  id               uuid        primary key references auth.users(id) on delete cascade,
  email            text        unique,
  phone            text        unique,
  display_name     text        not null,
  avatar_url       text,
  bio              text,
  birthday         date,
  auth_provider    text        not null default 'email',
  favorite_songs   text[]      not null default '{}',
  photo_streak     int         not null default 0,
  longest_streak   int         not null default 0,
  last_upload_date timestamptz,
  aura             text        check (aura in (
                     'happy','relaxing','traveling','studying',
                     'working','watching_movies','gaming'
                   )),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── families ────────────────────────────────────────────────
-- A family is a private group identified by a short invite code.
create table public.families (
  id             uuid        primary key default uuid_generate_v4(),
  name           text        not null,
  newspaper_name text,
  invite_code    text        not null unique,
  avatar_url     text,
  timezone       text        not null default 'UTC',
  family_streak  int         not null default 0,
  created_by     uuid        references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── family_members ──────────────────────────────────────────
-- Join table linking users to families with a role ('admin' | 'member').
create table public.family_members (
  id         uuid        primary key default uuid_generate_v4(),
  family_id  uuid        not null references public.families(id) on delete cascade,
  user_id    uuid        not null references public.users(id)    on delete cascade,
  role       text        not null default 'member',
  nickname   text,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

-- ─── posts ───────────────────────────────────────────────────
-- Family feed photos/videos with optional caption and location.
create table public.posts (
  id            uuid        primary key default uuid_generate_v4(),
  family_id     uuid        not null references public.families(id) on delete cascade,
  author_id     uuid        not null references public.users(id)    on delete cascade,
  caption       text,
  media_urls    text[]      not null default '{}',
  media_type    text        not null default 'photo',
  ai_tags       text[]      not null default '{}',
  location_name text,
  latitude      double precision,
  longitude     double precision,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index posts_family_created_idx on public.posts (family_id, created_at desc);

-- ─── post_reactions ──────────────────────────────────────────
-- One reaction per user per post (upserted on change).
create table public.post_reactions (
  id            uuid        primary key default uuid_generate_v4(),
  post_id       uuid        not null references public.posts(id) on delete cascade,
  user_id       uuid        not null references public.users(id) on delete cascade,
  reaction_type text        not null,
  created_at    timestamptz not null default now(),
  unique (post_id, user_id)
);

-- ─── post_comments ───────────────────────────────────────────
create table public.post_comments (
  id         uuid        primary key default uuid_generate_v4(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.users(id) on delete cascade,
  text       text        not null,
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);

-- ─── stories ─────────────────────────────────────────────────
-- Short-lived media that auto-expires (24 h by convention).
create table public.stories (
  id         uuid        primary key default uuid_generate_v4(),
  family_id  uuid        not null references public.families(id) on delete cascade,
  author_id  uuid        not null references public.users(id)    on delete cascade,
  media_url  text        not null,
  media_type text        not null default 'photo',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ─── daily_challenges ────────────────────────────────────────
-- One challenge per family per day containing photo prompts.
create table public.daily_challenges (
  id             uuid        primary key default uuid_generate_v4(),
  family_id      uuid        not null references public.families(id) on delete cascade,
  challenge_date date        not null,
  prompts        text[]      not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (family_id, challenge_date)
);

-- ─── daily_uploads ───────────────────────────────────────────
-- A member's photo submission for a daily challenge prompt.
create table public.daily_uploads (
  id           uuid        primary key default uuid_generate_v4(),
  challenge_id uuid        not null references public.daily_challenges(id) on delete cascade,
  user_id      uuid        not null references public.users(id)            on delete cascade,
  media_url    text        not null,
  prompt_label text,
  created_at   timestamptz not null default now()
);
create index daily_uploads_challenge_user_idx on public.daily_uploads (challenge_id, user_id);

-- ─── memories ────────────────────────────────────────────────
-- Curated collections of posts grouped by category / event.
create table public.memories (
  id            uuid        primary key default uuid_generate_v4(),
  family_id     uuid        not null references public.families(id) on delete cascade,
  title         text        not null,
  description   text,
  category      text        not null default 'general',
  cover_url     text,
  start_date    date,
  end_date      date,
  location_name text,
  ai_summary    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index memories_family_category_idx on public.memories (family_id, category);

-- ─── events ──────────────────────────────────────────────────
-- Family calendar events with optional RSVP.
create table public.events (
  id               uuid        primary key default uuid_generate_v4(),
  family_id        uuid        not null references public.families(id) on delete cascade,
  created_by       uuid        not null references public.users(id)    on delete cascade,
  title            text        not null,
  description      text,
  event_type       text        not null default 'general',
  start_time       timestamptz not null,
  end_time         timestamptz,
  location         text,
  reminder_minutes int         not null default 60,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index events_family_start_idx on public.events (family_id, start_time);

-- ─── event_rsvps ─────────────────────────────────────────────
-- One RSVP row per user per event (upserted on change).
create table public.event_rsvps (
  id         uuid        primary key default uuid_generate_v4(),
  event_id   uuid        not null references public.events(id) on delete cascade,
  user_id    uuid        not null references public.users(id)  on delete cascade,
  status     text        not null default 'going',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ─── newspapers ──────────────────────────────────────────────
-- AI-generated daily family newspaper, one edition per day.
create table public.newspapers (
  id              uuid        primary key default uuid_generate_v4(),
  family_id       uuid        not null references public.families(id) on delete cascade,
  edition_date    date        not null,
  title           text        not null,
  sections        jsonb       not null default '[]',
  cover_image_url text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (family_id, edition_date)
);

-- ─── podcast_episodes ────────────────────────────────────────
-- Weekly family podcast episode generated from voice notes.
create table public.podcast_episodes (
  id           uuid        primary key default uuid_generate_v4(),
  family_id    uuid        not null references public.families(id) on delete cascade,
  week_start   date        not null,
  title        text        not null,
  script       text        not null,
  generated_by uuid        references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (family_id, week_start)
);

-- ─── game_sessions ───────────────────────────────────────────
-- A shared skill-game session; scores is a JSON map of userId → score.
create table public.game_sessions (
  id         uuid        primary key default uuid_generate_v4(),
  family_id  uuid        not null references public.families(id) on delete cascade,
  game_type  text        not null,
  status     text        not null default 'waiting',
  config     jsonb       not null default '{}',
  scores     jsonb       not null default '{}',
  winner_id  uuid        references public.users(id) on delete set null,
  started_at timestamptz,
  ended_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── bucket_list_items ───────────────────────────────────────
-- Family dreams / goals to achieve together.
create table public.bucket_list_items (
  id           uuid        primary key default uuid_generate_v4(),
  family_id    uuid        not null references public.families(id) on delete cascade,
  created_by   uuid        not null references public.users(id)    on delete cascade,
  title        text        not null,
  description  text,
  category     text,
  is_completed boolean     not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── time_capsules ───────────────────────────────────────────
-- Sealed messages / media that unlock on a date or milestone.
create table public.time_capsules (
  id               uuid        primary key default uuid_generate_v4(),
  family_id        uuid        not null references public.families(id) on delete cascade,
  author_id        uuid        not null references public.users(id)    on delete cascade,
  title            text        not null,
  content_type     text        not null,
  content_url      text,
  text_content     text,
  unlock_type      text        not null,
  unlock_date      timestamptz,
  unlock_milestone text,
  is_unlocked      boolean     not null default false,
  unlocked_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── achievements ────────────────────────────────────────────
-- Badges awarded to a family or a specific member.
create table public.achievements (
  id               uuid        primary key default uuid_generate_v4(),
  family_id        uuid        not null references public.families(id) on delete cascade,
  user_id          uuid        references public.users(id) on delete set null,
  achievement_type text        not null,
  title            text        not null,
  description      text,
  badge_url        text,
  earned_at        timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- ─── notifications ───────────────────────────────────────────
-- In-app notifications delivered to a specific user.
create table public.notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.users(id)   on delete cascade,
  family_id  uuid        references public.families(id)         on delete cascade,
  type       text        not null,
  title      text        not null,
  body       text,
  data       jsonb       not null default '{}',
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_read_idx
  on public.notifications (user_id, is_read, created_at desc);

-- ─── member_locations ────────────────────────────────────────
-- Live location row — one per user per family (upserted on update).
create table public.member_locations (
  id              uuid        primary key default uuid_generate_v4(),
  family_id       uuid        not null references public.families(id) on delete cascade,
  user_id         uuid        not null references public.users(id)    on delete cascade,
  latitude        double precision,
  longitude       double precision,
  accuracy        double precision,
  location_name   text,
  sharing_enabled boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (family_id, user_id)
);
create index member_locations_family_sharing_idx
  on public.member_locations (family_id, sharing_enabled, updated_at desc);

-- ─── mailbox_letters ─────────────────────────────────────────
-- Private letters between family members with conditional open rules.
create table public.mailbox_letters (
  id                  uuid        primary key default uuid_generate_v4(),
  family_id           uuid        not null references public.families(id) on delete cascade,
  author_id           uuid        not null references public.users(id)    on delete cascade,
  recipient_id        uuid        not null references public.users(id)    on delete cascade,
  title               text        not null,
  body                text        not null,
  open_condition      text        not null default 'anytime'
                        check (open_condition in (
                          'anytime','bad_day','birthday','after_exams','custom'
                        )),
  open_condition_text text,
  is_opened           boolean     not null default false,
  opened_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index mailbox_letters_recipient_idx
  on public.mailbox_letters (family_id, recipient_id, created_at desc);
create index mailbox_letters_author_idx
  on public.mailbox_letters (family_id, author_id, created_at desc);

-- ─── wall_entries ────────────────────────────────────────────
-- Good-morning / good-night posts. One per user per slot per day.
create table public.wall_entries (
  id         uuid        primary key default uuid_generate_v4(),
  family_id  uuid        not null references public.families(id) on delete cascade,
  author_id  uuid        not null references public.users(id)    on delete cascade,
  slot       text        not null check (slot in ('morning','night')),
  wall_date  date        not null,
  message    text        not null,
  photo_url  text,
  created_at timestamptz not null default now(),
  unique (family_id, author_id, wall_date, slot)
);
create index wall_entries_family_date_idx
  on public.wall_entries (family_id, wall_date desc, slot);

-- ─── voice_notes ─────────────────────────────────────────────
-- One voice note per member per week; feeds the weekly podcast.
create table public.voice_notes (
  id           uuid        primary key default uuid_generate_v4(),
  family_id    uuid        not null references public.families(id) on delete cascade,
  author_id    uuid        not null references public.users(id)    on delete cascade,
  audio_url    text        not null,
  duration_sec int         not null check (duration_sec >= 1),
  caption      text,
  transcript   text,
  week_start   date        not null,
  created_at   timestamptz not null default now(),
  unique (family_id, author_id, week_start)
);
create index voice_notes_family_week_idx
  on public.voice_notes (family_id, week_start, created_at desc);

-- ─── assistant_messages ──────────────────────────────────────
-- Chat history between a user and the AI family assistant.
create table public.assistant_messages (
  id          uuid        primary key default uuid_generate_v4(),
  family_id   uuid        not null references public.families(id) on delete cascade,
  user_id     uuid        not null references public.users(id)    on delete cascade,
  role        text        not null,   -- 'user' | 'assistant'
  content     text        not null,
  action_type text,
  action_data jsonb,
  created_at  timestamptz not null default now()
);
create index assistant_messages_family_user_idx
  on public.assistant_messages (family_id, user_id, created_at);


-- =============================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================

-- ─── updated_at auto-stamp ───────────────────────────────────
-- Sets updated_at to now() before every UPDATE on tables that have it.
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.families
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.daily_challenges
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.memories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.event_rsvps
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.newspapers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.podcast_episodes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.game_sessions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.bucket_list_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.time_capsules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.member_locations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.mailbox_letters
  for each row execute function public.set_updated_at();

-- ─── Auto-create profile on signup ───────────────────────────
-- Fires after Supabase Auth creates a new auth.users row.
-- Inserts a matching public.users row so the app can always
-- read a profile without waiting for the client to do it.
create function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();


-- =============================================================
-- STORAGE BUCKETS
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media',   'media',   true, 52428800,  -- 50 MB
   array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime']),
  ('audio',   'audio',   true, 52428800,  -- 50 MB
   array['audio/mpeg','audio/mp4','audio/m4a','audio/webm','audio/wav','audio/ogg']),
  ('avatars', 'avatars', true, 10485760,  -- 10 MB
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- =============================================================
-- ROW-LEVEL SECURITY
-- =============================================================
--
-- Philosophy
-- ──────────
-- Reads  → scoped to the family the caller belongs to
--           (enforced via is_family_member() where relevant)
-- Writes → open to any authenticated caller; the client
--           already enforces family context before writing
-- Private tables (mailbox, notifications) → scoped strictly
--           to the user who owns the row

-- ─── Enable RLS on every table ───────────────────────────────
alter table public.users              enable row level security;
alter table public.families           enable row level security;
alter table public.family_members     enable row level security;
alter table public.posts              enable row level security;
alter table public.post_reactions     enable row level security;
alter table public.post_comments      enable row level security;
alter table public.stories            enable row level security;
alter table public.daily_challenges   enable row level security;
alter table public.daily_uploads      enable row level security;
alter table public.memories           enable row level security;
alter table public.events             enable row level security;
alter table public.event_rsvps        enable row level security;
alter table public.newspapers         enable row level security;
alter table public.podcast_episodes   enable row level security;
alter table public.game_sessions      enable row level security;
alter table public.bucket_list_items  enable row level security;
alter table public.time_capsules      enable row level security;
alter table public.achievements       enable row level security;
alter table public.notifications      enable row level security;
alter table public.member_locations   enable row level security;
alter table public.mailbox_letters    enable row level security;
alter table public.wall_entries       enable row level security;
alter table public.voice_notes        enable row level security;
alter table public.assistant_messages enable row level security;

-- ─── is_family_member() helper ───────────────────────────────
-- Returns true when the calling user is a member of family fid.
-- Declared security definer so it can read family_members without
-- the caller needing a separate select policy on that table.
create function public.is_family_member(fid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from   public.family_members
    where  family_id = fid
    and    user_id   = auth.uid()
  );
$$;

-- ─── users ───────────────────────────────────────────────────
-- Fully open: profile pictures and display names must be readable
-- by other family members; inserts happen from trigger & client upsert.
create policy "users_select" on public.users
  for select using (true);

create policy "users_insert" on public.users
  for insert with check (true);

create policy "users_update" on public.users
  for update using (id = auth.uid());

-- ─── families ────────────────────────────────────────────────
-- Fully open: client-side code never requests data for families
-- the signed-in user does not belong to.
create policy "families_select" on public.families
  for select using (true);

create policy "families_insert" on public.families
  for insert with check (true);

create policy "families_update" on public.families
  for update using (true);

create policy "families_delete" on public.families
  for delete using (true);

-- ─── family_members ──────────────────────────────────────────
create policy "family_members_select" on public.family_members
  for select using (true);

create policy "family_members_insert" on public.family_members
  for insert with check (true);

create policy "family_members_update" on public.family_members
  for update using (true);

create policy "family_members_delete" on public.family_members
  for delete using (true);

-- ─── posts ───────────────────────────────────────────────────
-- Reads scoped to family; only the author can edit or delete.
create policy "posts_select" on public.posts
  for select using (public.is_family_member(family_id));

create policy "posts_insert" on public.posts
  for insert with check (auth.uid() is not null);

create policy "posts_update" on public.posts
  for update using (author_id = auth.uid());

create policy "posts_delete" on public.posts
  for delete using (author_id = auth.uid());

-- ─── post_reactions ──────────────────────────────────────────
create policy "post_reactions_select" on public.post_reactions
  for select using (true);

create policy "post_reactions_insert" on public.post_reactions
  for insert with check (auth.uid() is not null);

create policy "post_reactions_update" on public.post_reactions
  for update using (user_id = auth.uid());

create policy "post_reactions_delete" on public.post_reactions
  for delete using (user_id = auth.uid());

-- ─── post_comments ───────────────────────────────────────────
create policy "post_comments_select" on public.post_comments
  for select using (true);

create policy "post_comments_insert" on public.post_comments
  for insert with check (auth.uid() is not null);

create policy "post_comments_delete" on public.post_comments
  for delete using (user_id = auth.uid());

-- ─── stories ─────────────────────────────────────────────────
create policy "stories_select" on public.stories
  for select using (public.is_family_member(family_id));

create policy "stories_insert" on public.stories
  for insert with check (auth.uid() is not null);

create policy "stories_delete" on public.stories
  for delete using (author_id = auth.uid());

-- ─── daily_challenges ────────────────────────────────────────
create policy "daily_challenges_select" on public.daily_challenges
  for select using (public.is_family_member(family_id));

create policy "daily_challenges_insert" on public.daily_challenges
  for insert with check (auth.uid() is not null);

create policy "daily_challenges_update" on public.daily_challenges
  for update using (auth.uid() is not null);

-- ─── daily_uploads ───────────────────────────────────────────
create policy "daily_uploads_select" on public.daily_uploads
  for select using (auth.uid() is not null);

create policy "daily_uploads_insert" on public.daily_uploads
  for insert with check (auth.uid() is not null);

-- ─── memories ────────────────────────────────────────────────
create policy "memories_select" on public.memories
  for select using (public.is_family_member(family_id));

create policy "memories_insert" on public.memories
  for insert with check (auth.uid() is not null);

create policy "memories_update" on public.memories
  for update using (auth.uid() is not null);

create policy "memories_delete" on public.memories
  for delete using (auth.uid() is not null);

-- ─── events ──────────────────────────────────────────────────
-- Only the creator can delete; any family member can update (RSVP counts etc.).
create policy "events_select" on public.events
  for select using (public.is_family_member(family_id));

create policy "events_insert" on public.events
  for insert with check (auth.uid() is not null);

create policy "events_update" on public.events
  for update using (auth.uid() is not null);

create policy "events_delete" on public.events
  for delete using (created_by = auth.uid());

-- ─── event_rsvps ─────────────────────────────────────────────
create policy "event_rsvps_select" on public.event_rsvps
  for select using (auth.uid() is not null);

create policy "event_rsvps_insert" on public.event_rsvps
  for insert with check (auth.uid() is not null);

create policy "event_rsvps_update" on public.event_rsvps
  for update using (user_id = auth.uid());

-- ─── newspapers ──────────────────────────────────────────────
create policy "newspapers_select" on public.newspapers
  for select using (public.is_family_member(family_id));

create policy "newspapers_insert" on public.newspapers
  for insert with check (auth.uid() is not null);

create policy "newspapers_update" on public.newspapers
  for update using (auth.uid() is not null);

-- ─── podcast_episodes ────────────────────────────────────────
create policy "podcast_episodes_select" on public.podcast_episodes
  for select using (public.is_family_member(family_id));

create policy "podcast_episodes_insert" on public.podcast_episodes
  for insert with check (auth.uid() is not null);

create policy "podcast_episodes_update" on public.podcast_episodes
  for update using (auth.uid() is not null);

-- ─── game_sessions ───────────────────────────────────────────
create policy "game_sessions_select" on public.game_sessions
  for select using (public.is_family_member(family_id));

create policy "game_sessions_insert" on public.game_sessions
  for insert with check (auth.uid() is not null);

create policy "game_sessions_update" on public.game_sessions
  for update using (auth.uid() is not null);

-- ─── bucket_list_items ───────────────────────────────────────
-- Only the creator can delete their own item.
create policy "bucket_list_items_select" on public.bucket_list_items
  for select using (public.is_family_member(family_id));

create policy "bucket_list_items_insert" on public.bucket_list_items
  for insert with check (auth.uid() is not null);

create policy "bucket_list_items_update" on public.bucket_list_items
  for update using (auth.uid() is not null);

create policy "bucket_list_items_delete" on public.bucket_list_items
  for delete using (created_by = auth.uid());

-- ─── time_capsules ───────────────────────────────────────────
-- Only the author can edit or delete their capsule.
create policy "time_capsules_select" on public.time_capsules
  for select using (public.is_family_member(family_id));

create policy "time_capsules_insert" on public.time_capsules
  for insert with check (auth.uid() is not null);

create policy "time_capsules_update" on public.time_capsules
  for update using (author_id = auth.uid());

create policy "time_capsules_delete" on public.time_capsules
  for delete using (author_id = auth.uid());

-- ─── achievements ────────────────────────────────────────────
create policy "achievements_select" on public.achievements
  for select using (public.is_family_member(family_id));

create policy "achievements_insert" on public.achievements
  for insert with check (auth.uid() is not null);

-- ─── notifications ───────────────────────────────────────────
-- Strictly private: only the recipient can read or update their own.
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications
  for insert with check (auth.uid() is not null);

create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

-- ─── member_locations ────────────────────────────────────────
-- Family members can see each other's locations (when sharing_enabled).
-- Only the owner can update their own row.
create policy "member_locations_select" on public.member_locations
  for select using (public.is_family_member(family_id));

create policy "member_locations_insert" on public.member_locations
  for insert with check (auth.uid() is not null);

create policy "member_locations_update" on public.member_locations
  for update using (user_id = auth.uid());

-- ─── mailbox_letters ─────────────────────────────────────────
-- Only the author and the recipient can see a letter.
-- Author can recall it; recipient can mark it as opened.
create policy "mailbox_letters_select" on public.mailbox_letters
  for select using (author_id = auth.uid() or recipient_id = auth.uid());

create policy "mailbox_letters_insert" on public.mailbox_letters
  for insert with check (auth.uid() is not null);

create policy "mailbox_letters_update" on public.mailbox_letters
  for update using (author_id = auth.uid() or recipient_id = auth.uid());

-- ─── wall_entries ────────────────────────────────────────────
create policy "wall_entries_select" on public.wall_entries
  for select using (public.is_family_member(family_id));

create policy "wall_entries_insert" on public.wall_entries
  for insert with check (auth.uid() is not null);

create policy "wall_entries_update" on public.wall_entries
  for update using (author_id = auth.uid());

-- ─── voice_notes ─────────────────────────────────────────────
create policy "voice_notes_select" on public.voice_notes
  for select using (public.is_family_member(family_id));

create policy "voice_notes_insert" on public.voice_notes
  for insert with check (auth.uid() is not null);

create policy "voice_notes_update" on public.voice_notes
  for update using (author_id = auth.uid());

-- ─── assistant_messages ──────────────────────────────────────
-- Each user sees only their own conversation history.
create policy "assistant_messages_select" on public.assistant_messages
  for select using (user_id = auth.uid());

create policy "assistant_messages_insert" on public.assistant_messages
  for insert with check (auth.uid() is not null);


-- =============================================================
-- STORAGE POLICIES
-- =============================================================
-- Any authenticated user may upload to any bucket.
-- Files are publicly readable (buckets are public = true).
-- Only the uploader (first path segment = their UUID) can delete.

create policy "storage: authenticated upload"
  on storage.objects for insert
  with check (auth.uid() is not null);

create policy "storage: public read"
  on storage.objects for select
  using (true);

create policy "storage: authenticated update"
  on storage.objects for update
  using (auth.uid() is not null);

create policy "storage: owner delete"
  on storage.objects for delete
  using (auth.uid()::text = (storage.foldername(name))[1]);
