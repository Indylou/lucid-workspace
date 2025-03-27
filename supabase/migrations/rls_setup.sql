-- Enable RLS on tables
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.todos enable row level security;

-- Basic read access
create policy "Anyone can read projects"
  on public.projects for select
  using (true);

create policy "Anyone can read documents"
  on public.documents for select
  using (true);

create policy "Anyone can read todos"
  on public.todos for select
  using (true);

-- Basic write access
create policy "Authenticated users can create projects"
  on public.projects for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can create documents"
  on public.documents for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can create todos"
  on public.todos for insert
  with check (auth.role() = 'authenticated');

-- Update and delete policies
create policy "Authenticated users can update projects"
  on public.projects for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can update documents"
  on public.documents for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can update todos"
  on public.todos for update
  using (auth.role() = 'authenticated'); 