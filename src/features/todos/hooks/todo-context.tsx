import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase, Project } from '../../../lib/supabase';
import { TodoItemAttributes } from '../lib/todo-service';
import { handleSupabaseError, AppError, ErrorType } from '../../../lib/error-handling';
import { useUser } from '../../../lib/user-context';
import { TodoItem } from '../../../types/todo';

type TodoContextType = {
  todos: TodoItemAttributes[];
  loading: boolean;
  error: AppError | null;
  userTodos: TodoItemAttributes[];
  projectTodos: Record<string, TodoItemAttributes[]>;
  selectedProject: string | null;
  setSelectedProject: (id: string | null) => void;
  filter: 'all' | 'completed' | 'incomplete' | 'overdue';
  setFilter: (filter: 'all' | 'completed' | 'incomplete' | 'overdue') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createTodo: (todo: Omit<TodoItemAttributes, 'id' | 'createdAt'>, userId: string) => Promise<TodoItemAttributes | null>;
  updateTodoAttributes: (id: string, data: Partial<TodoItemAttributes>) => Promise<TodoItemAttributes | null>;
  deleteTodoById: (id: string) => Promise<boolean>;
  refreshTodos: () => Promise<void>;
  projects?: Project[];
  addTodo: (todo: TodoItem) => Promise<void>;
  updateTodo: (todo: TodoItem) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
};

const TodoContext = createContext<TodoContextType | undefined>(undefined);

// Helper function to transform database todo objects to frontend format
export function mapDbTodoToFrontend(dbTodo: any): TodoItemAttributes {
  return {
    id: dbTodo.id,
    content: dbTodo.content,
    completed: dbTodo.completed || false,
    projectId: dbTodo.project_id,
    assignedTo: dbTodo.assigned_to,
    dueDate: dbTodo.due_date,
    createdBy: dbTodo.created_by,
    createdAt: dbTodo.created_at,
    updatedAt: dbTodo.updated_at
  };
}

