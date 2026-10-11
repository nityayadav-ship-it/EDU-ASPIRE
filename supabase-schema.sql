-- ============================================================
-- EDU-ASPIRE — Supabase PostgreSQL schema
-- Paste this whole file into: Supabase Dashboard > SQL Editor > New query > Run
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).
-- ============================================================

-- --------------------------------------------------------------
-- 1. PROFILES
-- One row per user, linked 1:1 to Supabase's built-in auth.users.
-- Replaces Firestore's users/{uid} collection.
-- --------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  email       text not null,
  program     text,
  "year"      text,
  role        text not null default 'student'
                check (role in ('student','tutor','admin','superadmin')),
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------
-- 2. COURSES
-- Replaces Firestore's courses/{courseId} collection.
-- --------------------------------------------------------------
create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  program       text,
  "year"        text,
  thumbnail_url text,
  like_count    integer not null default 0,
  created_by    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- --------------------------------------------------------------
-- 3. CHAPTERS
-- Replaces Firestore's chapters/{chapterId} collection.
-- --------------------------------------------------------------
create table if not exists public.chapters (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  content     text,
  video_url   text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------
-- 4. LIKES
-- Replaces Firestore's likes/{uid_courseId} docs.
-- One like per (user, course) — composite primary key does that job.
-- --------------------------------------------------------------
create table if not exists public.likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- --------------------------------------------------------------
-- 5. BOOKMARKS
-- Replaces Firestore's bookmarks/{uid_courseId} docs.
-- --------------------------------------------------------------
create table if not exists public.bookmarks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- --------------------------------------------------------------
-- 6. COMMENTS
-- Replaces Firestore's comments/{commentId} collection.
-- --------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  username    text,
  text        text not null,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------
-- 7. PROGRESS
-- Replaces Firestore's progress/{uid_courseId} docs.
-- --------------------------------------------------------------
create table if not exists public.progress (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  percent     integer not null default 0 check (percent between 0 and 100),
  updated_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ============================================================
-- HELPER FUNCTIONS (security definer so they can read profiles
-- without getting blocked by that table's own RLS policies —
-- this avoids infinite-recursion problems in the policies below).
-- ============================================================
create or replace function public.current_role_is(target_role text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = target_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role_is('admin') or public.current_role_is('superadmin');
$$;

create or replace function public.is_tutor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role_is('tutor') or public.is_admin();
$$;

-- Prevent a normal user from changing their own role.
-- Admins/superadmins can still manage roles from Supabase Table Editor.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only an administrator can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute procedure public.prevent_role_escalation();

create or replace function public.increment_like_count(p_course_id uuid, p_delta integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.courses
  set like_count = greatest(0, like_count + p_delta)
  where id = p_course_id;
$$;

-- ============================================================
-- PROFILE AUTO-CREATION
-- Registration stores profile fields in auth metadata. This trigger
-- creates the public profile even when email confirmation is enabled.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, program, "year", role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'program',
    new.raw_user_meta_data->>'year',
    'student'
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
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.courses   enable row level security;
alter table public.chapters  enable row level security;
alter table public.likes     enable row level security;
alter table public.bookmarks enable row level security;
alter table public.comments  enable row level security;
alter table public.progress  enable row level security;

-- ---- profiles ----
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id and role = 'student');

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete using (public.is_admin());

-- ---- courses ----
drop policy if exists "courses_select" on public.courses;
create policy "courses_select" on public.courses
  for select using (auth.uid() is not null);

drop policy if exists "courses_insert" on public.courses;
create policy "courses_insert" on public.courses
  for insert with check (public.is_tutor() and created_by = auth.uid());

drop policy if exists "courses_update" on public.courses;
create policy "courses_update" on public.courses
  for update using (public.is_tutor() and (created_by = auth.uid() or public.is_admin()));

drop policy if exists "courses_delete" on public.courses;
create policy "courses_delete" on public.courses
  for delete using (public.is_tutor() and (created_by = auth.uid() or public.is_admin()));

-- ---- chapters ----
drop policy if exists "chapters_select" on public.chapters;
create policy "chapters_select" on public.chapters
  for select using (auth.uid() is not null);

drop policy if exists "chapters_write" on public.chapters;
create policy "chapters_write" on public.chapters
  for all using (public.is_tutor()) with check (public.is_tutor());

-- ---- likes ----
drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes
  for select using (auth.uid() is not null);

drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert" on public.likes
  for insert with check (user_id = auth.uid());

drop policy if exists "likes_delete" on public.likes;
create policy "likes_delete" on public.likes
  for delete using (user_id = auth.uid());

-- ---- bookmarks ----
drop policy if exists "bookmarks_select" on public.bookmarks;
create policy "bookmarks_select" on public.bookmarks
  for select using (user_id = auth.uid());

drop policy if exists "bookmarks_insert" on public.bookmarks;
create policy "bookmarks_insert" on public.bookmarks
  for insert with check (user_id = auth.uid());

drop policy if exists "bookmarks_delete" on public.bookmarks;
create policy "bookmarks_delete" on public.bookmarks
  for delete using (user_id = auth.uid());

-- ---- comments ----
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (auth.uid() is not null);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (user_id = auth.uid());

drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments
  for update using (user_id = auth.uid());

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete using (user_id = auth.uid());

-- ---- progress ----
drop policy if exists "progress_select" on public.progress;
create policy "progress_select" on public.progress
  for select using (user_id = auth.uid());

drop policy if exists "progress_insert" on public.progress;
create policy "progress_insert" on public.progress
  for insert with check (user_id = auth.uid());

drop policy if exists "progress_update" on public.progress;
create policy "progress_update" on public.progress
  for update using (user_id = auth.uid());

-- Create the public thumbnail bucket if it does not already exist.
insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do update set public = true;

-- ============================================================
-- STORAGE (course thumbnails) — free tier, no card needed.
-- Run this AFTER creating a bucket named "course-thumbnails"
-- in Dashboard > Storage (mark it "Public").
-- ============================================================
drop policy if exists "thumbnails_public_read" on storage.objects;
create policy "thumbnails_public_read" on storage.objects
  for select using (bucket_id = 'course-thumbnails');

drop policy if exists "thumbnails_owner_write" on storage.objects;
create policy "thumbnails_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'course-thumbnails'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "thumbnails_owner_delete" on storage.objects;
create policy "thumbnails_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'course-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
