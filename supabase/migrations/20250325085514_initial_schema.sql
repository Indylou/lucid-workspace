-- Create extensions in the correct schema
create extension if not exists "uuid-ossp" with schema public;
create extension if not exists pgcrypto with schema public;

-- Set up auth schema and extensions
create schema if not exists auth;
create schema if not exists storage;

-- Create auth users table with password
create table if not exists public.users (
  id uuid primary key default public.uuid_generate_v4(),
  email text unique not null,
  name text not null,
  password text not null,
  avatar_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create user sessions table
create table if not exists public.user_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) not null,
  session_token text unique not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now() not null
);

-- Create storage buckets table
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid references public.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  public boolean default false
);

-- Create storage objects table
create table if not exists storage.objects (
  id uuid primary key default uuid_generate_v4(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid references public.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_accessed_at timestamp with time zone default now(),
  metadata jsonb,
  path text not null,
  size bigint not null,
  mime_type text not null,
  etag text,
  is_uploaded boolean default false,
  unique (bucket_id, name)
);

-- Create file references for documents
create table if not exists public.document_files (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents(id) on delete cascade,
  object_id uuid references storage.objects(id) on delete cascade,
  display_name text not null,
  created_at timestamp with time zone default now() not null,
  created_by uuid references public.users(id)
);

-- Create avatar references for users
create table if not exists public.user_avatars (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  object_id uuid references storage.objects(id) on delete cascade,
  created_at timestamp with time zone default now() not null
);

-- Create attachment references for todos
create table if not exists public.todo_attachments (
  id uuid primary key default uuid_generate_v4(),
  todo_id text references public.todos(id) on delete cascade,
  object_id uuid references storage.objects(id) on delete cascade,
  display_name text not null,
  created_at timestamp with time zone default now() not null,
  created_by uuid references public.users(id)
);

-- Create projects table
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id uuid references public.users(id),
  created_at timestamp with time zone default now() not null
);

-- Create documents table
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null default '',
  project_id uuid references public.projects(id),
  created_by uuid references public.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create todos table
create table if not exists public.todos (
  id text primary key, -- Using client-generated UUIDs for sync consistency
  content text not null default '',
  assigned_to uuid references public.users(id),
  project_id uuid references public.projects(id),
  document_id uuid references public.documents(id),
  created_by uuid references public.users(id),
  completed boolean not null default false,
  position integer,
  due_date timestamp with time zone,
  created_at timestamp with time zone not null
);

-- Create RLS policies
alter table public.users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.todos enable row level security;
alter table public.document_files enable row level security;
alter table public.user_avatars enable row level security;
alter table public.todo_attachments enable row level security;
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

-- Storage access helper functions
create or replace function storage.get_object_url(bucket text, object_name text) returns text as $$
begin
  return 'https://tygibsmxqdslroimelkh.supabase.co/storage/v1/object/public/' || bucket || '/' || object_name;
end;
$$ language plpgsql;

create or replace function storage.get_presigned_url(bucket text, object_name text, expires_in integer default 600) returns text as $$
begin
  -- This is a simplified version, in a real system this would generate a proper presigned URL
  return 'https://tygibsmxqdslroimelkh.supabase.co/storage/v1/object/sign/' || bucket || '/' || object_name || '?expires=' || extract(epoch from now() + (expires_in * interval '1 second'))::text;
end;
$$ language plpgsql;

-- User authentication helper functions
create or replace function public.authenticate(
  email text,
  password text
) returns public.users as $$
declare
  user_record public.users;
begin
  select * into user_record
  from public.users
  where users.email = authenticate.email;
  
  if user_record is null then
    return null; -- User not found
  end if;
  
  -- Check if password matches
  if user_record.password = crypt(authenticate.password, user_record.password) then
    return user_record;
  else
    return null; -- Password doesn't match
  end if;
end;
$$ language plpgsql security definer;

create or replace function public.create_session(
  user_id uuid
) returns public.user_sessions as $$
declare
  session_record public.user_sessions;
begin
  insert into public.user_sessions (user_id, session_token, expires_at)
  values (
    user_id,
    encode(gen_random_bytes(32), 'hex'),
    now() + interval '7 days'
  )
  returning * into session_record;
  
  return session_record;
end;
$$ language plpgsql security definer;

