import { createClient } from '@supabase/supabase-js'
import config from './config'

// Get Supabase configuration from our config
const supabaseUrl = config.supabase.url
const supabaseServiceKey = config.supabase.serviceRoleKey
const supabaseAnonKey = config.supabase.anonKey

// Log keys for debugging (showing only first/last few characters for security)
function safeLogKey(key: string, name: string) {
  if (!key) return console.log(`${name}: <not set>`);
  const firstChars = key.substring(0, 8);
  const lastChars = key.substring(key.length - 8);
  console.log(`${name}: ${firstChars}...${lastChars}`);
}

console.log('=== Supabase Configuration ===');
console.log(`URL: ${supabaseUrl}`);
safeLogKey(supabaseAnonKey, 'Anon Key');
safeLogKey(supabaseServiceKey, 'Service Key');
console.log('============================');

// Standard client for auth operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client with service role key for database operations
export const adminSupabase = createClient(supabaseUrl, supabaseServiceKey)

// Suppress specific connection error messages
const originalConsoleError = console.error
console.error = function(...args: any[]) {
  const errorMessage = args[0]?.toString() || ''
  if (errorMessage.includes('messaging host not found') || 
      errorMessage.includes('Desktop app port disconnected') || 
      errorMessage.includes('The item cache has not been initialized yet')) {
    return // Don't log these errors
  }
  originalConsoleError.apply(console, args)
}

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