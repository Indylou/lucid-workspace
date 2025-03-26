-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    project_id UUID REFERENCES projects(id),
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add RLS policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (created_by = auth.uid());

CREATE POLICY "Users can create their own projects"
    ON projects FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (created_by = auth.uid());

-- Todos policies
CREATE POLICY "Users can view todos they created or are assigned to"
    ON todos FOR SELECT
    USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can create todos"
    ON todos FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update todos they created or are assigned to"
    ON todos FOR UPDATE
    USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can delete todos they created"
    ON todos FOR DELETE
    USING (created_by = auth.uid());

-- Add indexes
CREATE INDEX IF NOT EXISTS todos_project_id_idx ON todos(project_id);
CREATE INDEX IF NOT EXISTS todos_assigned_to_idx ON todos(assigned_to);
CREATE INDEX IF NOT EXISTS todos_created_by_idx ON todos(created_by); 