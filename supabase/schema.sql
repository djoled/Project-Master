
-- Enable necessary extensions
create extension if not exists "pgcrypto";

-- 1. Types
do $$ begin
    create type user_role as enum ('owner', 'operations_manager', 'project_manager', 'contractor');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type task_status as enum ('pending', 'in_progress', 'completed');
exception
    when duplicate_object then null;
end $$;

-- 2. Users Table
-- Designed to sync with the frontend's manual ID generation or Auth IDs
create table if not exists public.users (
  id text primary key,
  email text unique not null,
  name text not null,
  username text unique not null,
  role user_role not null,
  created_at bigint not null
);

-- 3. Projects
create table if not exists public.projects (
  id text primary key,
  name text not null,
  description text,
  owner_id text references public.users(id),
  project_manager_ids text[], -- Array of user IDs
  contractor_ids text[],      -- Array of user IDs
  due_date bigint,
  created_at bigint not null,
  updated_at bigint not null
);

-- 4. Subcategories (Departments)
create table if not exists public.subcategories (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  name text not null,
  description text,
  created_by text references public.users(id),
  created_at bigint not null,
  due_date bigint
);

-- 5. Tasks (Work Items)
create table if not exists public.tasks (
  id text primary key,
  subcategory_id text references public.subcategories(id) on delete cascade,
  name text not null,
  description text,
  status task_status default 'pending',
  created_by text references public.users(id),
  created_at bigint not null,
  due_date bigint
);

-- 6. Photos (Documentation)
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

-- 7. Task Comments
create table if not exists public.task_comments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade,
  user_id text references public.users(id),
  user_name text,
  content text not null,
  created_at bigint not null
);

-- 8. Chat Groups
create table if not exists public.chat_groups (
  id text primary key,
  name text not null,
  member_ids text[],
  created_by text references public.users(id),
  created_at bigint not null
);

-- 9. Chat Messages
-- Uses TIMESTAMPTZ for proper realtime handling, unlike other tables using raw timestamps
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  group_id text, -- Null for 'General' chat
  sender_id text references public.users(id),
  sender_name text,
  content text,
  photo_url text,
  created_at timestamptz default now(),
  is_read boolean default false
);

-- 10. Notifications
create table if not exists public.notifications (
  id text primary key,
  user_id text references public.users(id),
  type text not null,
  message text not null,
  related_to jsonb,
  is_read boolean default false,
  created_at bigint not null
);

-- Enable RLS (Row Level Security)
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.subcategories enable row level security;
alter table public.tasks enable row level security;
alter table public.photos enable row level security;
alter table public.task_comments enable row level security;
alter table public.chat_groups enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- OPEN PERMISSIONS (For Development/MVP)
-- In production, replace these with specific policies based on auth.uid()
create policy "Public Access Users" on public.users for all using (true);
create policy "Public Access Projects" on public.projects for all using (true);
create policy "Public Access Subcategories" on public.subcategories for all using (true);
create policy "Public Access Tasks" on public.tasks for all using (true);
create policy "Public Access Photos" on public.photos for all using (true);
create policy "Public Access Comments" on public.task_comments for all using (true);
create policy "Public Access ChatGroups" on public.chat_groups for all using (true);
create policy "Public Access Messages" on public.messages for all using (true);
create policy "Public Access Notifications" on public.notifications for all using (true);

-- Enable Realtime
alter publication supabase_realtime add table public.messages;
