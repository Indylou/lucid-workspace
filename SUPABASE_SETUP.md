# Deeper Analysis: Files Using Supabase Client

Going beyond the core configuration and auth files, here's a deeper analysis of likely files using Supabase throughout the application:

# First Step Plan: Clean Rebuild with New Supabase Workspace

## Phase 1: Inventory and Cleanup

1. **Remove Dependencies on Current Supabase Setup**
   - Identify all files importing from `src/lib/supabase.ts`
   - Create a simple placeholder that returns empty data/null values
   - This prevents runtime errors while rebuilding

2. **Clean Up Environment Configuration**
   - Remove old Supabase API keys from `src/lib/config.ts`
   - Document the configuration structure for the new implementation

## Phase 2: Create New Supabase Project

1. **Set Up New Supabase Workspace**
   - Create a new Supabase project in the dashboard
   - Generate and securely store new API keys
   - Configure auth settings with appropriate redirect URLs

2. **Design Simplified Schema**
   - Create a clean database schema with the following tables:

   ```sql
   -- Users Table (directly use auth.users)
   CREATE TABLE IF NOT EXISTS public.profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     name TEXT NOT NULL,
     avatar_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
   );

   -- Projects Table
   CREATE TABLE IF NOT EXISTS public.projects (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     description TEXT,
     created_by UUID REFERENCES public.profiles(id) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
   );

   -- Todos Table
   CREATE TABLE IF NOT EXISTS public.todos (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     content TEXT NOT NULL,
     completed BOOLEAN DEFAULT false NOT NULL,
     project_id UUID REFERENCES public.projects(id),
     assigned_to UUID REFERENCES public.profiles(id),
     created_by UUID REFERENCES public.profiles(id) NOT NULL,
     due_date TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
   );

   -- Documents Table
   CREATE TABLE IF NOT EXISTS public.documents (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     content TEXT NOT NULL,
     project_id UUID REFERENCES public.projects(id),
     created_by UUID REFERENCES public.profiles(id) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
   );
   ```

3. **Set Up Simple RLS Policies**
   - Create minimal Row Level Security policies:

   ```sql
   -- Profiles: Users can read all profiles, but only update their own
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

   CREATE POLICY profiles_read_all ON public.profiles
     FOR SELECT USING (true);

   CREATE POLICY profiles_update_own ON public.profiles
     FOR UPDATE USING (auth.uid() = id);

   -- Projects: Users can read all projects, but only update/delete their own
   ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

   CREATE POLICY projects_read_all ON public.projects
     FOR SELECT USING (true);

   CREATE POLICY projects_insert_own ON public.projects
     FOR INSERT WITH CHECK (auth.uid() = created_by);

   CREATE POLICY projects_update_own ON public.projects
     FOR UPDATE USING (auth.uid() = created_by);

   CREATE POLICY projects_delete_own ON public.projects
     FOR DELETE USING (auth.uid() = created_by);

   -- Todos: Users can read all todos, but only update/delete their own
   ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

   CREATE POLICY todos_read_all ON public.todos
     FOR SELECT USING (true);

   CREATE POLICY todos_insert_own ON public.todos
     FOR INSERT WITH CHECK (auth.uid() = created_by);

   CREATE POLICY todos_update_own ON public.todos
     FOR UPDATE USING (auth.uid() = created_by);

   CREATE POLICY todos_delete_own ON public.todos
     FOR DELETE USING (auth.uid() = created_by);

   -- Documents: Users can read all documents, but only update/delete their own
   ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

   CREATE POLICY documents_read_all ON public.documents
     FOR SELECT USING (true);

   CREATE POLICY documents_insert_own ON public.documents
     FOR INSERT WITH CHECK (auth.uid() = created_by);

   CREATE POLICY documents_update_own ON public.documents
     FOR UPDATE USING (auth.uid() = created_by);

   CREATE POLICY documents_delete_own ON public.documents
     FOR DELETE USING (auth.uid() = created_by);
   ```

4. **Set Up Database Triggers**
   - Add automatic updated_at timestamp maintenance:

   ```sql
   -- Function to update timestamps
   CREATE OR REPLACE FUNCTION update_timestamp()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = now();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Apply to all tables
   CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles
     FOR EACH ROW EXECUTE FUNCTION update_timestamp();

   CREATE TRIGGER update_projects_timestamp BEFORE UPDATE ON public.projects
     FOR EACH ROW EXECUTE FUNCTION update_timestamp();

   CREATE TRIGGER update_todos_timestamp BEFORE UPDATE ON public.todos
     FOR EACH ROW EXECUTE FUNCTION update_timestamp();

   CREATE TRIGGER update_documents_timestamp BEFORE UPDATE ON public.documents
     FOR EACH ROW EXECUTE FUNCTION update_timestamp();
   ```

