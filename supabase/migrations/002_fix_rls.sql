-- Fix RLS policies that block family creation right after signup
-- Run this in the Supabase SQL Editor after 001_initial_schema.sql

-- Drop the overly strict families insert policy
drop policy if exists "families: insert" on public.families;

-- Allow any authenticated user to create a family
create policy "families: insert"
  on public.families for insert
  with check (auth.uid() is not null);

-- Also ensure family_members insert allows the current user to join a family they just created
drop policy if exists "family_members: insert" on public.family_members;

create policy "family_members: insert"
  on public.family_members for insert
  with check (auth.uid() is not null);

-- Allow users to read all families they are members of (broader select)
drop policy if exists "families: read member" on public.families;

create policy "families: read member"
  on public.families for select
  using (
    id in (
      select family_id from public.family_members where user_id = auth.uid()
    )
  );
