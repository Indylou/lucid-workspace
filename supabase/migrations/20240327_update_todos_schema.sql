-- Add new fields to todos table
ALTER TABLE public.todos
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('todo', 'in-progress', 'review', 'done')) DEFAULT 'todo',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id text REFERENCES public.todos(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create secure policies for comments
CREATE POLICY "Users can read comments on accessible todos"
    ON public.comments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.todos 
        WHERE todos.id = comments.todo_id 
        AND (todos.created_by = auth.uid() OR todos.assigned_to = auth.uid())
    ));

CREATE POLICY "Users can create comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Comment creators can update their comments"
    ON public.comments FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Comment creators can delete their comments"
    ON public.comments FOR DELETE
    USING (auth.uid() = created_by);

-- Add function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.todos;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.todos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.comments;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 