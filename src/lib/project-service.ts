import { supabase, Project } from './supabase';

export async function createProject(name: string, description?: string): Promise<{ project: Project | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
      })
      .select()
      .single();

    if (error) throw error;
    return { project: data, error: null };
  } catch (error) {
    console.error('Error creating project:', error);
    return { project: null, error: error as Error };
  }
}

export async function getUserProjects(): Promise<{ projects: Project[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { projects: data || [], error: null };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { projects: [], error: error as Error };
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<{ project: Project | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
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

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error as Error };
  }
} 