-- First ensure the user doesn't exist
delete from auth.users where email = 'indy@watchlucid.com';
delete from public.users where email = 'indy@watchlucid.com';

-- Create user in auth.users with all required fields
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_current,
  email_change_token_new
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'indy@watchlucid.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Indy"}',
  false,
  'authenticated',
  'authenticated',
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(32), 'hex')
)
returning id;

-- Create corresponding entry in public.users
do $$
declare
  auth_user_id uuid;
begin
  -- Get the ID of the auth user we just created
  select id into auth_user_id from auth.users where email = 'indy@watchlucid.com';
  
  -- Create the public user profile
  insert into public.users (
    id,
    name,
    email,
    created_at,
    updated_at
  ) values (
    auth_user_id,
    'Indy',
    'indy@watchlucid.com',
    now(),
    now()
  );
end $$; 