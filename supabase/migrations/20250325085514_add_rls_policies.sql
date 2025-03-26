-- Drop existing document policies
drop policy if exists "Allow anonymous read access to documents" on public.documents;
drop policy if exists "Allow anonymous insert access to documents" on public.documents;
drop policy if exists "Allow anonymous update access to documents" on public.documents;
drop policy if exists "Allow anonymous delete access to documents" on public.documents;

-- Create proper user-based document policies
-- Users can see their own documents
create policy "Users can view their own documents"
  on public.documents
  for select
  using (created_by = auth.uid());

-- Users can create documents
create policy "Users can create documents"
  on public.documents
  for insert
  with check (
    created_by = auth.uid() OR 
    auth.uid() IS NOT NULL -- Allow any authenticated user to create documents
  );

-- Users can update their own documents
create policy "Users can update their own documents"
  on public.documents
  for update
  using (created_by = auth.uid());

-- Users can delete their own documents
create policy "Users can delete their own documents"
  on public.documents
  for delete
  using (created_by = auth.uid());

-- For development only: a fallback policy to allow all operations without restrictions
-- Comment this out in production
create policy "Dev mode: Allow all document operations"
  on public.documents
  for all
  using (true)
  with check (true); 