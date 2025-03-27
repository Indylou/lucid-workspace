import { supabase, adminSupabase } from './supabase'
import { User } from './supabase'
import { handleAuthError, handleSupabaseError, AppError, ErrorType } from './error-handling'
import { v4 as uuidv4 } from 'uuid';



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

    // Create user profile using our helper function for consistency
    const { success, user: newUser, error: createError } = await createUserRecord({
      id: authData.user.id,
      name: data.name,
      email: data.email
    });

    if (!success || createError) {
      console.error('Error creating user profile:', createError)
      return { 
        user: null, 
        error: { 
          type: ErrorType.DATA_CREATE,
          message: 'Failed to create user record',
          originalError: createError || new Error('Unknown error creating user')
        }
      };
    }
    
    return { user: newUser as User, error: null }
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
    
    // Direct database lookup approach using the anon key (which is working)
    console.log('[Auth Service] Looking up user by email in database');
    
    // Use standard supabase client with anon key
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', data.email)
      .maybeSingle();
      
    if (userError) {
      console.error('[Auth Service] Error querying user by email:', userError);
      return { 
        user: null, 
        error: { 
          type: ErrorType.DATA_FETCH,
          message: 'Failed to check if user exists',
          originalError: userError
        }
      };
    }
    
    console.log('[Auth Service] User lookup result:', existingUser ? 'Found' : 'Not found');
    
    // If user exists in database, return it
    if (existingUser) {
      console.log('[Auth Service] Found existing user with ID:', existingUser.id);
      return { 
        user: existingUser as User, 
        error: null 
      };
    }
    
    // If not found in database, create a simplified user record
    console.log('[Auth Service] User not found. Creating simplified user record for:', data.email);
    
    // Generate a UUID for the user
    const userId = uuidv4();
    console.log('[Auth Service] Generated UUID for new user:', userId);
    
    // Use our helper function to create the user record
    const { success, user: newUser, error: createError } = await createUserRecord({
      id: userId,
      email: data.email,
      name: data.email.split('@')[0],
      avatar_url: undefined
    });
      
    if (!success || createError) {
      console.error('[Auth Service] Failed to create user record:', createError);
      return { 
        user: null, 
        error: { 
          type: ErrorType.DATA_CREATE,
          message: 'Failed to create user record',
          originalError: createError || new Error('Unknown error creating user')
        }
      };
    }
    
    console.log('[Auth Service] Successfully created user record with ID:', newUser?.id);
    console.log('[Auth Service] Login process completed successfully');
    return { user: newUser as User, error: null };
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
    const { data: userData, error: profileError } = await adminSupabase
      .from('users')
      .select('id, name, email, avatar_url, created_at, updated_at')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('[Auth Service] Error fetching user profile:', profileError);
      
      // If the user has no profile after email verification, create one
      if (profileError.code === 'PGRST116') { // "No rows returned"
        console.log('[Auth Service] User verified email but has no profile. Creating profile.');
        
        // Create a user record
        const { success, user: newUser, error: createError } = await createUserRecord({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          avatar_url: session.user.user_metadata?.avatar_url
        });
        
        if (!success || createError) {
          console.error('[Auth Service] Failed to create user profile after verification:', createError);
          // Return a basic user object even if profile creation fails
          const basicUser: User = {
            id: session.user.id,
            name: session.user.user_metadata?.name || 'User',
            email: session.user.email || '',
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          return { user: basicUser, error: null };
        }
        
        console.log('[Auth Service] Successfully created user profile after verification');
        return { user: newUser as User, error: null };
      }
      
      // Return a basic user even if profile fetch fails
      const basicUser: User = {
        id: session.user.id,
        name: session.user.user_metadata?.name || 'User',
        email: session.user.email || '',
        created_at: session.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return { user: basicUser, error: null };
    }
    
    console.log('[Auth Service] Successfully retrieved user profile after verification');
    return { user: userData as User, error: null };
  } catch (err) {
    console.error('[Auth Service] Email verification error:', err);
    return { user: null, error: handleAuthError(err as Error) };
  }
}

// Check if user is logged in
export async function checkAuth(): Promise<{ user: User | null; error: AppError | null }> {
  try {
    // Get current session from Supabase Auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Auth Service] Session error:', sessionError)
      return { user: null, error: handleAuthError(sessionError) }
    }
    
    if (!session || !session.user) {
      console.log('[Auth Service] No active session found');
      return { user: null, error: null }
    }
    
    console.log('[Auth Service] Found active session for user:', session.user.id);
    
    // Get user profile from the users table
    const { data: userData, error: profileError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    if (profileError) {
      console.error('[Auth Service] Error fetching user profile:', profileError);
      
      // If the user has an auth session but no profile, create one
      if (profileError.code === 'PGRST116') { // "No rows returned"
        console.log('[Auth Service] User has auth session but no profile. Creating profile.');
        
        // Create a user record
        const { success, user: newUser, error: createError } = await createUserRecord({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          avatar_url: session.user.user_metadata?.avatar_url
        });
        
        if (!success || createError) {
          console.error('[Auth Service] Failed to create user profile:', createError);
          return { 
            user: null, 
            error: { 
              type: ErrorType.DATA_CREATE, 
              message: 'Failed to create user profile',
              originalError: createError || new Error('Unknown error creating user profile')
            } 
          };
        }
        
        console.log('[Auth Service] Successfully created user profile');
        return { user: newUser as User, error: null };
      }
      
      return { user: null, error: handleSupabaseError(profileError) }
    }
    
    console.log('[Auth Service] Successfully retrieved user profile');
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
  await supabase.auth.signOut()
}

/**
 * Create a user record in the public.users table
 * This is a simplification to avoid setting up migrations and triggers
 */
export async function createUserRecord(user: { id: string, email: string, name?: string, avatar_url?: string }) {
  console.log('[Auth Service] Creating user record with:', {
    id: user.id,
    email: user.email,
    name: user.name || user.email.split('@')[0],
  });
  
  // Prepare the user record according to schema
  const userRecord = {
    id: user.id,
    name: user.name || user.email.split('@')[0], // Use email username as name if not provided
    email: user.email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Only add avatar_url if it exists to match schema expectations
  if (user.avatar_url) {
    Object.assign(userRecord, { avatar_url: user.avatar_url });
  }
  
  try {
    // Insert into database using supabase with anon key
    const { data, error } = await supabase
      .from('users')
      .insert([userRecord])
      .select();
    
    if (error) {
      console.error('[Auth Service] Failed to create user record:', error);
      return { success: false, error };
    }
    
    console.log('[Auth Service] User record created successfully');
    return { success: true, user: data[0] };
  } catch (error) {
    console.error('[Auth Service] Error creating user record:', error);
    return { success: false, error };
  }
} 