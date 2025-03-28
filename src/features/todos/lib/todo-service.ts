import { supabase } from '../../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { handleSupabaseError, AppError, ErrorType } from '../../../lib/error-handling';
import { TodoItem } from '../../../types/todo';

// Types for Todo Items
export interface TodoItemAttributes {
  id: string;
  content: string;
  description?: string | null;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high' | null;
  status?: 'todo' | 'in-progress' | 'review' | 'done' | null;
  tags?: string[] | null;
  projectId?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  commentsCount?: number | null;
}

// Helper function to map database fields to frontend fields
function mapDbTodoToFrontend(dbTodo: any): TodoItemAttributes {
  return {
    id: dbTodo.id,
    content: dbTodo.content,
    description: dbTodo.description || "",
    completed: dbTodo.completed || false,
    status: dbTodo.status || 'todo',
    priority: dbTodo.priority || 'medium',
    tags: dbTodo.tags || [],
    projectId: dbTodo.project_id,
    assignedTo: dbTodo.assigned_to,
    dueDate: dbTodo.due_date,
    createdAt: dbTodo.created_at,
    updatedAt: dbTodo.updated_at,
    commentsCount: dbTodo.comments_count
  };
}

// Helper function to map frontend fields to database fields
function mapFrontendTodoToDb(todo: Partial<TodoItemAttributes>): any {
  const dbTodo: any = {};
  
  if (todo.content !== undefined) dbTodo.content = todo.content;
  if (todo.description !== undefined) dbTodo.description = todo.description;
  if (todo.completed !== undefined) dbTodo.completed = todo.completed;
  if (todo.status !== undefined) dbTodo.status = todo.status;
  if (todo.priority !== undefined) dbTodo.priority = todo.priority;
  if (todo.tags !== undefined) dbTodo.tags = todo.tags;
  if (todo.projectId !== undefined) dbTodo.project_id = todo.projectId;
  if (todo.assignedTo !== undefined) dbTodo.assigned_to = todo.assignedTo;
  if (todo.dueDate !== undefined) dbTodo.due_date = todo.dueDate;
  
  return dbTodo;
}

// Get todos for user
export async function getUserTodos(userId: string): Promise<{ todos: TodoItemAttributes[], error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { todos: [], error: handleSupabaseError(error) };
    }
    
    const todos = data.map(mapDbTodoToFrontend);
    return { todos, error: null };
  } catch (err) {
    return { 
      todos: [], 
      error: { 
        type: ErrorType.DATA_FETCH, 
        message: 'Failed to fetch todos', 
        originalError: err as Error 
      } 
    };
  }
}

// Get todos by project
export async function getProjectTodos(projectId: string): Promise<{ todos: TodoItemAttributes[], error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { todos: [], error: handleSupabaseError(error) };
    }
    
    const todos = data.map(mapDbTodoToFrontend);
    return { todos, error: null };
  } catch (err) {
    return { 
      todos: [], 
      error: { 
        type: ErrorType.DATA_FETCH, 
        message: 'Failed to fetch project todos', 
        originalError: err as Error 
      } 
    };
  }
}

// Get a specific todo
export async function getTodoById(todoId: string): Promise<{ todo: TodoItemAttributes | null, error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('id', todoId)
      .single();
      
    if (error) {
      return { todo: null, error: handleSupabaseError(error) };
    }
    
    return { todo: mapDbTodoToFrontend(data), error: null };
  } catch (err) {
    return { 
      todo: null, 
      error: { 
        type: ErrorType.DATA_FETCH, 
        message: 'Failed to fetch todo', 
        originalError: err as Error 
      } 
    };
  }
}

