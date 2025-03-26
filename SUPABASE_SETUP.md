# Supabase Setup Guide

This guide will help you set up Supabase for the Lucid Team Todo app.

## Credentials

- **URL**: https://tygibsmxqdslroimelkh.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5Z2lic214cWRzbHJvaW1lbGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzAzMDIsImV4cCI6MjA1ODQ0NjMwMn0.ar3hEgext-BNJtibzCFPAMQBStNtmS02Y8aXBLnjwcU

## Setting Up Database Schema

1. **Login to Supabase Dashboard**:
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Select your project

2. **Run SQL Scripts**:
   - Navigate to the SQL Editor
   - Create a new query
   - Copy the contents of the `supabase/schema.sql` file from this repository
   - Execute the SQL script to set up the tables and sample data

## Table Structure

The database schema consists of the following tables:

### users
- `id`: UUID primary key
- `email`: User email (unique)
- `name`: User's display name
- `avatar_url`: URL to user's avatar image
- `created_at`: Timestamp

### projects
- `id`: UUID primary key
- `name`: Project name
- `description`: Project description
- `created_at`: Timestamp

### documents
- `id`: UUID primary key
- `title`: Document title
- `content`: Document content (HTML)
- `project_id`: Reference to projects table
- `created_at`: Timestamp
- `updated_at`: Timestamp

### todos
- `id`: Text primary key (client-generated UUID)
- `content`: Todo item text content
- `assigned_to`: Reference to users table
- `project_id`: Reference to projects table
- `document_id`: Reference to documents table
- `completed`: Boolean flag
- `position`: For ordering todos
- `created_at`: Timestamp

## Realtime Setup

The SQL script enables Realtime for the `todos` table by creating a publication. This allows for real-time updates in the app.

## Row Level Security (RLS)

For development purposes, the script sets up permissive RLS policies to allow anonymous access. In a production environment, these would be restricted to authenticated users only.

## Sample Data

The script inserts sample users and projects:

### Users
- Alice Smith (user1@example.com)
- Bob Johnson (user2@example.com)
- Carol Williams (user3@example.com)
- David Brown (user4@example.com)

### Projects
- Marketing Campaign (project1)
- Demo Project (project-demo)

## Testing the Setup

After running the SQL script, you can verify the setup by:

1. Checking the Tables section in Supabase to ensure all tables were created
2. Querying the sample data to verify it was inserted correctly
3. Testing Realtime functionality by making updates and verifying the changes are propagated 