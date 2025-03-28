-- First ensure RLS is enabled on the documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they cause problems
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'documents_select_all') THEN
        DROP POLICY documents_select_all ON public.documents;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'documents_insert_own') THEN
        DROP POLICY documents_insert_own ON public.documents;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'documents_update_own') THEN
        DROP POLICY documents_update_own ON public.documents;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'documents_delete_own') THEN
        DROP POLICY documents_delete_own ON public.documents;
    END IF;
END
$$;

-- Create the necessary policies

-- Allow read access to all authenticated users
CREATE POLICY documents_select_all ON public.documents
FOR SELECT TO authenticated USING (true);

-- Allow insert for authenticated users, but only for their own documents
CREATE POLICY documents_insert_own ON public.documents
FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Allow update for users who created the document
CREATE POLICY documents_update_own ON public.documents
FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Allow delete for users who created the document
CREATE POLICY documents_delete_own ON public.documents
FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Grant usage on documents to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated; 