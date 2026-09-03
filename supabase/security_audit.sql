-- Famora security hardening and audit.
-- Run this single file in Supabase SQL Editor.
-- It first hardens the existing database, then returns PASS/WARN/FAIL checks.
-- This file is intentionally not read-only because it changes policies and storage privacy.

-- =============================================================
-- 1. SECURITY HARDENING
-- =============================================================

create or replace function public.is_family_member(fid uuid)
returns boolean language sql security definer stable set search_path = public
as $$ select auth.uid() is not null and exists (
  select 1 from public.family_members where family_id = fid and user_id = auth.uid()
); $$;

create or replace function public.is_family_admin(fid uuid)
returns boolean language sql security definer stable set search_path = public
as $$ select auth.uid() is not null and exists (
  select 1 from public.family_members where family_id = fid and user_id = auth.uid() and role = 'admin'
); $$;

create or replace function public.join_family_by_code(code text)
returns setof public.families language plpgsql security definer set search_path = public
as $$
declare target public.families;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into target from public.families where invite_code = upper(trim(code));
  if target.id is null then raise exception 'Invalid invite code'; end if;
  insert into public.family_members (family_id, user_id, role)
  values (target.id, auth.uid(), 'member') on conflict (family_id, user_id) do nothing;
  return next target;
end; $$;

revoke all on function public.join_family_by_code(text) from public, anon;
grant execute on function public.join_family_by_code(text) to authenticated;

-- Remove every policy created by the original schema, regardless of its old name.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname in ('public', 'storage')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Users and family membership.
create policy users_select on public.users for select using (
  id = auth.uid() or exists (
    select 1 from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = auth.uid() and theirs.user_id = users.id
  )
);
create policy users_insert on public.users for insert with check (id = auth.uid());
create policy users_update on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy families_select on public.families for select using (public.is_family_member(id));
create policy families_insert on public.families for insert with check (created_by = auth.uid());
create policy families_update on public.families for update using (public.is_family_admin(id));
create policy families_delete on public.families for delete using (public.is_family_admin(id));
create policy family_members_select on public.family_members for select using (public.is_family_member(family_id));
create policy family_members_insert on public.family_members for insert with check (
  public.is_family_admin(family_id) or (
    user_id = auth.uid() and exists (
      select 1 from public.families f where f.id = family_id and f.created_by = auth.uid()
    )
  )
);
create policy family_members_update on public.family_members for update using (public.is_family_admin(family_id) or user_id = auth.uid());
create policy family_members_delete on public.family_members for delete using (public.is_family_admin(family_id) or user_id = auth.uid());

