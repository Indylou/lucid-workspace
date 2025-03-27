-- First, ensure we're working with a clean slate
delete from auth.users where email = 'indy@watchlucid.com';
delete from public.users where email = 'indy@watchlucid.com';

-- Create the user in auth.users
with auth_user as (
  insert into auth.users (
    id,
    instance_id,
    email,
    raw_user_meta_data,
    raw_app_meta_data,
    role,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    is_super_admin,
    phone,
    aud
  ) values (
    gen_random_uuid(),  -- Generate a new UUID for the user
    '00000000-0000-0000-0000-000000000000',
    'indy@watchlucid.com',
    jsonb_build_object('name', 'Indy'),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    'authenticated',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    encode(gen_random_bytes(32), 'hex'),
    false,
    null,
    'authenticated'
  )
  returning id
)
-- Create the corresponding public user profile
insert into public.users (id, name, email, created_at, updated_at)
select 
  id,
  'Indy',
  'indy@watchlucid.com',
  now(),
  now()
from auth_user; 