import { supabase } from './supabase';
import { handleSupabaseError, AppError, ErrorType } from './error-handling';
import { Session } from '@supabase/supabase-js';

// Update Project interface to match the database schema
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on-hold';
  progress: number;
  team_size: number;
  tasks_total: number;
  tasks_completed: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  start_date?: string;
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function createProject(
  data: {
    name: string;
    description?: string;
    status?: Project['status'];
    priority?: Project['priority'];
    team_size?: number;
    tags?: string[];
    start_date?: string;
    due_date?: string;
  },
  userId?: string
): Promise<{ project: Project | null; error: AppError | null }> {
  try {
    if (!userId) {
      const { data: session } = await supabase.auth.getSession();
      userId = session?.session?.user?.id;
      
      if (!userId) {
        return { 
          project: null, 
          error: {
            type: ErrorType.VALIDATION,
            message: 'User ID is required to create a project',
            originalError: new Error('Missing userId')
          }
        };
      }
    }
    
    const projectData = {
      name: data.name,
      description: data.description,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      team_size: data.team_size || 1,
      tags: data.tags || [],
      start_date: data.start_date,
      due_date: data.due_date,
      progress: 0,
      tasks_total: 0,
      tasks_completed: 0,
      created_by: userId
    };

    const { data: project, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return { project: null, error: handleSupabaseError(error) };
    }
    
    return { project, error: null };
  } catch (error) {
    console.error('Error creating project:', error);
    return { 
      project: null, 
      error: {
        type: ErrorType.DATA_CREATE,
        message: 'Failed to create project',
        originalError: error as Error
      }
    };
  }
}

export async function getUserProjects(userId?: string): Promise<{ projects: Project[]; error: AppError | null }> {
  try {
    if (!userId) {
      const { data: session } = await supabase.auth.getSession();
      userId = session?.user?.id;
      
      if (!userId) {
        return { 
          projects: [],
          error: {
            type: ErrorType.VALIDATION,
            message: 'User ID is required to fetch projects',
            originalError: new Error('Missing userId')
          }
        };
      }
    }
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return { projects: [], error: handleSupabaseError(error) };
    }
    
    return { projects: data || [], error: null };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { 
      projects: [], 
      error: {
        type: ErrorType.DATA_FETCH,
        message: 'Failed to fetch projects',
        originalError: error as Error
      }
    };
  }
}

export async function updateProject(
  id: string, 
  updates: Partial<Project>
): Promise<{ project: Project | null; error: AppError | null }> {
  try {
    const dbUpdates: Record<string, unknown> = {
      ...updates,
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
      return { project: null, error: handleSupabaseError(error) };
    }
    
    return { project: data, error: null };
  } catch (error) {
    console.error('Error updating project:', error);
    return { 
      project: null, 
      error: {
        type: ErrorType.DATA_UPDATE,
        message: 'Failed to update project',
        originalError: error as Error
      }
    };
  }
}

export async function deleteProject(id: string): Promise<{ success: boolean; error: AppError | null }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: handleSupabaseError(error) };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { 
      success: false, 
      error: {
        type: ErrorType.DATA_DELETE,
        message: 'Failed to delete project',
        originalError: error as Error
      }
    };
  }
}

export async function getProjectById(id: string): Promise<{ project: Project | null; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return { project: null, error: handleSupabaseError(error) };
    }
    
    return { project: data, error: null };
  } catch (error) {
    console.error('Error fetching project:', error);
    return { 
      project: null, 
      error: {
        type: ErrorType.DATA_FETCH,
        message: 'Failed to fetch project',
        originalError: error as Error
      }
    };
  }
}

// Get project metrics
export async function getProjectMetrics(projectId: string): Promise<{ 
  metrics: {
    completion_rate: number;
    tasks_total: number;
    tasks_completed: number;
    team_size: number;
    recent_activity: number;
  }; 
  error: AppError | null;
}> {
  try {
    // Get project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('tasks_total, tasks_completed, team_size')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Get recent activity (tasks updated in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentActivity, error: activityError } = await supabase
      .from('todos')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .gte('updated_at', sevenDaysAgo.toISOString());

    if (activityError) throw activityError;

    return {
      metrics: {
        completion_rate: project.tasks_total > 0 ? (project.tasks_completed / project.tasks_total) * 100 : 0,
        tasks_total: project.tasks_total,
        tasks_completed: project.tasks_completed,
        team_size: project.team_size,
        recent_activity: recentActivity || 0
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching project metrics:', error);
    return {
      metrics: {
        completion_rate: 0,
        tasks_total: 0,
        tasks_completed: 0,
        team_size: 0,
        recent_activity: 0
      },
      error: {
        type: ErrorType.DATA_FETCH,
        message: 'Failed to fetch project metrics',
        originalError: error as Error
      }
    };
  }
} 