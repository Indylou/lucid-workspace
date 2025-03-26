import { supabase } from './supabase'
import { User } from './supabase'
import { handleAuthError, handleSupabaseError, AppError } from './error-handling'
import { saveUserToStorage } from './user-context'

// Authentication service to handle user login, registration, and session management
export interface AuthState {
  user: User | null
  loading: boolean
  error: AppError | null
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthSession {
  id: string
  user_id: string
  session_token: string
  expires_at: string
}

// Store current session in localStorage
const SESSION_KEY = 'app_session'

// Register a new user
export async function registerUser(data: RegisterData): Promise<{ user: User | null; error: AppError | null }> {
  try {
    // Check if user exists
    const { data: existingUsers, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', data.email)
      .limit(1)
    
    if (queryError) {
      console.error('Error checking existing user:', queryError)
      return { user: null, error: handleSupabaseError(queryError) }
    }
    
    if (existingUsers && existingUsers.length > 0) {
      return { 
        user: null, 
        error: handleAuthError('User with this email already exists') 
      }
    }
    
    // Insert new user
    const { error } = await supabase
      .from('users')
      .insert([
        {
          name: data.name,
          email: data.email,
          password: data.password, // Password will be hashed by the DB trigger
        }
      ])
    
    if (error) {
      console.error('Registration error:', error)
      return { user: null, error: handleSupabaseError(error) }
    }
    
    // Create session for the new user
    return await loginUser({ email: data.email, password: data.password })
  } catch (err) {
    console.error('Registration error:', err)
    return { 
      user: null, 
      error: handleAuthError(err as Error) 
    }
  }
}

// Login a user
export async function loginUser(data: LoginData): Promise<{ user: User | null; error: AppError | null }> {
  try {
    console.log('[Auth Service] Attempting login for:', data.email);
    
    // Call the authenticate function
    const { data: userData, error: authError } = await supabase
      .rpc('authenticate', {
        email: data.email,
        password: data.password
      })
    
    if (authError) {
      console.error('[Auth Service] Authentication error:', authError)
      return { user: null, error: handleSupabaseError(authError) }
    }
    
    if (!userData) {
      console.log('[Auth Service] No user data returned from authentication');
      return { 
        user: null, 
        error: handleAuthError('Invalid email or password') 
      }
    }
    
    console.log('[Auth Service] User authenticated:', { userId: userData.id });
    
    // Create a new session
    const { data: sessionData, error: sessionError } = await supabase
      .rpc('create_session', {
        user_id: userData.id
      })
    
    if (sessionError) {
      console.error('[Auth Service] Session creation error:', sessionError)
      return { user: null, error: handleSupabaseError(sessionError) }
    }
    
    if (sessionData) {
      console.log('[Auth Service] Session created:', { userId: userData.id, sessionId: sessionData.id });
      // Store session in localStorage
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
      
      // Also store user data in user storage
      saveUserToStorage(userData as User)
      
      return { user: userData as User, error: null }
    }
    
    return { 
      user: null, 
      error: handleAuthError('Failed to create session') 
    }
  } catch (err) {
    console.error('[Auth Service] Login error:', err)
    return { 
      user: null, 
      error: handleAuthError(err as Error) 
    }
  }
}

// Check if user is logged in
export async function checkAuth(): Promise<{ user: User | null; error: AppError | null }> {
  try {
    // Get session from localStorage
    const sessionData = localStorage.getItem(SESSION_KEY)
    
    if (!sessionData) {
      console.log('[Auth Service] No session found');
      return { user: null, error: null }
    }
    
    const session = JSON.parse(sessionData) as AuthSession
    console.log('[Auth Service] Found session:', { userId: session.user_id });
    
    // Check if session is valid (not expired)
    if (new Date(session.expires_at) < new Date()) {
      console.log('[Auth Service] Session expired');
      // Session expired, clear it
      localStorage.removeItem(SESSION_KEY)
      return { 
        user: null, 
        error: handleAuthError('Session expired') 
      }
    }
    
    // Get the user from Supabase
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, created_at, updated_at')
      .eq('id', session.user_id)
      .single()
    
    if (error) {
      console.error('[Auth Service] Error fetching user:', error)
      localStorage.removeItem(SESSION_KEY)
      return { user: null, error: handleSupabaseError(error) }
    }
    
    if (!userData) {
      console.log('[Auth Service] User not found for session:', { userId: session.user_id });
      localStorage.removeItem(SESSION_KEY)
      return { 
        user: null, 
        error: handleAuthError('User not found') 
      }
    }
    
    console.log('[Auth Service] User authenticated from session:', { userId: userData.id });
    return { user: userData as User, error: null }
  } catch (err) {
    console.error('[Auth Service] Auth check error:', err)
    localStorage.removeItem(SESSION_KEY)
    return { 
      user: null, 
      error: handleAuthError(err as Error) 
    }
  }
}

// Logout the current user
export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
  saveUserToStorage(null)
}

// Get current session
export function getCurrentSession(): AuthSession | null {
  const sessionData = localStorage.getItem(SESSION_KEY)
  
  if (!sessionData) {
    return null
  }
  
  try {
    return JSON.parse(sessionData) as AuthSession
  } catch (err) {
    console.error('Error parsing session:', err)
    return null
  }
} 