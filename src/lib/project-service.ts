import { supabase, Project } from './supabase';
import { handleSupabaseError, AppError, ErrorType } from './error-handling';

export async function createProject(name: string, description?: string, userId?: string): Promise<{ project: Project | null; error: Error | null }> {
  try {
    if (!userId) {
      // Try to get current user id from session if not provided
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id;
      
      if (!userId) {
        return { 
          project: null, 
          error: new Error('User ID is required to create a project')
        };
      }
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return { project: null, error: error };
    }
    
    return { project: data, error: null };
  } catch (error) {
    console.error('Error creating project:', error);
    return { project: null, error: error as Error };
  }
}

export async function getUserProjects(userId?: string): Promise<{ projects: Project[]; error: Error | null }> {
  try {
    if (!userId) {
      // Try to get current user id from session if not provided
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id;
      
      if (!userId) {
        return { 
          projects: [],
          error: new Error('User ID is required to fetch projects')
        };
      }
    }
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return { projects: [], error: error };
    }
    
    return { projects: data || [], error: null };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { projects: [], error: error as Error };
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<{ project: Project | null; error: Error | null }> {
  try {
    // Convert to DB field names if necessary
    const dbUpdates: any = {
      name: updates.name,
      description: updates.description,
      updated_at: new Date().toISOString()
    };
    
    // Remove undefined fields
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) {
        delete dbUpdates[key];
      }
    });
    
    const { data, error } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return { project: null, error: error };
    }
    
    return { project: data, error: null };
  } catch (error) {
    console.error('Error updating project:', error);
    return { project: null, error: error as Error };
  }
}

export async function deleteProject(id: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error as Error };
  }
}

export async function getProjectById(id: string): Promise<{ project: Project | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return { project: null, error: error };
    }
    
    return { project: data, error: null };
  } catch (error) {
    console.error('Error fetching project:', error);
    return { project: null, error: error as Error };
  }
} 