## Phase 3: Create Simplified Supabase Client

1. **Implement Simple Client**
   - Replace the current `src/lib/supabase.ts` with:

   ```typescript
   import { createClient, SupabaseClient } from '@supabase/supabase-js';
   import config from './config';

   // Create a single Supabase client for interacting with your database
   export const supabase = createClient(
     config.supabase.url,
     config.supabase.anonKey,
     {
       auth: {
         persistSession: true,
         autoRefreshToken: true,
       }
     }
   );

   // Re-export types for use throughout the app
   export type { SupabaseClient };

   // Define database types
   export interface User {
     id: string;
     name: string;
     email: string;
     avatar_url?: string;
     created_at: string;
     updated_at: string;
   }

   export interface Project {
     id: string;
     name: string;
     description?: string;
     created_by: string;
     created_at: string;
     updated_at: string;
   }

   export interface Todo {
     id: string;
     content: string;
     completed: boolean;
     project_id?: string;
     assigned_to?: string;
     created_by: string;
     due_date?: string;
     created_at: string;
     updated_at: string;
   }

   export interface Document {
     id: string;
     title: string;
     content: string;
     project_id?: string;
     created_by: string;
     created_at: string;
     updated_at: string;
   }
   ```

2. **Update Config**
   - Create a new configuration with the new project keys:

   ```typescript
   // src/lib/config.ts
   interface Config {
     supabase: {
       url: string;
       anonKey: string;
     };
     // Other config props...
   }

   const config: Config = {
     supabase: {
       url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-new-project.supabase.co',
       anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-new-anon-key',
     },
     // Other config...
   };

   export default config;
   ```

## Phase 4: Simplify Auth Service

1. **Streamline Auth Service**
   - Replace `src/lib/auth-service.ts` with a simplified version:

   ```typescript
   import { supabase, User } from './supabase';
   import { AppError, ErrorType } from './error-handling';

   export interface AuthState {
     user: User | null;
     loading: boolean;
     error: AppError | null;
   }

   export interface RegisterData {
     name: string;
     email: string;
     password: string;
   }

   export interface LoginData {
     email: string;
     password: string;
   }

   // Register a new user
   export async function registerUser(data: RegisterData): Promise<{ user: User | null; error: AppError | null }> {
     try {
       // Sign up with Supabase Auth
       const { data: authData, error: signUpError } = await supabase.auth.signUp({
         email: data.email,
         password: data.password,
         options: {
           data: {
             name: data.name
           }
         }
       });
       
       if (signUpError) {
         return { user: null, error: { type: ErrorType.AUTH, message: signUpError.message, originalError: signUpError }};
       }

       if (!authData.user) {
         return { user: null, error: { type: ErrorType.AUTH, message: 'Failed to create user', originalError: new Error('No user returned') }};
       }

       // Insert profile data
       const { data: profileData, error: profileError } = await supabase
         .from('profiles')
         .insert([
           { 
             id: authData.user.id,
             name: data.name,
           }
         ])
         .select()
         .single();

       if (profileError) {
         return { user: null, error: { type: ErrorType.DATA_CREATE, message: 'Failed to create profile', originalError: profileError }};
       }

       // Return user data
       const user: User = {
         id: profileData.id,
         name: profileData.name,
         email: data.email,
         avatar_url: profileData.avatar_url,
         created_at: profileData.created_at,
         updated_at: profileData.updated_at
       };
       
       return { user, error: null };
     } catch (err) {
       return { user: null, error: { type: ErrorType.AUTH, message: 'Registration failed', originalError: err as Error }};
     }
   }

   // Login a user
   export async function loginUser(data: LoginData): Promise<{ user: User | null; error: AppError | null }> {
     try {
       // Authenticate with Supabase Auth
       const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
         email: data.email,
         password: data.password
       });

       if (authError) {
         return { user: null, error: { type: ErrorType.AUTH, message: authError.message, originalError: authError }};
       }

       if (!authData.user) {
         return { user: null, error: { type: ErrorType.AUTH, message: 'Authentication failed', originalError: new Error('No user returned') }};
       }

       // Get user profile
       const { data: profileData, error: profileError } = await supabase
         .from('profiles')
         .select('*')
         .eq('id', authData.user.id)
         .single();
         
       if (profileError) {
         return { user: null, error: { type: ErrorType.DATA_FETCH, message: 'Failed to fetch profile', originalError: profileError }};
       }
       
       // Return user data
       const user: User = {
         id: profileData.id,
         name: profileData.name,
         email: authData.user.email || '',
         avatar_url: profileData.avatar_url,
         created_at: profileData.created_at,
         updated_at: profileData.updated_at
       };
       
       return { user, error: null };
     } catch (err) {
       return { user: null, error: { type: ErrorType.AUTH, message: 'Login failed', originalError: err as Error }};
     }
   }

   // Check if user is logged in
   export async function checkAuth(): Promise<{ user: User | null; error: AppError | null }> {
     try {
       const { data: { session }, error: sessionError } = await supabase.auth.getSession();
       
       if (sessionError) {
         return { user: null, error: { type: ErrorType.AUTH, message: sessionError.message, originalError: sessionError }};
       }
       
       if (!session || !session.user) {
         return { user: null, error: null };
       }
       
       // Get user profile
       const { data: profileData, error: profileError } = await supabase
         .from('profiles')
         .select('*')
         .eq('id', session.user.id)
         .single();
         
       if (profileError) {
         return { user: null, error: { type: ErrorType.DATA_FETCH, message: 'Failed to fetch profile', originalError: profileError }};
       }
       
       // Return user data
       const user: User = {
         id: profileData.id,
         name: profileData.name,
         email: session.user.email || '',
         avatar_url: profileData.avatar_url,
         created_at: profileData.created_at,
         updated_at: profileData.updated_at
       };
       
       return { user, error: null };
     } catch (err) {
       return { user: null, error: { type: ErrorType.AUTH, message: 'Session check failed', originalError: err as Error }};
     }
   }

   // Sign out
   export async function signOut(): Promise<{ error: AppError | null }> {
     try {
       const { error } = await supabase.auth.signOut();
       
       if (error) {
         return { error: { type: ErrorType.AUTH, message: error.message, originalError: error }};
       }
       
       return { error: null };
     } catch (err) {
       return { error: { type: ErrorType.AUTH, message: 'Sign out failed', originalError: err as Error }};
     }
   }
   ```