-- Create hash password trigger
create or replace function hash_password() returns trigger as $$
begin
  if tg_op = 'INSERT' or new.password <> old.password then
    new.password = crypt(new.password, gen_salt('bf'));
  end if;
  return new;
end;
$$ language plpgsql;

-- Apply hash password trigger to users table
drop trigger if exists hash_password_trigger on public.users;
create trigger hash_password_trigger
  before insert or update on public.users
  for each row execute function hash_password();

-- Allow public read access to users (for user mentions/assignments)
create policy "Users are viewable by everyone"
  on public.users
  for select
  using (true);
  
-- User sessions can only be accessed by the owning user
create policy "Sessions only accessible by owner"
  on public.user_sessions
  for all
  using (auth.uid() = user_id);
  
-- User management policies
create policy "Users can update their own profiles"
  on public.users
  for update
  using (auth.uid() = id);

-- Storage policies
create policy "Public buckets are viewable by everyone"
  on storage.buckets
  for select
  using (public = true);

create policy "Objects in public buckets are viewable by everyone"
  on storage.objects
  for select
  using (
    bucket_id in (
      select id from storage.buckets where public = true
    )
  );

create policy "Users can upload to own bucket"
  on storage.objects
  for insert
  with check (owner = auth.uid());

create policy "Users can update own objects"
  on storage.objects
  for update
  using (owner = auth.uid());

create policy "Users can delete own objects"
  on storage.objects
  for delete
  using (owner = auth.uid());

-- Document files policies
create policy "Document files are viewable by document viewers"
  on public.document_files
  for select
  using (true);  -- For development, allow all. In production, restrict by document access

create policy "Users can add files to documents they own"
  on public.document_files
  for insert
  with check (true);  -- For development, allow all. In production, check user's document permissions

-- User avatar policies
create policy "User avatars are publicly viewable"
  on public.user_avatars
  for select
  using (true);
  
create policy "Users can manage their own avatars"
  on public.user_avatars
  for all
  using (user_id = auth.uid());

-- Todo attachment policies
create policy "Todo attachments are viewable by todo viewers"
  on public.todo_attachments
  for select
  using (true);  -- For development, allow all. In production, restrict by todo access

create policy "Users can add attachments to their todos"
  on public.todo_attachments
  for insert
  with check (true);  -- For development, allow all. In production, check user's todo permissions

-- For now, allow anonymous access for all operations (for development)
-- In production, these would be restricted to authenticated users only
create policy "Allow anonymous read access to all tables"
  on public.todos
  for select
  using (true);

create policy "Allow anonymous insert access to all tables"
  on public.todos
  for insert
  with check (true);

create policy "Allow anonymous update access to all tables"
  on public.todos
  for update
  using (true);

create policy "Allow anonymous delete access to all tables"
  on public.todos
  for delete
  using (true);

-- For documents, allow all operations for development
create policy "Allow anonymous read access to documents"
  on public.documents
  for select
  using (true);

create policy "Allow anonymous insert access to documents"
  on public.documents
  for insert
  with check (true);

create policy "Allow anonymous update access to documents"
  on public.documents
  for update
  using (true);

create policy "Allow anonymous delete access to documents"
  on public.documents
  for delete
  using (true);

-- Create default storage buckets
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'User Avatars', true),
  ('documents', 'Document Files', true),
  ('todo-attachments', 'Todo Attachments', true)
on conflict (id) do nothing;


-- Insert some sample data with hashed passwords (password is 'password123' for all users)
insert into public.users (id, email, name, password)
values
  (uuid_generate_v4(), 'indy@watchlucid.com', 'Indy', 'password123'),
  (uuid_generate_v4(), 'user2@example.com', 'Bob', 'password123'),
  (uuid_generate_v4(), 'user3@example.com', 'Carol', 'password123'),
  (uuid_generate_v4(), 'user4@example.com', 'David', 'password123')
on conflict (email) do nothing;


insert into public.projects (id, name, description, owner_id)
values
  (uuid_generate_v4(), 'Marketing Campaign', 'Q3 Marketing Campaign for Product Launch', '2106a5af-a693-474e-be05-2c35523fafe7'),
  (uuid_generate_v4(), 'Demo Project', 'Project for demonstration purposes', '2106a5af-a693-474e-be05-2c35523fafe7')
on conflict do nothing;

-- Enable Realtime for todos table
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table todos;
commit;