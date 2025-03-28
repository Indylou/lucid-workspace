import { supabase } from '../../../lib/supabase';
import { handleSupabaseError, AppError, ErrorType } from '../../../lib/error-handling';
import { v4 as uuidv4 } from 'uuid';
import { TodoItem } from '../../../types/todo';

// Helper function to map database todo to frontend todo
export function mapDbTodoToFrontend(dbTodo: any): TodoItem {
  return {
    id: dbTodo.id,
    content: dbTodo.content,
    description: dbTodo.description || null,
    completed: dbTodo.completed || false,
    status: dbTodo.status || null,
    priority: dbTodo.priority || null,
    tags: dbTodo.tags || null,
    projectId: dbTodo.project_id || null,
    assignedTo: dbTodo.assigned_to || null,
    dueDate: dbTodo.due_date || null,
    createdAt: dbTodo.created_at,
    updatedAt: dbTodo.updated_at,
    commentsCount: dbTodo.comments_count || null
  };
}

// Helper function to map frontend todo to database format
export function mapFrontendTodoToDb(todo: Partial<TodoItem>) {
  return {
    content: todo.content,
    description: todo.description,
    completed: todo.completed,
    status: todo.status,
    priority: todo.priority,
    tags: todo.tags,
    project_id: todo.projectId,
    assigned_to: todo.assignedTo,
    due_date: todo.dueDate,
    comments_count: todo.commentsCount,
    updated_at: new Date().toISOString()
  };
}

// Get todos for a user
export async function getUserTodos(userId: string): Promise<{ todos: TodoItem[]; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching todos:', error);
      return { todos: [], error: handleSupabaseError(error) };
    }

    const todos = data.map(mapDbTodoToFrontend);
    return { todos, error: null };
  } catch (err) {
    console.error('Error in getUserTodos:', err);
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
export async function getProjectTodos(projectId: string): Promise<{ todos: TodoItem[]; error: AppError | null }> {
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
export async function getTodoById(todoId: string): Promise<{ todo: TodoItem | null; error: AppError | null }> {
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

// Create a new todo
export async function createTodo(
  todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<{ todo: TodoItem | null; error: AppError | null }> {
  try {
    const now = new Date().toISOString();
    const dbTodo = {
      ...mapFrontendTodoToDb(todoData),
      created_by: userId,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('todos')
      .insert(dbTodo)
      .select()
      .single();

    if (error) {
      console.error('Error creating todo:', error);
      return { todo: null, error: handleSupabaseError(error) };
    }

    return { todo: mapDbTodoToFrontend(data), error: null };
  } catch (err) {
    console.error('Error in createTodo:', err);
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
  id: string,
  updates: Partial<TodoItem>
): Promise<{ todo: TodoItem | null; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .update(mapFrontendTodoToDb(updates))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating todo:', error);
      return { todo: null, error: handleSupabaseError(error) };
    }

    return { todo: mapDbTodoToFrontend(data), error: null };
  } catch (err) {
    console.error('Error in updateTodo:', err);
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
export async function deleteTodo(id: string): Promise<{ success: boolean; error: AppError | null }> {
  try {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

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
        type: ErrorType.DATA_DELETE,
        message: 'Failed to delete todo',
        originalError: err as Error
      }
    };
  }
}

// Toggle todo completion
export async function toggleTodoCompletion(
  id: string,
  completed: boolean
): Promise<{ todo: TodoItem | null; error: AppError | null }> {
  return updateTodo(id, { completed });
}

// Assign todo to user
export async function assignTodo(
  id: string,
  userId: string | null
): Promise<{ todo: TodoItem | null; error: AppError | null }> {
  return updateTodo(id, { assignedTo: userId });
}

// Get mock todos for testing
export function getMockTodos(userId: string): TodoItem[] {
  const now = new Date().toISOString();
  return [
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
      updatedAt: now,
      commentsCount: 0
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
      updatedAt: now,
      commentsCount: 0
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
      updatedAt: now,
      commentsCount: 0
    }
  ];
} 