## Phase 5: Update Service Modules

1. **Update Todo Service**
   - Simplify todo service implementation to use the new schema
   - Remove use of adminSupabase and unnecessary error handling

2. **Update Project Service**
   - Update to work with the new schema and client
   - Simplify project operations

3. **Update Document Service**
   - Implement with the new schema
   - Simplify document operations

## Phase 6: Update UI Components

For each component that uses Supabase directly:

1. Ensure they're using the service modules instead of direct Supabase access
2. Update imports to reference the new client/types
3. Test functionality with the new backend

## Implementation Strategy

1. **Setup First**
   - Create the new Supabase project and SQL schema before code changes
   - Verify RLS policies work as expected with test data

2. **Incremental Approach**
   - Focus on one feature at a time: Auth → Todos → Projects → Documents
   - Complete and test each module before moving to the next

3. **Testing Plan**
   - Create test accounts in the new Supabase project
   - Verify authentication flow
   - Test CRUD operations for each entity
   - Confirm RLS policies prevent unauthorized access

This approach creates a clean separation from the old implementation and avoids the complexity of migrating or working with the existing Supabase setup. By starting fresh, we eliminate potential issues from the old schema and RLS policies.

## Component and Feature Files

### Todo-Related Files
- **`src/components/Todo.tsx`** or similar
  - Likely uses Supabase for CRUD operations on todos
  - May implement real-time subscriptions for updates
  - Would handle RLS permissions for todo access

### Project-Related Files
- **`src/components/Project.tsx`** or **`src/features/projects/`**
  - Creates and manages projects
  - Likely handles project member permissions
  - Would query projects with Supabase filters

### Document-Related Files
- **`src/components/Document.tsx`** or **`src/features/documents/`**
  - Document creation/editing using Supabase storage
  - May implement collaborative features using Supabase realtime
  - Would handle document attachments

### User Profile Files
- **`src/components/Profile.tsx`** or **`src/pages/Profile.jsx`**
  - Updates user profile information
  - Uploads avatar images to Supabase storage
  - Reads user data with Supabase queries

## Service/API Files

### Data Services
- **`src/lib/todo-service.ts`**
  - Contains Supabase queries specific to todos
  - Handles todo filtering, sorting, and pagination

- **`src/lib/project-service.ts`**
  - Manages project data through Supabase
  - Likely handles permissions and sharing

- **`src/lib/document-service.ts`**
  - Document CRUD operations
  - Possibly manages versioning or history

### Storage Services
- **`src/lib/storage-service.ts`**
  - File uploads to Supabase storage
  - Attachment handling for todos and documents
  - Image processing for avatars or document thumbnails

