-- First, disable RLS on users table temporarily
alter table public.users disable row level security;

-- Drop existing policies
drop policy if exists "Anyone can read user profiles" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Service role can manage users" on public.users;
drop policy if exists "Anyone can check if user exists" on public.users;
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;

-- Create function to handle user creation/updates
create or replace function public.handle_auth_user_change()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    -- Insert into public.users
    insert into public.users (id, email, name, created_at, updated_at)
    values (
      NEW.id,
      NEW.email,
      coalesce(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.created_at,
      NEW.updated_at
    );
  elsif (TG_OP = 'UPDATE') then
    -- Update public.users
    update public.users
    set
      email = NEW.email,
      name = coalesce(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      updated_at = NEW.updated_at
    where id = NEW.id;
  elsif (TG_OP = 'DELETE') then
    -- Delete from public.users
    delete from public.users where id = OLD.id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_change on auth.users;

-- Create trigger
create trigger on_auth_user_change
  after insert or update or delete on auth.users
  for each row execute function public.handle_auth_user_change();

-- Grant necessary permissions
grant usage on schema public to postgres, anon, authenticated;
grant all on public.users to postgres;
grant select on public.users to anon, authenticated;
grant update (name, avatar_url, updated_at) on public.users to authenticated; 