-- Family-scoped content.
create policy posts_select on public.posts for select using (public.is_family_member(family_id));
create policy posts_insert on public.posts for insert with check (public.is_family_member(family_id) and author_id = auth.uid());
create policy posts_update on public.posts for update using (author_id = auth.uid());
create policy posts_delete on public.posts for delete using (author_id = auth.uid());
create policy stories_select on public.stories for select using (public.is_family_member(family_id));
create policy stories_insert on public.stories for insert with check (public.is_family_member(family_id) and author_id = auth.uid());
create policy stories_delete on public.stories for delete using (author_id = auth.uid());
create policy memories_select on public.memories for select using (public.is_family_member(family_id));
create policy memories_insert on public.memories for insert with check (public.is_family_member(family_id));
create policy memories_update on public.memories for update using (public.is_family_member(family_id));
create policy memories_delete on public.memories for delete using (public.is_family_member(family_id));
create policy events_select on public.events for select using (public.is_family_member(family_id));
create policy events_insert on public.events for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy events_update on public.events for update using (created_by = auth.uid());
create policy events_delete on public.events for delete using (created_by = auth.uid());
create policy daily_challenges_select on public.daily_challenges for select using (public.is_family_member(family_id));
create policy daily_challenges_insert on public.daily_challenges for insert with check (public.is_family_member(family_id));
create policy daily_challenges_update on public.daily_challenges for update using (public.is_family_member(family_id));
create policy newspapers_select on public.newspapers for select using (public.is_family_member(family_id));
create policy newspapers_insert on public.newspapers for insert with check (public.is_family_member(family_id));
create policy newspapers_update on public.newspapers for update using (public.is_family_member(family_id));
create policy podcast_episodes_select on public.podcast_episodes for select using (public.is_family_member(family_id));
create policy podcast_episodes_insert on public.podcast_episodes for insert with check (public.is_family_member(family_id));
create policy podcast_episodes_update on public.podcast_episodes for update using (public.is_family_member(family_id));
create policy game_sessions_select on public.game_sessions for select using (public.is_family_member(family_id));
create policy game_sessions_insert on public.game_sessions for insert with check (public.is_family_member(family_id));
create policy game_sessions_update on public.game_sessions for update using (public.is_family_member(family_id));
create policy bucket_list_items_select on public.bucket_list_items for select using (public.is_family_member(family_id));
create policy bucket_list_items_insert on public.bucket_list_items for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy bucket_list_items_update on public.bucket_list_items for update using (public.is_family_member(family_id));
create policy bucket_list_items_delete on public.bucket_list_items for delete using (created_by = auth.uid());
create policy time_capsules_select on public.time_capsules for select using (public.is_family_member(family_id));
create policy time_capsules_insert on public.time_capsules for insert with check (public.is_family_member(family_id) and author_id = auth.uid());
create policy time_capsules_update on public.time_capsules for update using (author_id = auth.uid());
create policy time_capsules_delete on public.time_capsules for delete using (author_id = auth.uid());
create policy achievements_select on public.achievements for select using (public.is_family_member(family_id));
create policy achievements_insert on public.achievements for insert with check (public.is_family_member(family_id));
create policy wall_entries_select on public.wall_entries for select using (public.is_family_member(family_id));
create policy wall_entries_insert on public.wall_entries for insert with check (public.is_family_member(family_id) and author_id = auth.uid());
create policy wall_entries_update on public.wall_entries for update using (author_id = auth.uid());
create policy voice_notes_select on public.voice_notes for select using (public.is_family_member(family_id));
create policy voice_notes_insert on public.voice_notes for insert with check (public.is_family_member(family_id) and author_id = auth.uid());
create policy voice_notes_update on public.voice_notes for update using (author_id = auth.uid());

