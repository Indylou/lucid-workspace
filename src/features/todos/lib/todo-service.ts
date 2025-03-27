import { supabase, adminSupabase } from '../../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { handleSupabaseError, AppError, ErrorType } from '../../../lib/error-handling';

// Types for Todo Items
export interface TodoItemAttributes {
  id: string;
  content: string;
  completed?: boolean;
  projectId?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// Get all todo items for a user
export async function getUserTodos(userId: string): Promise<{ todos: TodoItemAttributes[]; error: AppError | null; }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching todos:', error);
      return { todos: [], error: handleSupabaseError(error) };
    }
    
    // Transform the data to match our expected format
    const todos = data.map(item => ({
      id: item.id,
      content: item.content,
      completed: item.completed || false,
      projectId: item.project_id,
      assignedTo: item.assigned_to,
      dueDate: item.due_date,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    
    return { todos, error: null };
  } catch (err) {
    console.error('Error in getUserTodos:', err);
    return { 
      todos: [], 
      error: { 
        type: ErrorType.UNKNOWN, 
        message: 'Failed to fetch todos',
        originalError: err
      } 
    };
  }
}

// Get all todo items for a project
export async function getProjectTodos(projectId: string): Promise<{ todos: TodoItemAttributes[]; error: AppError | null; }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching project todos:', error);
      return { todos: [], error: handleSupabaseError(error) };
    }
    
    // Transform the data
    const todos = data.map(item => ({
      id: item.id,
      content: item.content,
      completed: item.completed || false,
      projectId: item.project_id,
      assignedTo: item.assigned_to,
      dueDate: item.due_date,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    
    return { todos, error: null };
  } catch (err) {
    console.error('Error in getProjectTodos:', err);
    return { 
      todos: [], 
      error: { 
        type: ErrorType.UNKNOWN, 
        message: 'Failed to fetch project todos',
        originalError: err
      } 
    };
  }
}

// Create a new todo item
export async function createTodo(
  todoData: Omit<TodoItemAttributes, 'id' | 'createdAt'>,
  userId: string
): Promise<{ todo: TodoItemAttributes | null; error: AppError | null; }> {
  try {
    console.log('[todo-service] Creating todo with userId:', userId);
    console.log('[todo-service] Todo data:', todoData);
    console.log('[todo-service] Network request about to be sent to Supabase');

    if (!userId) {
      return {
        todo: null,
        error: {
          type: ErrorType.VALIDATION,
          message: 'User ID is required to create a todo',
          originalError: new Error('Missing userId')
        }
      };
    }

    const newTodo = {
      id: uuidv4(),
      content: todoData.content,
      completed: todoData.completed || false,
      project_id: todoData.projectId,
      assigned_to: todoData.assignedTo,
      due_date: todoData.dueDate,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('[todo-service] Todo object to be sent:', newTodo);
    
    // Use adminSupabase client by default for todo creation to bypass RLS
    const { data, error } = await adminSupabase
      .from('todos')
      .insert([newTodo])
      .select()
      .single();
    
    console.log('[todo-service] Supabase response for todo creation:', { data, error });
    
    if (error) {
      console.error('[todo-service] Error creating todo:', error);
      return { todo: null, error: handleSupabaseError(error) };
    }
    
    // Transform the response
    const todo: TodoItemAttributes = {
      id: data.id,
      content: data.content,
      completed: data.completed || false,
      projectId: data.project_id,
      assignedTo: data.assigned_to,
      dueDate: data.due_date,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    console.log('[todo-service] Successfully created todo:', todo);
    
    return { todo, error: null };
  } catch (err) {
    console.error('[todo-service] Error in createTodo:', err);
    return { 
      todo: null, 
      error: { 
        type: ErrorType.UNKNOWN, 
        message: 'Failed to create todo',
        originalError: err
      } 
    };
  }
}

// Update a todo item
export async function updateTodo(todoId: string, todoData: Partial<TodoItemAttributes>): Promise<{ todo: TodoItemAttributes | null; error: AppError | null; }> {
  try {
    // Transform our camelCase to snake_case for Supabase
    const updateData = {
      content: todoData.content,
      completed: todoData.completed,
      project_id: todoData.projectId,
      assigned_to: todoData.assignedTo,
      due_date: todoData.dueDate,
      updated_at: new Date().toISOString()
    };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });
    
    const { data, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', todoId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating todo:', error);
      return { todo: null, error: handleSupabaseError(error) };
    }
    
    // Transform the response
    const todo: TodoItemAttributes = {
      id: data.id,
      content: data.content,
      completed: data.completed || false,
      projectId: data.project_id,
      assignedTo: data.assigned_to,
      dueDate: data.due_date,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return { todo, error: null };
  } catch (err) {
    console.error('Error in updateTodo:', err);
    return { 
      todo: null, 
      error: { 
        type: ErrorType.UNKNOWN, 
        message: 'Failed to update todo',
        originalError: err
      } 
    };
  }
}

// Delete a todo item
export async function deleteTodo(todoId: string): Promise<{ success: boolean; error: AppError | null; }> {
  try {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId);
    
    if (error) {
      console.error('Error deleting todo:', error);
      return { success: false, error: handleSupabaseError(error) };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('Error in deleteTodo:', err);
    return { 
      success: false, 
      error: { 
        type: ErrorType.UNKNOWN, 
        message: 'Failed to delete todo',
        originalError: err
      } 
    };
  }
}

// For demo/development purposes - create mock tasks
export function createMockTasks(userId: string): TodoItemAttributes[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  return [
    {
      id: uuidv4(),
      content: 'Review project proposal',
      completed: false,
      assignedTo: userId,
      createdBy: userId,
      dueDate: today.toISOString(),
      createdAt: new Date(today.getTime() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: uuidv4(),
      content: 'Prepare presentation slides',
      completed: true,
      assignedTo: userId,
      createdBy: userId,
      dueDate: today.toISOString(),
      createdAt: new Date(today.getTime() - 7200000).toISOString(), // 2 hours ago
    },
    {
      id: uuidv4(),
      content: 'Schedule team meeting',
      completed: false,
      assignedTo: userId,
      createdBy: userId,
      dueDate: tomorrow.toISOString(),
      createdAt: new Date(today.getTime() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: uuidv4(),
      content: 'Research market competitors',
      completed: false,
      assignedTo: userId,
      createdBy: userId,
      dueDate: nextWeek.toISOString(),
      createdAt: new Date(today.getTime() - 172800000).toISOString(), // 2 days ago
    },
    {
      id: uuidv4(),
      content: 'Draft quarterly report',
      completed: false,
      assignedTo: userId,
      createdBy: userId,
      projectId: 'project-1',
      dueDate: null,
      createdAt: new Date(today.getTime() - 259200000).toISOString(), // 3 days ago
    }
  ];
} 