-- First ensure the user doesn't exist
delete from auth.users where email = 'indy@watchlucid.com';
delete from public.users where email = 'indy@watchlucid.com';

-- Create user in auth.users with all required fields
insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'indy@watchlucid.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Indy"}',
    false,
    now(),
    now(),
    null,
    null,
    encode(gen_random_bytes(32), 'hex'),
    null,
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