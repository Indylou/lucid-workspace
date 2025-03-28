-- Add priority and status fields to todos
ALTER TABLE public.todos
ADD COLUMN priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN status text CHECK (status IN ('todo', 'in-progress', 'review', 'done')) DEFAULT 'todo',
ADD COLUMN tags text[] DEFAULT '{}';

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid primary key default uuid_generate_v4(),
    todo_id text references public.todos(id) on delete cascade,
    content text not null,
    created_by uuid references public.users(id) on delete set null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
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

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.todos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 