// Create a new todo item
export async function createTodo(
  todoData: Omit<TodoItemAttributes, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<{ todo: TodoItemAttributes | null; error: AppError | null; }> {
  try {
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

    // Prepare the todo data in database format
    const dbTodo = {
      content: todoData.content,
      description: todoData.description || "",
      completed: todoData.completed || false,
      status: todoData.status || 'todo',
      priority: todoData.priority || 'medium',
      tags: todoData.tags || [],
      project_id: todoData.projectId,
      assigned_to: todoData.assignedTo,
      due_date: todoData.dueDate,
      created_by: userId
    };
    
    // Insert the todo
    const { data, error } = await supabase
      .from('todos')
      .insert(dbTodo)
      .select()
      .single();
      
    if (error) {
      return { todo: null, error: handleSupabaseError(error) };
    }
    
    return { todo: mapDbTodoToFrontend(data), error: null };
  } catch (err) {
    return { 
      todo: null, 
      error: { 
        type: ErrorType.DATA_CREATE, 
        message: 'Failed to create todo', 
        originalError: err as Error 
      } 
    };
  }
}

// Update a todo
export async function updateTodo(
  todoId: string,
  todoData: Partial<TodoItemAttributes>
): Promise<{ todo: TodoItemAttributes | null; error: AppError | null; }> {
  try {
    // Convert frontend fields to database fields
    const dbTodo = mapFrontendTodoToDb(todoData);
    
    // Add updated_at timestamp
    dbTodo.updated_at = new Date().toISOString();
    
    // Update the todo
    const { data, error } = await supabase
      .from('todos')
      .update(dbTodo)
      .eq('id', todoId)
      .select()
      .single();
      
    if (error) {
      return { todo: null, error: handleSupabaseError(error) };
    }
    
    return { todo: mapDbTodoToFrontend(data), error: null };
  } catch (err) {
    return { 
      todo: null, 
      error: { 
        type: ErrorType.DATA_UPDATE, 
        message: 'Failed to update todo', 
        originalError: err as Error 
      } 
    };
  }
}

// Delete a todo
export async function deleteTodo(
  todoId: string
): Promise<{ success: boolean; error: AppError | null; }> {
  try {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId);
      
    if (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
    
    return { success: true, error: null };
  } catch (err) {
    return { 
      success: false, 
      error: { 
        type: ErrorType.DATA_DELETE, 
        message: 'Failed to delete todo', 
        originalError: err as Error 
      } 
    };
  }
}

// Toggle completion status
export async function toggleTodoCompletion(
  todoId: string,
  currentStatus: boolean
): Promise<{ todo: TodoItemAttributes | null; error: AppError | null; }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .update({ 
        completed: !currentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', todoId)
      .select()
      .single();
      
    if (error) {
      return { todo: null, error: handleSupabaseError(error) };
    }
    
    return { todo: mapDbTodoToFrontend(data), error: null };
  } catch (err) {
    return { 
      todo: null, 
      error: { 
        type: ErrorType.DATA_UPDATE, 
        message: 'Failed to toggle todo completion', 
        originalError: err as Error 
      } 
    };
  }
}

// Assign todo to user
export async function assignTodo(
  todoId: string,
  userId: string | null
): Promise<{ todo: TodoItemAttributes | null; error: AppError | null; }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .update({ 
        assigned_to: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', todoId)
      .select()
      .single();
      
    if (error) {
      return { todo: null, error: handleSupabaseError(error) };
    }
    
    return { todo: mapDbTodoToFrontend(data), error: null };
  } catch (err) {
    return { 
      todo: null, 
      error: { 
        type: ErrorType.DATA_UPDATE, 
        message: 'Failed to assign todo', 
        originalError: err as Error 
      } 
    };
  }
}

// For demo/development purposes - create mock tasks
export function createMockTasks(userId: string): TodoItemAttributes[] {
  const now = new Date().toISOString();
  const mockTasks: TodoItemAttributes[] = [
    {
      id: uuidv4(),
      content: "Review project proposal",
      description: "Go through the latest project proposal and provide feedback",
      completed: false,
      status: "todo",
      priority: "high",
      tags: ["review", "project"],
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      assignedTo: userId,
      projectId: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      content: "Update documentation",
      description: "Update the API documentation with recent changes",
      completed: false,
      status: "in-progress",
      priority: "medium",
      tags: ["docs", "api"],
      dueDate: new Date(Date.now() + 172800000).toISOString(),
      assignedTo: userId,
      projectId: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      content: "Fix bug in login flow",
      description: "Investigate and fix the reported login issue",
      completed: false,
      status: "review",
      priority: "high",
      tags: ["bug", "auth"],
      dueDate: new Date(Date.now() + 259200000).toISOString(),
      assignedTo: userId,
      projectId: null,
      createdAt: now,
      updatedAt: now
    }
  ];

  return mockTasks;
} 