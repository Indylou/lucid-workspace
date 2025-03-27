-- First, ensure RLS is enabled on users table
alter table public.users enable row level security;

-- Allow anyone to read user profiles
create policy "Anyone can read user profiles"
  on public.users for select
  using (true);

-- Allow users to update their own profile
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow service role full access
create policy "Service role can manage users"
  on public.users for all
  using (auth.jwt()->>'role' = 'service_role')
  with check (auth.jwt()->>'role' = 'service_role');

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant select on public.users to anon, authenticated;
grant update (name, avatar_url, updated_at) on public.users to authenticated; 