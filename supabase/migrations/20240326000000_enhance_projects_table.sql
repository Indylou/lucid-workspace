-- Add new columns to projects table
alter table public.projects
  add column if not exists status text not null default 'active' check (status in ('active', 'completed', 'on-hold')),
  add column if not exists progress integer not null default 0 check (progress >= 0 and progress <= 100),
  add column if not exists team_size integer not null default 1,
  add column if not exists start_date timestamp with time zone,
  add column if not exists due_date timestamp with time zone,
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  add column if not exists tasks_total integer not null default 0,
  add column if not exists tasks_completed integer not null default 0,
  add column if not exists tags text[] default array[]::text[];

-- Create an index for status to improve filtering performance
create index if not exists projects_status_idx on public.projects(status);

-- Create an index for priority to improve sorting and filtering
create index if not exists projects_priority_idx on public.projects(priority);

-- Create indexes for dates to improve range queries and sorting
create index if not exists projects_start_date_idx on public.projects(start_date);
create index if not exists projects_due_date_idx on public.projects(due_date);

-- Create a GIN index for tags to improve array operations and searches
create index if not exists projects_tags_idx on public.projects using gin(tags); 