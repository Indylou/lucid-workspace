import { createClient } from '@supabase/supabase-js'
import { getCurrentSession } from './auth-service';

// Supabase URL and anon key
// Use environment variables when available (Docker/production) or fallback to hardcoded values for development
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
  throw new Error('REACT_APP_SUPABASE_URL is not configured')
}

if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  throw new Error('REACT_APP_SUPABASE_ANON_KEY is not configured')
}

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Log Supabase initialization
console.log('Supabase client initialized with URL:', supabaseUrl);

// Function to get auth headers for requests
export const getAuthHeaders = (): Record<string, string> => {
  const session = getCurrentSession();
  if (session?.session_token) {
    // Use apikey authorization instead of trying to use a session token as JWT
    // The session token is not a valid JWT and cannot be used directly
    return {
      apikey: supabaseAnonKey,
      // Include user ID in a custom header for RLS policies
      'x-user-id': session.user_id
    };
  }
  return {};
};

// Enhanced query builder that adds auth headers
export const authQuery = {
  from: (table: string) => {
    const builder = supabase.from(table);
    const headers = getAuthHeaders();
    
    if (Object.keys(headers).length > 0) {
      builder.headers = {
        ...builder.headers,
        ...headers
      };
    }
    
    return builder;
  }
};

// Suppress specific connection error messages
const originalConsoleError = console.error;
console.error = function(...args: any[]) {
  const errorMessage = args[0]?.toString() || '';
  if (errorMessage.includes('messaging host not found') || 
      errorMessage.includes('Desktop app port disconnected') || 
      errorMessage.includes('The item cache has not been initialized yet')) {
    return; // Don't log these errors
  }
  originalConsoleError.apply(console, args);
};

// Type definitions
export interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Todo {
  id: string
  content: string
  completed: boolean
  project_id?: string
  assigned_to?: string
  created_by: string
  due_date?: string
  created_at: string
  updated_at: string
}

export type { SupabaseClient } from '@supabase/supabase-js'

export type Document = {
  id: string
  title: string
  content: string
  project_id?: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          avatar_url?: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          avatar_url?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          avatar_url?: string
          created_at?: string
        }
      }
      // Add other table definitions as needed
    }
  }
} 