### Realtime Services
- **`src/lib/realtime-service.ts`**
  - Sets up Supabase realtime subscriptions
  - Handles collaborative features
  - Manages notifications for updates

## Context Providers

- **`src/context/DataContext.tsx`** or **`src/providers/SupabaseProvider.tsx`**
  - Might provide Supabase clients to components
  - Could manage shared queries and caching
  - Possibly handles authentication state

## Hooks

- **`src/hooks/useSupabase.ts`**
  - Custom hook for accessing Supabase client
  - Might include query helpers

- **`src/hooks/useTodos.ts`**
  - Todo-specific data fetching with Supabase
  - Real-time subscription management

- **`src/hooks/useProjects.ts`**
  - Project data management
  - Team/collaboration features

## Utility Files

- **`src/utils/supabase-helpers.ts`**
  - Query formatting helpers
  - Error handling utilities specific to Supabase
  - Transformation functions for Supabase responses

This deeper analysis shows that Supabase is likely integrated throughout your application's feature components, services, and utility files. The authentication issue may be impacting all of these integrations because they depend on a working authentication system to properly apply Row Level Security policies.

## Supabase Flow Diagram

```
+---------------------+        +-----------------------+
| Browser/Client App  |        | Supabase Backend      |
+---------------------+        +-----------------------+
          |                               |
          |                               |
          v                               v
+---------------------+        +-----------------------+
| config.ts           |------->| supabase/config.toml  |
| - Supabase URLs     |        | - Auth settings       |
| - API keys          |        | - Site URLs           |
+---------------------+        | - JWT settings        |
          |                    +-----------------------+
          |                               |
          v                               |
+---------------------+                   |
| supabase.ts         |<------------------+
| - createClient()    |
| - Client config     |
+---------------------+
    |           |
    |           |
    v           v
+------------+ +----------------+
| Standard   | | Admin client   |
| Client     | | (service role) |
+------------+ +----------------+
    |           |
    |           +----------------+
    v                            |
+------------------+             |
| auth-service.ts  |<------------+
| - loginUser()    |
| - registerUser() |
| - createUser()   |
+------------------+
    |
    +-----+------+------+------+-----+
    |     |      |      |      |     |
    v     v      v      v      v     v
+------+ +-----+ +-----+ +------+ +-------+
| Todo | | Doc | | User| |Project| | Files |
| Svcs | | Svcs| | Svcs| | Svcs  | | Svcs  |
+------+ +-----+ +-----+ +------+ +-------+
    |     |      |      |      |     |
    +-----+------+------+------+-----+
    |
    v
+----------------------+
| React Components     |
| - Todo               |
| - Document           |
| - Project            |
| - UserProfile        |
+----------------------+
    |
    v
+----------------------+
| UI                   |
+----------------------+

Auth Flow:
1. Client → auth-service.loginUser() → supabase.auth.signInWithPassword()
2. Supabase auth service validates credentials
3. On success: JWT token returned, stored in localStorage
4. Client loads profile data using token: supabase.from('users').select()
5. RLS policies applied based on user's auth context

Data flow with RLS:
1. Component needs data → service → Supabase client
2. JWT token automatically included in request
3. Supabase validates token and applies RLS
4. Only authorized data returned to client
```

## Proposed Simplified Architecture

For an internal application, we can significantly simplify this architecture to reduce complexity and potential points of failure:

```
+---------------------+          +-----------------------+
| Browser/Client App  |          | Supabase Backend      |
+---------------------+          +-----------------------+
          |                                |
          v                                |
+---------------------+                    |
| Simple Client Layer |                    |
| - Single supabase   |<-------------------+
|   client instance   |
| - Minimal config    |
+---------------------+
          |
          |
    +-----+-----+
    |           |
    v           v
+----------+ +----------+
| Auth API | | Data API |
| - Login  | | - CRUD   |
| - Logout | |   methods|
+----------+ +----------+
    |           |
    +-----------+
          |
          v
+----------------------+
| React Components     |
| with React Query     |
| or simple hooks      |
+----------------------+
          |
          v
+----------------------+
| UI                   |
+----------------------+

Simplified Auth Flow:
1. Login component → Auth API → supabase.auth.signInWithPassword()
2. On success: JWT token stored in localStorage 
3. All subsequent requests use this token automatically

Simplified Data Access:
1. Disable RLS for internal app OR use simple policies
2. Single pattern for data access via Data API
3. No synchronization between auth.users/public.users
4. One-table approach for users (use auth.users directly)

Key Improvements:
- Single Supabase client instance
- No separate admin client or service role usage
- Direct data access patterns
- Fewer abstraction layers
- Simpler debugging and error tracing