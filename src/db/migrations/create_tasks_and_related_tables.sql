-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_status AS ENUM ('online', 'away', 'offline');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    color_scheme VARCHAR(50),
    is_archived BOOLEAN DEFAULT FALSE
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority task_priority NOT NULL DEFAULT 'medium',
    status task_status NOT NULL DEFAULT 'todo',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    estimated_hours DECIMAL(5,2),
    is_blocked BOOLEAN DEFAULT FALSE,
    position INTEGER,
    parent_task_id UUID REFERENCES tasks(id)
);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT FALSE
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS task_tags (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- Time tracking (simplified for startup use)
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task activity log
CREATE TABLE IF NOT EXISTS task_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    role VARCHAR(50) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status member_status DEFAULT 'offline',
    last_active_at TIMESTAMPTZ,
    UNIQUE (user_id, project_id)
);

-- AI insights for startup metrics
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    impact_level VARCHAR(20),
    metrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Team productivity metrics
CREATE TABLE IF NOT EXISTS productivity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    metric_type VARCHAR(50) NOT NULL, -- 'velocity', 'completion_rate', 'focus_time', etc.
    value DECIMAL(10,2) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB
);

-- Create indexes (IF NOT EXISTS is not needed for indexes as they're automatically handled)
DO $$ BEGIN
    CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_tasks_due_date ON tasks(due_date);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_time_entries_user_task ON time_entries(user_id, task_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_task_activities_task ON task_activities(task_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_productivity_metrics_project ON productivity_metrics(project_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS calculate_project_completion_rate(UUID);
DROP FUNCTION IF EXISTS calculate_team_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

-- Function to calculate task completion rate
CREATE OR REPLACE FUNCTION calculate_project_completion_rate(project_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tasks
    FROM tasks
    WHERE tasks.project_id = $1;

    SELECT COUNT(*) INTO completed_tasks
    FROM tasks
    WHERE tasks.project_id = $1 AND status = 'done';

    IF total_tasks = 0 THEN
        RETURN 0;
    END IF;

    RETURN (completed_tasks::DECIMAL / total_tasks::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate team productivity metrics
CREATE OR REPLACE FUNCTION calculate_team_metrics(project_id UUID, start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
    total_tasks_completed INTEGER,
    avg_completion_time DECIMAL,
    team_velocity DECIMAL,
    focus_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH completed_tasks AS (
        SELECT 
            t.id,
            t.created_at,
            t.updated_at,
            EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600 as hours_to_complete
        FROM tasks t
        WHERE t.project_id = $1
        AND t.status = 'done'
        AND t.updated_at BETWEEN $2 AND $3
    ),
    focus_metrics AS (
        SELECT 
            COALESCE(
                AVG(EXTRACT(EPOCH FROM (te.end_time - te.start_time))/3600),
                0
            ) as avg_focus_time
        FROM time_entries te
        JOIN tasks t ON te.task_id = t.id
        WHERE t.project_id = $1
        AND te.start_time BETWEEN $2 AND $3
        AND te.end_time IS NOT NULL
    )
    SELECT
        COUNT(ct.id)::INTEGER as total_tasks_completed,
        COALESCE(AVG(ct.hours_to_complete), 0)::DECIMAL as avg_completion_time,
        (COUNT(ct.id) / EXTRACT(DAYS FROM ($3 - $2)))::DECIMAL as team_velocity,
        COALESCE(fm.avg_focus_time, 0)::DECIMAL as focus_score
    FROM completed_tasks ct
    CROSS JOIN focus_metrics fm;
END;
$$ LANGUAGE plpgsql; 