-- Child tables and private user data.
create policy daily_uploads_select on public.daily_uploads for select using (exists (select 1 from public.daily_challenges c where c.id = challenge_id and public.is_family_member(c.family_id)));
create policy daily_uploads_insert on public.daily_uploads for insert with check (user_id = auth.uid() and exists (select 1 from public.daily_challenges c where c.id = challenge_id and public.is_family_member(c.family_id)));
create policy event_rsvps_select on public.event_rsvps for select using (exists (select 1 from public.events e where e.id = event_id and public.is_family_member(e.family_id)));
create policy event_rsvps_insert on public.event_rsvps for insert with check (user_id = auth.uid() and exists (select 1 from public.events e where e.id = event_id and public.is_family_member(e.family_id)));
create policy event_rsvps_update on public.event_rsvps for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy post_reactions_select on public.post_reactions for select using (exists (select 1 from public.posts p where p.id = post_id and public.is_family_member(p.family_id)));
create policy post_reactions_insert on public.post_reactions for insert with check (user_id = auth.uid());
create policy post_reactions_update on public.post_reactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy post_reactions_delete on public.post_reactions for delete using (user_id = auth.uid());
create policy post_comments_select on public.post_comments for select using (exists (select 1 from public.posts p where p.id = post_id and public.is_family_member(p.family_id)));
create policy post_comments_insert on public.post_comments for insert with check (user_id = auth.uid());
create policy post_comments_delete on public.post_comments for delete using (user_id = auth.uid());
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_insert on public.notifications for insert with check (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy assistant_messages_select on public.assistant_messages for select using (user_id = auth.uid());
create policy assistant_messages_insert on public.assistant_messages for insert with check (user_id = auth.uid());
create policy mailbox_letters_select on public.mailbox_letters for select using (author_id = auth.uid() or recipient_id = auth.uid());
create policy mailbox_letters_insert on public.mailbox_letters for insert with check (author_id = auth.uid() and public.is_family_member(family_id));
create policy mailbox_letters_update on public.mailbox_letters for update using (author_id = auth.uid() or recipient_id = auth.uid());
create policy member_locations_select on public.member_locations for select using (user_id = auth.uid() or (sharing_enabled and public.is_family_member(family_id)));
create policy member_locations_insert on public.member_locations for insert with check (user_id = auth.uid() and public.is_family_member(family_id));
create policy member_locations_update on public.member_locations for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private storage: files must be under the uploading user's UUID directory.
update storage.buckets set public = false where id in ('media', 'audio', 'avatars');
create policy storage_family_upload on storage.objects for insert with check (auth.uid() is not null and bucket_id in ('media', 'audio', 'avatars') and auth.uid()::text = (storage.foldername(name))[1]);
create policy storage_family_read on storage.objects for select using (auth.uid() is not null and auth.uid()::text = (storage.foldername(name))[1]);
create policy storage_family_update on storage.objects for update using (auth.uid()::text = (storage.foldername(name))[1]) with check (auth.uid()::text = (storage.foldername(name))[1]);
create policy storage_family_delete on storage.objects for delete using (auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================
-- 2. VERIFICATION AUDIT
-- =============================================================

with expected(table_name) as (values
  ('users'), ('families'), ('family_members'), ('posts'), ('post_reactions'), ('post_comments'),
  ('stories'), ('daily_challenges'), ('daily_uploads'), ('memories'), ('events'), ('event_rsvps'),
  ('newspapers'), ('podcast_episodes'), ('game_sessions'), ('bucket_list_items'), ('time_capsules'),
  ('achievements'), ('notifications'), ('member_locations'), ('mailbox_letters'), ('wall_entries'),
  ('voice_notes'), ('assistant_messages')
)
select e.table_name, case when c.oid is null or not c.relrowsecurity then 'FAIL' else 'PASS' end status,
  case when c.oid is null then 'Missing table' when c.relrowsecurity then 'RLS enabled' else 'RLS disabled' end finding
from expected e left join pg_class c on c.oid = to_regclass('public.' || e.table_name) order by e.table_name;

select schemaname, tablename, policyname, cmd, qual, with_check,
  case when coalesce(qual, '') ~* '(^|[^a-z])true([^a-z]|$)' or coalesce(with_check, '') ~* '(^|[^a-z])true([^a-z]|$)' then 'FAIL' else 'PASS' end status
from pg_policies where schemaname in ('public', 'storage') order by schemaname, tablename, policyname;

select id bucket_id, case when public then 'FAIL' else 'PASS' end status, public is_public,
  file_size_limit, allowed_mime_types
from storage.buckets where id in ('media', 'audio', 'avatars') order by id;

select n.nspname schema_name, p.proname function_name,
  case when p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) x where x like 'search_path=%') then 'FAIL' else 'PASS' end search_path_status,
  has_function_privilege('public', p.oid, 'EXECUTE') public_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') anon_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef order by p.proname;

select table_schema, table_name, grantee, privilege_type, 'REVIEW' status
from information_schema.role_table_grants
where table_schema in ('public', 'storage') and grantee in ('public', 'anon')
order by table_schema, table_name, grantee, privilege_type;

select check_name, case when found then 'PASS' else 'FAIL' end status, detail from (
  select 'unique family invite code' check_name, exists (select 1 from pg_constraint where conrelid = 'public.families'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%(invite_code)%') found, 'Invite codes are unique' detail
  union all select 'unique family membership', exists (select 1 from pg_constraint where conrelid = 'public.family_members'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%(family_id, user_id)%'), 'Membership cannot duplicate'
  union all select 'unique member location', exists (select 1 from pg_constraint where conrelid = 'public.member_locations'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%(family_id, user_id)%'), 'One location row per member/family'
) checks;

select 'disabled sharing rows with coordinates' check_name, count(*)::bigint finding,
  case when count(*) = 0 then 'PASS' else 'WARN' end status
from public.member_locations where not sharing_enabled and (latitude is not null or longitude is not null);

select 'join_family_by_code RPC' check_name,
  case when to_regprocedure('public.join_family_by_code(text)') is null then 'FAIL' else 'PASS' end status;

select area, status, required_evidence from (values
  ('Code quality', 'MANUAL', 'Run TypeScript, lint, dependency audit'),
  ('Accessibility', 'MANUAL', 'Run keyboard, contrast, screen-reader and axe checks'),
  ('Testing', 'MANUAL', 'Run client/backend tests and feature smoke tests'),
  ('Deployment', 'MANUAL', 'Verify Vercel settings, env vars, HTTPS and production build'),
  ('Database', 'COVERED', 'Review all result sets above')
) audit_scope(area, status, required_evidence);