export function TodoProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [todos, setTodos] = useState<TodoItemAttributes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'incomplete' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);

  // Derived state: user todos and project todos
  const userTodos = user?.id 
    ? todos.filter(todo => todo.assignedTo === user.id)
    : [];

  const projectTodos: Record<string, TodoItemAttributes[]> = todos.reduce((acc, todo) => {
    if (todo.projectId) {
      if (!acc[todo.projectId]) {
        acc[todo.projectId] = [];
      }
      acc[todo.projectId].push(todo);
    }
    return acc;
  }, {} as Record<string, TodoItemAttributes[]>);

  // Fetch todos function
  const fetchTodos = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // First, verify the user exists using the pattern from auth-service.ts
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (userError) {
        console.error('[todo-context] Error verifying user:', userError);
        throw handleSupabaseError(userError, ErrorType.DATA_FETCH);
      }
      
      if (!existingUser) {
        console.error('[todo-context] User not found with ID:', user.id);
        setError({
          type: ErrorType.DATA_FETCH,
          message: 'User not found',
          originalError: new Error('User not found')
        });
        setLoading(false);
        return;
      }
      
      // Now fetch the todos
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('created_by', user.id);
        
      if (error) {
        throw handleSupabaseError(error, ErrorType.DATA_FETCH);
      }
      
      setTodos(data.map(mapDbTodoToFrontend));
    } catch (err) {
      setError(err as AppError);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch projects function
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // First, verify the user exists using the pattern from auth-service.ts
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (userError) {
        console.error('[todo-context] Error verifying user:', userError);
        return; // Just return, no need to throw
      }
      
      if (!existingUser) {
        console.error('[todo-context] User not found with ID:', user.id);
        return; // Just return, no need to throw
      }
      
      // Now fetch the projects
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id);
        
      if (error) {
        throw handleSupabaseError(error, ErrorType.DATA_FETCH);
      }
      
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, [user?.id]);

  // Create a new todo
  const createTodo = async (todoData: Omit<TodoItemAttributes, 'id' | 'createdAt'>, userId: string): Promise<TodoItemAttributes | null> => {
    if (!user?.id) return null;
    
    console.log('[todo-context] Creating todo with context user.id:', user.id);
    console.log('[todo-context] Creating todo with provided userId:', userId);
    console.log('[todo-context] Todo data:', todoData);
    
    try {
      // First, look up the user directly using the working pattern from auth-service.ts
      // This approach is working in the login functionality
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (userError) {
        console.error('[todo-context] Error fetching user:', userError);
        return null;
      }
      
      if (!existingUser) {
        console.error('[todo-context] User not found with ID:', userId);
        return null;
      }
      
      console.log('[todo-context] Successfully verified user exists');
      
      const now = new Date().toISOString();
      
      // Insert with snake_case field names for database
      const { data, error } = await supabase
        .from('todos')
        .insert({
          content: todoData.content,
          completed: todoData.completed || false,
          project_id: todoData.projectId,
          assigned_to: todoData.assignedTo,
          due_date: todoData.dueDate,
          created_at: now,
          updated_at: now,
          created_by: userId
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating todo:', error);
        return null;
      }
      
      // Transform to frontend format
      const newTodo = mapDbTodoToFrontend(data);
      
      // Update local state
      setTodos(prev => [newTodo, ...prev]);
      
      return newTodo;
    } catch (err) {
      console.error('Error in createTodo:', err);
      return null;
    }
  };

  // Update a todo
  const updateTodoAttributes = async (todoId: string, todoData: Partial<TodoItemAttributes>): Promise<TodoItemAttributes | null> => {
    if (!user?.id) return null;
    
    try {
      // First, verify the user exists using the pattern from auth-service.ts
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (userError || !existingUser) {
        console.error('[todo-context] User verification failed:', userError || 'User not found');
        return null;
      }
      
      const updateData: Record<string, any> = {
        content: todoData.content,
        completed: todoData.completed,
        project_id: todoData.projectId,
        assigned_to: todoData.assignedTo,
        due_date: todoData.dueDate,
        updated_at: new Date().toISOString()
      };
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
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
        return null;
      }
      
      const updatedTodo = mapDbTodoToFrontend(data);
      setTodos(prev => prev.map(todo => 
        todo.id === todoId ? updatedTodo : todo
      ));
      
      return updatedTodo;
    } catch (err) {
      console.error('Error in updateTodo:', err);
      return null;
    }
  };

  // Delete a todo
  const deleteTodoById = async (todoId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      // First, verify the user exists using the pattern from auth-service.ts
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (userError || !existingUser) {
        console.error('[todo-context] User verification failed:', userError || 'User not found');
        return false;
      }
      
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId);
      
      if (error) {
        console.error('Error deleting todo:', error);
        return false;
      }
      
      // Update local state
      setTodos(prev => prev.filter(todo => todo.id !== todoId));
      
      return true;
    } catch (err) {
      console.error('Error in deleteTodo:', err);
      return false;
    }
  };

  // Setup useEffect to fetch both todos and projects
  useEffect(() => {
    if (user?.id) {
      // Add debounce for data fetching
      let isMounted = true;
      
      // Use a debounced fetch to avoid multiple rapid requests
      const timer = setTimeout(() => {
        if (!isMounted) return;
        
        fetchTodos();
        fetchProjects();
      }, 500);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [user?.id, fetchTodos, fetchProjects]);

  // Add a throttled refresh function
  const lastRefreshRef = useRef<number>(0);
  const refreshTodos = async () => {
    const now = Date.now();
    // Don't allow refreshes more often than every 2 seconds
    if (now - lastRefreshRef.current < 2000) {
      console.log('Throttling refresh request');
      return;
    }
    
    lastRefreshRef.current = now;
    await fetchTodos();
  };

  const addTodo = async (todo: TodoItem) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('todos')
        .insert([{
          ...todo,
          created_by: user.id
        }]);

      if (error) {
        throw handleSupabaseError(error, ErrorType.DATA_CREATE);
      }

      await fetchTodos();
    } catch (err) {
      setError(err as AppError);
    }
  };

  const updateTodo = async (todo: TodoItem) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          ...todo,
          updated_at: new Date().toISOString()
        })
        .eq('id', todo.id)
        .eq('created_by', user.id);

      if (error) {
        throw handleSupabaseError(error, ErrorType.DATA_UPDATE);
      }

      await fetchTodos();
    } catch (err) {
      setError(err as AppError);
    }
  };

  const deleteTodo = async (id: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id);

      if (error) {
        throw handleSupabaseError(error, ErrorType.DATA_DELETE);
      }

      await fetchTodos();
    } catch (err) {
      setError(err as AppError);
    }
  };

  return (
    <TodoContext.Provider
      value={{
        todos,
        loading,
        error,
        userTodos,
        projectTodos,
        selectedProject,
        setSelectedProject,
        filter,
        setFilter,
        searchQuery,
        setSearchQuery,
        createTodo,
        updateTodoAttributes,
        deleteTodoById,
        refreshTodos,
        projects,
        addTodo,
        updateTodo,
        deleteTodo
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

// Custom hook to use the todo context
export function useTodos() {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return context;
}

export function useTodoContext() {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodoContext must be used within a TodoProvider');
  }
  return context;
} 