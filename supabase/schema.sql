-- PROJECT MASTER 101 - SUPABASE DATABASE SCHEMA
-- Version: 2.1 (Full Production-Ready Setup)

-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- 1. CUSTOM TYPES
-- Role hierarchy: Owner > Ops Manager > Project Manager > Contractor
do $$ begin
    create type user_role as enum ('owner', 'operations_manager', 'project_manager', 'contractor');
exception
    when duplicate_object then null;
end $$;

-- Standardized task workflow
do $$ begin
    create type task_status as enum ('pending', 'in_progress', 'pending_review', 'completed');
exception
    when duplicate_object then null;
end $$;

-- 2. TABLES

-- Users: Synced with Auth or custom ID generation
create table if not exists public.users (
  id text primary key, -- Use Text to support both UUIDs and custom IDs
  email text unique not null,
  name text not null,
  username text unique not null,
  role user_role not null default 'contractor',
  created_at bigint not null -- Stored as timestamp in ms for JS compatibility
);

-- Projects: The root of the hierarchy
create table if not exists public.projects (
  id text primary key,
  name text not null,
  description text,
  owner_id text references public.users(id),
  project_manager_ids text[] default '{}', -- Managed via project_members logic or simple array
  contractor_ids text[] default '{}',
  due_date bigint,
  created_at bigint not null,
  updated_at bigint not null
);

-- Subcategories (Departments): Child of Project
create table if not exists public.subcategories (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  name text not null,
  description text,
  created_by text references public.users(id),
  created_at bigint not null,
  due_date bigint
);

-- Tasks (Work Items): Child of Subcategory
create table if not exists public.tasks (
  id text primary key,
  subcategory_id text references public.subcategories(id) on delete cascade,
  name text not null,
  description text,
  status task_status default 'pending',
  created_by text references public.users(id),
  created_at bigint not null,
  due_date bigint,
  ai_analysis text -- For storing Gemini API results
);

-- Photos: Generic polymorphic-style storage for project, subcategory, or task documentation
create table if not exists public.photos (
  id text primary key,
  parent_type text not null check (parent_type in ('project', 'subcategory', 'task', 'chat')),
  parent_id text not null,
  image_url text not null,
  uploaded_by text references public.users(id),
  uploaded_by_name text,
  created_at bigint not null,
  comment text
);

-- Task Comments: Granular discussion on specific work items
create table if not exists public.task_comments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade,
  user_id text references public.users(id),
  user_name text,
  content text not null,
  created_at bigint not null
);

-- Chat Groups: For private/specific team discussions
create table if not exists public.chat_groups (
  id text primary key,
  name text not null,
  member_ids text[] default '{}',
  created_by text references public.users(id),
  created_at bigint not null
);

-- Messages: Real-time communication feed
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  group_id text, -- Null values represent the 'General' channel
  sender_id text references public.users(id),
  sender_name text,
  content text,
  photo_url text,
  created_at timestamptz default now(),
  is_read boolean default false
);

-- Notifications: Alert stakeholders of activity
create table if not exists public.notifications (
  id text primary key,
  user_id text references public.users(id) on delete cascade,
  type text not null,
  message text not null,
  related_to jsonb, -- Stores type, id, and name of the trigger object
  is_read boolean default false,
  created_at bigint not null
);

-- 3. SECURITY & POLICIES (RLS)

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.subcategories enable row level security;
alter table public.tasks enable row level security;
alter table public.photos enable row level security;
alter table public.task_comments enable row level security;
alter table public.chat_groups enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Global Development Access (Allows app to function as MVP)
-- WARNING: In a production environment, refine these to check session IDs/Roles
create policy "Enable all for authenticated users" on public.users for all using (true);
create policy "Enable all for authenticated users" on public.projects for all using (true);
create policy "Enable all for authenticated users" on public.subcategories for all using (true);
create policy "Enable all for authenticated users" on public.tasks for all using (true);
create policy "Enable all for authenticated users" on public.photos for all using (true);
create policy "Enable all for authenticated users" on public.task_comments for all using (true);
create policy "Enable all for authenticated users" on public.chat_groups for all using (true);
create policy "Enable all for authenticated users" on public.messages for all using (true);
create policy "Enable all for authenticated users" on public.notifications for all using (true);

-- 4. REALTIME CONFIGURATION
-- Enable real-time for messages (Chat) and notifications
begin;
  -- Remove existing if any
  drop publication if exists supabase_realtime;
  -- Create new publication for selected tables
  create publication supabase_realtime for table public.messages, public.notifications, public.tasks;
commit;

-- 5. STORAGE BUCKETS (OPTIONAL CONFIG)
-- Run these via Supabase Dashboard or if you have the storage extension enabled
-- insert into storage.buckets (id, name, public) values ('project-photos', 'project-photos', true);
-- insert into storage.buckets (id, name, public) values ('task-photos', 'task-photos', true);