-- ============================================================
-- Famora – Supabase Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (mirrors auth.users via trigger, extra profile fields)
-- ============================================================
create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  phone           text,
  display_name    text not null default 'User',
  avatar_url      text,
  bio             text,
  birthday        date,
  auth_provider   text not null default 'email',
  favorite_songs  text[] not null default '{}',
  photo_streak    integer not null default 0,
  longest_streak  integer not null default 0,
  last_upload_date timestamptz,
  aura            text check (aura in ('happy','relaxing','traveling','studying','working','watching_movies','gaming')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile row on new auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'User')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FAMILIES
-- ============================================================
create table if not exists public.families (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  newspaper_name  text,
  invite_code     text not null unique,
  avatar_url      text,
  timezone        text not null default 'UTC',
  family_streak   integer not null default 0,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- FAMILY MEMBERS
-- ============================================================
create table if not exists public.family_members (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  role        text not null default 'member',
  nickname    text,
  created_at  timestamptz not null default now(),
  unique (family_id, user_id)
);

create index if not exists idx_family_members_family on public.family_members(family_id);
create index if not exists idx_family_members_user   on public.family_members(user_id);

-- ============================================================
-- POSTS
-- ============================================================
create table if not exists public.posts (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  author_id     uuid not null references public.users(id) on delete cascade,
  caption       text,
  media_urls    text[] not null default '{}',
  media_type    text not null default 'photo',
  ai_tags       text[] not null default '{}',
  location_name text,
  latitude      double precision,
  longitude     double precision,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_posts_family_created on public.posts(family_id, created_at desc);

-- ============================================================
-- POST REACTIONS
-- ============================================================
create table if not exists public.post_reactions (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('loved','funny','emotional','proud','celebrate')),
  created_at    timestamptz not null default now(),
  unique (post_id, user_id)
);

-- ============================================================
-- POST COMMENTS
-- ============================================================
create table if not exists public.post_comments (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_post_comments_post on public.post_comments(post_id, created_at);

-- ============================================================
-- STORIES
-- ============================================================
create table if not exists public.stories (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  author_id   uuid not null references public.users(id) on delete cascade,
  media_url   text not null,
  media_type  text not null default 'photo',
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- DAILY CHALLENGES
-- ============================================================
create table if not exists public.daily_challenges (
  id              uuid primary key default uuid_generate_v4(),
  family_id       uuid not null references public.families(id) on delete cascade,
  challenge_date  date not null,
  prompts         text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (family_id, challenge_date)
);

-- ============================================================
-- DAILY UPLOADS
-- ============================================================
create table if not exists public.daily_uploads (
  id           uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  media_url    text not null,
  prompt_label text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- MEMORIES
-- ============================================================
create table if not exists public.memories (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  title         text not null,
  description   text,
  category      text not null default 'general',
  cover_url     text,
  start_date    date,
  end_date      date,
  location_name text,
  ai_summary    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- EVENTS
-- ============================================================
create table if not exists public.events (
  id                uuid primary key default uuid_generate_v4(),
  family_id         uuid not null references public.families(id) on delete cascade,
  created_by        uuid not null references public.users(id) on delete cascade,
  title             text not null,
  description       text,
  event_type        text not null default 'general',
  start_time        timestamptz not null,
  end_time          timestamptz,
  location          text,
  reminder_minutes  integer not null default 60,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_events_family_start on public.events(family_id, start_time);

-- ============================================================
-- EVENT RSVPs
-- ============================================================
create table if not exists public.event_rsvps (
  id          uuid primary key default uuid_generate_v4(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ============================================================
-- NEWSPAPERS
-- ============================================================
create table if not exists public.newspapers (
  id              uuid primary key default uuid_generate_v4(),
  family_id       uuid not null references public.families(id) on delete cascade,
  edition_date    date not null,
  title           text not null,
  sections        jsonb not null default '[]',
  cover_image_url text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (family_id, edition_date)
);

-- ============================================================
-- PODCAST EPISODES
-- ============================================================
create table if not exists public.podcast_episodes (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  week_start    date not null,
  title         text not null,
  script        text not null,
  generated_by  uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (family_id, week_start)
);

-- ============================================================
-- GAME SESSIONS
-- ============================================================
create table if not exists public.game_sessions (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  game_type   text not null,
  status      text not null default 'waiting',
  config      jsonb not null default '{}',
  scores      jsonb not null default '{}',
  winner_id   uuid references public.users(id) on delete set null,
  started_at  timestamptz,
  ended_at    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- BUCKET LIST ITEMS
-- ============================================================
create table if not exists public.bucket_list_items (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  created_by    uuid not null references public.users(id) on delete cascade,
  title         text not null,
  description   text,
  category      text,
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TIME CAPSULES
-- ============================================================
create table if not exists public.time_capsules (
  id                uuid primary key default uuid_generate_v4(),
  family_id         uuid not null references public.families(id) on delete cascade,
  author_id         uuid not null references public.users(id) on delete cascade,
  title             text not null,
  content_type      text not null,
  content_url       text,
  text_content      text,
  unlock_type       text not null,
  unlock_date       timestamptz,
  unlock_milestone  text,
  is_unlocked       boolean not null default false,
  unlocked_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
create table if not exists public.achievements (
  id               uuid primary key default uuid_generate_v4(),
  family_id        uuid not null references public.families(id) on delete cascade,
  user_id          uuid references public.users(id) on delete set null,
  achievement_type text not null,
  title            text not null,
  description      text,
  badge_url        text,
  earned_at        timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  family_id   uuid references public.families(id) on delete set null,
  type        text not null,
  title       text not null,
  body        text,
  data        jsonb not null default '{}',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

-- ============================================================
-- MEMBER LOCATIONS
-- ============================================================
create table if not exists public.member_locations (
  id               uuid primary key default uuid_generate_v4(),
  family_id        uuid not null references public.families(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  latitude         double precision,
  longitude        double precision,
  accuracy         double precision,
  location_name    text,
  sharing_enabled  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (family_id, user_id)
);

create index if not exists idx_member_locations_family on public.member_locations(family_id, sharing_enabled, updated_at desc);

-- ============================================================
-- MAILBOX LETTERS
-- ============================================================
create table if not exists public.mailbox_letters (
  id                   uuid primary key default uuid_generate_v4(),
  family_id            uuid not null references public.families(id) on delete cascade,
  author_id            uuid not null references public.users(id) on delete cascade,
  recipient_id         uuid not null references public.users(id) on delete cascade,
  title                text not null,
  body                 text not null,
  open_condition       text not null default 'anytime' check (open_condition in ('anytime','bad_day','birthday','after_exams','custom')),
  open_condition_text  text,
  is_opened            boolean not null default false,
  opened_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_mailbox_recipient on public.mailbox_letters(family_id, recipient_id, created_at desc);
create index if not exists idx_mailbox_author    on public.mailbox_letters(family_id, author_id,    created_at desc);

-- ============================================================
-- WALL ENTRIES
-- ============================================================
create table if not exists public.wall_entries (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  author_id   uuid not null references public.users(id) on delete cascade,
  slot        text not null check (slot in ('morning', 'night')),
  wall_date   date not null,
  message     text not null,
  photo_url   text,
  created_at  timestamptz not null default now(),
  unique (family_id, author_id, wall_date, slot)
);

create index if not exists idx_wall_entries_family on public.wall_entries(family_id, wall_date desc, slot);

-- ============================================================
-- VOICE NOTES
-- ============================================================
create table if not exists public.voice_notes (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  author_id     uuid not null references public.users(id) on delete cascade,
  audio_url     text not null,
  duration_sec  integer not null,
  caption       text,
  transcript    text,
  week_start    date not null,
  created_at    timestamptz not null default now(),
  unique (family_id, author_id, week_start)
);

create index if not exists idx_voice_notes_family on public.voice_notes(family_id, week_start, created_at desc);

-- ============================================================
-- ASSISTANT MESSAGES
-- ============================================================
create table if not exists public.assistant_messages (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references public.families(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  action_type  text,
  action_data  jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_assistant_messages_family on public.assistant_messages(family_id, created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users             enable row level security;
alter table public.families          enable row level security;
alter table public.family_members    enable row level security;
alter table public.posts             enable row level security;
alter table public.post_reactions    enable row level security;
alter table public.post_comments     enable row level security;
alter table public.stories           enable row level security;
alter table public.daily_challenges  enable row level security;
alter table public.daily_uploads     enable row level security;
alter table public.memories          enable row level security;
alter table public.events            enable row level security;
alter table public.event_rsvps       enable row level security;
alter table public.newspapers        enable row level security;
alter table public.podcast_episodes  enable row level security;
alter table public.game_sessions     enable row level security;
alter table public.bucket_list_items enable row level security;
alter table public.time_capsules     enable row level security;
alter table public.achievements      enable row level security;
alter table public.notifications     enable row level security;
alter table public.member_locations  enable row level security;
alter table public.mailbox_letters   enable row level security;
alter table public.wall_entries      enable row level security;
alter table public.voice_notes       enable row level security;
alter table public.assistant_messages enable row level security;

-- Helper: check if the current user is a member of a family
create or replace function public.is_family_member(fam_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.family_members
    where family_id = fam_id and user_id = auth.uid()
  );
$$;

-- USERS: own profile readable by self; display info readable by family co-members
create policy "users: read own"       on public.users for select using (id = auth.uid());
create policy "users: update own"     on public.users for update using (id = auth.uid());
create policy "users: read co-member" on public.users for select using (
  exists (
    select 1 from public.family_members fm1
    join public.family_members fm2 on fm1.family_id = fm2.family_id
    where fm1.user_id = auth.uid() and fm2.user_id = users.id
  )
);

-- FAMILIES: readable / manageable only by members
create policy "families: read member"   on public.families for select using (is_family_member(id));
create policy "families: insert"        on public.families for insert with check (auth.uid() = created_by);
create policy "families: update member" on public.families for update using (is_family_member(id));

-- FAMILY MEMBERS: members can read; insert restricted by family membership or initial creation
create policy "family_members: read"   on public.family_members for select using (is_family_member(family_id));
create policy "family_members: insert" on public.family_members for insert with check (
  user_id = auth.uid() or is_family_member(family_id)
);
create policy "family_members: delete own" on public.family_members for delete using (user_id = auth.uid());

-- Generic family-scoped tables: SELECT, INSERT, UPDATE, DELETE for family members only
-- POSTS
create policy "posts: family member" on public.posts for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "post_reactions: family member" on public.post_reactions for all using (is_family_member((select family_id from public.posts where id = post_id))) with check (true);
create policy "post_comments: family member" on public.post_comments for all using (is_family_member((select family_id from public.posts where id = post_id))) with check (true);
create policy "stories: family member" on public.stories for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "daily_challenges: family member" on public.daily_challenges for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "daily_uploads: family member" on public.daily_uploads for all using (is_family_member((select family_id from public.daily_challenges where id = challenge_id))) with check (true);
create policy "memories: family member" on public.memories for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "events: family member" on public.events for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "event_rsvps: family member" on public.event_rsvps for all using (is_family_member((select family_id from public.events where id = event_id))) with check (true);
create policy "newspapers: family member" on public.newspapers for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "podcast_episodes: family member" on public.podcast_episodes for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "game_sessions: family member" on public.game_sessions for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "bucket_list_items: family member" on public.bucket_list_items for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "time_capsules: family member" on public.time_capsules for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "achievements: family member" on public.achievements for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "member_locations: family member" on public.member_locations for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "mailbox_letters: family member" on public.mailbox_letters for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "wall_entries: family member" on public.wall_entries for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "voice_notes: family member" on public.voice_notes for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "assistant_messages: family member" on public.assistant_messages for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- NOTIFICATIONS: own only
create policy "notifications: own" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('audio', 'audio', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

-- Storage policies
create policy "media: family upload" on storage.objects for insert with check (
  bucket_id in ('media','audio','avatars') and auth.uid() is not null
);
create policy "media: public read" on storage.objects for select using (
  bucket_id in ('media','audio','avatars')
);
create policy "media: owner delete" on storage.objects for delete using (
  bucket_id in ('media','audio','avatars') and auth.uid()::text = (storage.foldername(name))[1]
);
