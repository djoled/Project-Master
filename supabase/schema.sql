
-- PROJECT MASTER: VIBE STACK SCHEMA
-- DRIVER: Supabase (PostgreSQL 15+)

-- 1. ENUMS
create type task_status as enum ('pending', 'in_progress', 'completed');
create type user_role as enum ('owner', 'manager');

-- 2. PROFILES (Extends Auth.Users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role user_role default 'manager',
  full_name text,
  created_at timestamptz default now()
);

-- 3. PROJECTS
create table projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  title text not null,
  description text,
  owner_id uuid references profiles(id) not null
);

-- 4. ASSIGNMENTS (Many-to-Many for PMs)
create table project_assignments (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- 5. SUBCATEGORIES
create table subcategories (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  created_at timestamptz default now()
);

-- 6. TASKS
create table tasks (
  id uuid default gen_random_uuid() primary key,
  subcategory_id uuid references subcategories(id) on delete cascade not null,
  title text not null,
  status task_status default 'pending',
  due_date timestamptz,
  created_at timestamptz default now()
);

-- 7. EVIDENCE (Photos)
create table task_evidence (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  uploader_id uuid references profiles(id) not null,
  storage_path text not null, -- Supabase Storage Path
  uploaded_at timestamptz default now()
);

-- RLS POLICIES (Summary Concept)
alter table profiles enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;

-- Owners can do everything
create policy "Owners have full access" on projects
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'owner'
    )
  );

-- Managers can view assigned projects
create policy "Managers view assigned" on projects
  for select using (
    exists (
      select 1 from project_assignments
      where project_assignments.project_id = projects.id
      and project_assignments.user_id = auth.uid()
    )
  );
