-- Enable required extensions
create extension if not exists "uuid-ossp" with schema public;
create extension if not exists pgcrypto with schema public;

-- Create tables
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id uuid references public.users(id),
  created_by uuid references public.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text,
  project_id uuid references public.projects(id),
  created_by uuid references public.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.todos (
  id text primary key,
  content text not null default '',
  assigned_to uuid references public.users(id),
  project_id uuid references public.projects(id),
  document_id uuid references public.documents(id),
  created_by uuid references public.users(id),
  completed boolean not null default false,
  position integer,
  due_date timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.document_files (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents(id),
  name text not null,
  type text not null,
  size bigint not null,
  created_by uuid references public.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.user_avatars (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  name text not null,
  type text not null,
  size bigint not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.todo_attachments (
  id uuid primary key default uuid_generate_v4(),
  todo_id text references public.todos(id),
  name text not null,
  type text not null,
  size bigint not null,
  created_by uuid references public.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security on all tables
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.todos enable row level security;
alter table public.document_files enable row level security;
alter table public.user_avatars enable row level security;
alter table public.todo_attachments enable row level security;

-- Create RLS policies

-- Users policies
create policy "Anyone can read user profiles"
  on public.users
  for select
  using (true);

create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id);

-- Projects policies
create policy "Users can read own projects"
  on public.projects
  for select
  using (auth.uid() = owner_id or auth.uid() = created_by);

create policy "Users can create projects"
  on public.projects
  for insert
  with check (auth.uid() = created_by);

create policy "Project owners can update"
  on public.projects
  for update
  using (auth.uid() = owner_id);

create policy "Project owners can delete"
  on public.projects
  for delete
  using (auth.uid() = owner_id);

-- Documents policies
create policy "Users can read project documents"
  on public.documents
  for select
  using (exists (
    select 1 from public.projects 
    where projects.id = documents.project_id 
    and (projects.owner_id = auth.uid() or projects.created_by = auth.uid())
  ));

create policy "Users can create documents"
  on public.documents
  for insert
  with check (auth.uid() = created_by);

create policy "Document creators can update"
  on public.documents
  for update
  using (auth.uid() = created_by);

create policy "Document creators can delete"
  on public.documents
  for delete
  using (auth.uid() = created_by);

-- Todos policies
create policy "Users can read own todos"
  on public.todos
  for select
  using (auth.uid() = created_by or auth.uid() = assigned_to);

create policy "Users can create todos"
  on public.todos
  for insert
  with check (auth.uid() = created_by);

create policy "Users can update own todos"
  on public.todos
  for update
  using (auth.uid() = created_by or auth.uid() = assigned_to);

create policy "Users can delete own todos"
  on public.todos
  for delete
  using (auth.uid() = created_by);

-- Files policies
create policy "Users can read project files"
  on public.document_files
  for select
  using (exists (
    select 1 from public.documents 
    where documents.id = document_files.document_id 
    and documents.created_by = auth.uid()
  ));

create policy "Users can upload files"
  on public.document_files
  for insert
  with check (auth.uid() = created_by);

create policy "File owners can delete"
  on public.document_files
  for delete
  using (auth.uid() = created_by);

-- Avatar policies
create policy "Users can manage own avatar"
  on public.user_avatars
  for all
  using (auth.uid() = user_id);

create policy "Anyone can view avatars"
  on public.user_avatars
  for select
  using (true);

-- Todo attachment policies
create policy "Users can read todo attachments"
  on public.todo_attachments
  for select
  using (exists (
    select 1 from public.todos 
    where todos.id = todo_attachments.todo_id 
    and (todos.created_by = auth.uid() or todos.assigned_to = auth.uid())
  ));

create policy "Users can add attachments"
  on public.todo_attachments
  for insert
  with check (auth.uid() = created_by);

create policy "Attachment owners can delete"
  on public.todo_attachments
  for delete
  using (auth.uid() = created_by);

-- Enable realtime subscriptions for todos
drop publication if exists supabase_realtime;
create publication supabase_realtime for table todos; 