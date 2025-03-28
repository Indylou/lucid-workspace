create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed', 'on-hold')),
  team_size integer not null default 1,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  tasks_total integer not null default 0,
  tasks_completed integer not null default 0,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create RLS policies
alter table public.projects enable row level security;

create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Create indexes
create index projects_user_id_idx on public.projects(user_id);
create index projects_status_idx on public.projects(status);
create index projects_created_at_idx on public.projects(created_at);
create index projects_updated_at_idx on public.projects(updated_at); 