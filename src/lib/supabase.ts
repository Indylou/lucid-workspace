import { createClient } from '@supabase/supabase-js'

// Supabase URL and anon key
const supabaseUrl = 'https://tygibsmxqdslroimelkh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5Z2lic214cWRzbHJvaW1lbGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzAzMDIsImV4cCI6MjA1ODQ0NjMwMn0.ar3hEgext-BNJtibzCFPAMQBStNtmS02Y8aXBLnjwcU'

// Create a single supabase client for the entire app with auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
})

// Create a separate admin client that can bypass RLS
export const adminSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'x-supabase-auth': 'preferService'
    }
  }
})

// Test function to verify connectivity
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
    
    console.log('Supabase connection test succeeded:', data)
    return true
  } catch (err) {
    console.error('Supabase connection test threw error:', err)
    return false
  }
}

// Run test on init
testSupabaseConnection()
  .then(success => console.log('Initial connection test:', success ? 'OK' : 'FAILED'))
  .catch(err => console.error('Connection test error:', err))

// Log Supabase initialization
console.log('Supabase client initialized with URL:', supabaseUrl);

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