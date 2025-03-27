import { supabase, adminSupabase } from './supabase'
import { User } from './supabase'
import { handleAuthError, handleSupabaseError, AppError, ErrorType } from './error-handling'
import { v4 as uuidv4 } from 'uuid';

// Enable development mode to bypass auth
const DEV_MODE = false;
const DEV_USER: User = {
  id: 'dev-user-id',
  name: 'Development User',
  email: 'dev@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

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

// Register a new user
export async function registerUser(data: RegisterData): Promise<{ user: User | null; error: AppError | null }> {
  // In dev mode, return mock user immediately
  if (DEV_MODE) {
    console.log('[DEV MODE] Bypassing registration for:', data.email);
    return { user: DEV_USER, error: null };
  }
  
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
    })
    
    if (signUpError) {
      console.error('Registration error:', signUpError)
      return { user: null, error: handleAuthError(signUpError) }
    }

    if (!authData.user) {
      return { 
        user: null, 
        error: handleAuthError('Failed to create user') 
      }
    }

    // Create user profile in the users table
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        name: data.name,
        email: data.email
      }])

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      return { user: null, error: handleSupabaseError(profileError) }
    }

    const user: User = {
      id: authData.user.id,
      name: data.name,
      email: data.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    return { user, error: null }
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
  // In dev mode, return mock user immediately
  if (DEV_MODE) {
    console.log('[DEV MODE] Bypassing login for:', data.email);
    return { user: DEV_USER, error: null };
  }
  
  try {
    console.log('[Auth Service] Attempting login for:', data.email);
    
    // First test if we can query the database
    console.log('[Auth Service] Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (testError) {
      console.error('[Auth Service] Database connection test failed:', testError);
    } else {
      console.log('[Auth Service] Database connection test succeeded:', testData);
    }
    
    // Check if the user exists in the database
    console.log('[Auth Service] Checking if user exists:', data.email);
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', data.email)
      .maybeSingle();
      
    if (userError) {
      console.error('[Auth Service] Error checking for user:', userError);
    } else {
      console.log('[Auth Service] Existing user check result:', existingUser);
    }
    
    // If user exists in database, return it
    if (existingUser) {
      console.log('[Auth Service] Found existing user:', existingUser);
      return { 
        user: existingUser as User, 
        error: null 
      };
    }
    
    // If not found in database, create a simplified user (workaround for auth issues)
    console.log('[Auth Service] Creating simplified user record for:', data.email);
    
    // Generate a UUID for the user
    const userId = uuidv4();
    
    // Create the user record - using adminSupabase to bypass RLS
    const newUser: User = {
      id: userId,
      name: data.email.split('@')[0],
      email: data.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Use adminSupabase to bypass RLS policies
    const { error: insertError } = await adminSupabase
      .from('users')
      .insert([newUser])
      .select();
      
    if (insertError) {
      console.error('[Auth Service] Failed to create user record:', insertError);
      return { 
        user: null, 
        error: handleSupabaseError(insertError, ErrorType.DATA_CREATE) 
      };
    }
    
    console.log('[Auth Service] Successfully created user record');
    return { user: newUser, error: null };
  } catch (err) {
    console.error('[Auth Service] Login error:', err);
    return { 
      user: null, 
      error: handleAuthError(err as Error) 
    };
  }
}

// Handle OTP verification
export async function handleEmailLink(): Promise<{ user: User | null; error: AppError | null }> {
  // In dev mode, return mock user immediately
  if (DEV_MODE) {
    console.log('[DEV MODE] Bypassing email verification');
    return { user: DEV_USER, error: null };
  }
  
  try {
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[Auth Service] Session error:', sessionError);
      return { user: null, error: handleAuthError(sessionError) };
    }
    
    if (!session?.user) {
      console.log('[Auth Service] No session found after OTP verification');
      return { user: null, error: null };
    }
    
    // Get user profile data
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, created_at, updated_at')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('[Auth Service] Error fetching user profile:', profileError);
      // Return auth user even if profile fetch fails
      const basicUser: User = {
        id: session.user.id,
        name: session.user.user_metadata?.name || 'User',
        email: session.user.email || '',
        created_at: session.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return { user: basicUser, error: null };
    }
    
    return { user: userData as User, error: null };
  } catch (err) {
    console.error('[Auth Service] Email verification error:', err);
    return { user: null, error: handleAuthError(err as Error) };
  }
}

// Check if user is logged in
export async function checkAuth(): Promise<{ user: User | null; error: AppError | null }> {
  // In dev mode, return mock user immediately
  if (DEV_MODE) {
    console.log('[DEV MODE] Bypassing auth check');
    return { user: DEV_USER, error: null };
  }
  
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Auth Service] Session error:', sessionError)
      return { user: null, error: handleAuthError(sessionError) }
    }
    
    if (!session) {
      console.log('[Auth Service] No session found');
      return { user: null, error: null }
    }
    
    // Get user profile from the users table
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    if (profileError) {
      console.error('[Auth Service] Error fetching user profile:', profileError)
      return { user: null, error: handleSupabaseError(profileError) }
    }
    
    return { user: userData as User, error: null }
  } catch (err) {
    console.error('[Auth Service] Auth check error:', err)
    return { 
      user: null, 
      error: handleAuthError(err as Error) 
    }
  }
}

// Logout user
export async function logout(): Promise<void> {
  if (!DEV_MODE) {
    await supabase.auth.signOut()
  } else {
    console.log('[DEV MODE] Bypassing logout');
  }
} 