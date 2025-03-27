import { createClient, SupabaseClient } from '@supabase/supabase-js'
import config from './config'

// Create a single Supabase client for interacting with the database
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  }
)

// Admin client that bypasses RLS - uses the same anon key for now
// In production, this should use a service role key with proper security
export const adminSupabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
)

// Log initialization
console.log(`Supabase client initialized with URL: ${config.supabase.url}`);

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
  project_id?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description?: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          content: string;
          completed: boolean;
          project_id?: string;
          assigned_to?: string;
          created_by: string;
          due_date?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          completed?: boolean;
          project_id?: string;
          assigned_to?: string;
          created_by: string;
          due_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          completed?: boolean;
          project_id?: string;
          assigned_to?: string;
          created_by?: string;
          due_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          title: string;
          content: string;
          project_id?: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          project_id?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          project_id?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Export type
export type { SupabaseClient }

// Debug utility for RLS issues
export async function debugRLS<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string
): Promise<{ data: T | null; error: any }> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log(`[RLS Debug] ${context}:`, {
      hasSession: !!session,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    });

    // Attempt the operation
    const result = await operation();

    if (result.error) {
      console.error(`[RLS Error] ${context}:`, {
        error: result.error,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
        code: result.error.code
      });
    }

    return result;
  } catch (error) {
    console.error(`[RLS Exception] ${context}:`, error);
    return { data: null, error };
  }
}

// Test function to check auth and RLS
export async function testAuthAndRLS() {
  try {
    // 1. Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Current session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      return { success: false, error: 'Session error' };
    }

    // 2. Try a simple read operation on profiles table
    const { data: readData, error: readError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (readError) {
      console.error('Read operation error:', {
        message: readError.message,
        details: readError.details,
        hint: readError.hint
      });
      return { success: false, error: 'Read operation failed' };
    }

    return { success: true, data: { readData } };
  } catch (error) {
    console.error('Test error:', error);
    return { success: false, error: 'Test failed' };
  }
} 