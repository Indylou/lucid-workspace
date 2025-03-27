import { supabase, User } from './supabase'
import { handleAuthError, handleSupabaseError, AppError, ErrorType } from './error-handling'

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

// Register a new user with the new Supabase implementation
export async function registerUser(data: RegisterData): Promise<{ user: User | null; error: AppError | null }> {
  try {
    console.log('[Auth Service] Registering user:', data.email);
    
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
      console.error('[Auth Service] Registration error:', signUpError);
      return { user: null, error: handleAuthError(signUpError) };
    }

    if (!authData.user) {
      return { 
        user: null, 
        error: handleAuthError('Failed to create user') 
      };
    }
    
    // Get profile from the profiles table 
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('[Auth Service] Error fetching profile:', profileError);
      
      // Return basic user info even if profile fetch fails
      // The trigger should have created the profile automatically
      const basicUser: User = {
        id: authData.user.id,
        name: data.name,
        email: data.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return { user: basicUser, error: null };
    }
    
    // Transform profile data to User type
    const user: User = {
      id: profile.id,
      name: profile.name,
      email: authData.user.email || '',
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
    
    return { user, error: null };
  } catch (err) {
    console.error('[Auth Service] Registration error:', err);
    return { 
      user: null, 
      error: handleAuthError(err as Error) 
    };
  }
}

// Login a user with the new Supabase implementation
export async function loginUser(data: LoginData): Promise<{ user: User | null; error: AppError | null }> {
  try {
    console.log('[Auth Service] Attempting login for:', data.email);
    
    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (authError) {
      console.error('[Auth Service] Auth error:', authError);
      return { 
        user: null, 
        error: handleAuthError(authError)
      };
    }

    if (!authData.user) {
      console.error('[Auth Service] No user data returned from auth');
      return {
        user: null,
        error: handleAuthError('Authentication failed')
      };
    }

    console.log('[Auth Service] Auth successful, user ID:', authData.user.id);

    // Get user profile from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    if (profileError) {
      console.error('[Auth Service] Error fetching profile:', profileError);
      
      // Return basic user info even if profile fetch fails
      const basicUser: User = {
        id: authData.user.id,
        name: authData.user.user_metadata?.name || 'User',
        email: authData.user.email || '',
        created_at: authData.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return { user: basicUser, error: null };
    }
    
    // Transform profile data to User type
    const user: User = {
      id: profile.id,
      name: profile.name,
      email: authData.user.email || '',
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
    
    return { user, error: null };
  } catch (err) {
    console.error('[Auth Service] Login error:', err);
    return { 
      user: null, 
      error: handleAuthError(err as Error)
    };
  }
}

// Handle email link verification with the new Supabase implementation
export async function handleEmailLink(): Promise<{ user: User | null; error: AppError | null }> {
  try {
    // Get session from email link verification
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[Auth Service] Session error:', sessionError);
      return { user: null, error: handleAuthError(sessionError) };
    }
    
    if (!session?.user) {
      console.log('[Auth Service] No session found after email verification');
      return { user: null, error: null };
    }
    
    console.log('[Auth Service] Found session after email verification for user:', session.user.id);
    
    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('[Auth Service] Error fetching profile:', profileError);
      
      // Return basic user even if profile fetch fails
      const basicUser: User = {
        id: session.user.id,
        name: session.user.user_metadata?.name || 'User',
        email: session.user.email || '',
        created_at: session.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return { user: basicUser, error: null };
    }
    
    // Transform profile data to User type
    const user: User = {
      id: profile.id,
      name: profile.name,
      email: session.user.email || '',
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
    
    return { user, error: null };
  } catch (err) {
    console.error('[Auth Service] Email verification error:', err);
    return { user: null, error: handleAuthError(err as Error) };
  }
}

// Check if user is logged in with the new Supabase implementation
export async function checkAuth(): Promise<{ user: User | null; error: AppError | null }> {
  try {
    // Get current session from Supabase Auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[Auth Service] Session error:', sessionError);
      return { user: null, error: handleAuthError(sessionError) };
    }
    
    if (!session || !session.user) {
      console.log('[Auth Service] No active session found');
      return { user: null, error: null };
    }
    
    console.log('[Auth Service] Found active session for user:', session.user.id);
    
    // Get user profile from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('[Auth Service] Error fetching profile:', profileError);
      
      // Return basic user info even if profile fetch fails
      const basicUser: User = {
        id: session.user.id,
        name: session.user.user_metadata?.name || 'User',
        email: session.user.email || '',
        created_at: session.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return { user: basicUser, error: null };
    }
    
    // Transform profile data to User type
    const user: User = {
      id: profile.id,
      name: profile.name,
      email: session.user.email || '',
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
    
    return { user, error: null };
  } catch (err) {
    console.error('[Auth Service] Auth error:', err);
    return { 
      user: null, 
      error: handleAuthError(err as Error) 
    };
  }
}

// Sign out user with the new Supabase implementation
export async function signOut(): Promise<{ error: AppError | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Auth Service] Sign out error:', error);
      return { error: handleAuthError(error) };
    }
    
    return { error: null };
  } catch (err) {
    console.error('[Auth Service] Sign out error:', err);
    return { error: handleAuthError(err as Error) };
  }
}

// Export signOut as logout for backwards compatibility
export const logout = signOut;

// Placeholder implementation
export async function createUserRecord(userData: { id: string, name: string, email: string, avatar_url?: string }): Promise<{ success: boolean, user: User | null, error: Error | null }> {
  console.log('Create user record called with:', userData);
  return {
    success: false,
    user: null,
    error: new Error('Supabase implementation disabled')
  };
} 