-- Enable Row Level Security on todos table if not already enabled
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they might be causing issues
DROP POLICY IF EXISTS todos_read_all ON public.todos;
DROP POLICY IF EXISTS todos_insert_own ON public.todos;
DROP POLICY IF EXISTS todos_update_own ON public.todos;
DROP POLICY IF EXISTS todos_delete_own ON public.todos;

-- Recreate the policies with correct permissions
-- Allow anyone to read any todo
CREATE POLICY todos_read_all ON public.todos
  FOR SELECT USING (true);

-- Allow users to insert todos where they are the creator
CREATE POLICY todos_insert_own ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own todos
CREATE POLICY todos_update_own ON public.todos
  FOR UPDATE USING (auth.uid() = created_by);

-- Allow users to delete their own todos
CREATE POLICY todos_delete_own ON public.todos
  FOR DELETE USING (auth.uid() = created_by);

-- Add additional policy to allow users to update todos assigned to them
CREATE POLICY todos_update_assigned ON public.todos
  FOR UPDATE USING (auth.uid() = assigned_to); 