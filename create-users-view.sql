-- First drop the existing view
DROP VIEW IF EXISTS public.users;

-- Create a view called 'users' that maps to the 'profiles' table
-- This will make existing code that references 'users' work without changes
CREATE VIEW public.users AS
SELECT
  p.id,
  p.name,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  COALESCE(au.email, 'unknown@example.com') as email  -- Provide a fallback for null emails
FROM
  public.profiles p
LEFT JOIN  -- Use LEFT JOIN to keep all profiles even if no matching auth user
  auth.users au ON p.id = au.id;

-- Grant SELECT permission on the users view to authenticated users
GRANT SELECT ON public.users TO authenticated;

-- Additional policy to ensure todos can be created
-- First check if policy exists, then create if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'todos_insert_authenticated'
    ) THEN
        CREATE POLICY todos_insert_authenticated ON public.todos
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END
$$; 