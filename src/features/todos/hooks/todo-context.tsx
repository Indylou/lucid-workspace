import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase, Project } from '../../../lib/supabase';
import { TodoItemAttributes, getUserTodos, createTodo as apiCreateTodo, updateTodo as apiUpdateTodo, deleteTodo as apiDeleteTodo, toggleTodoCompletion, assignTodo } from '../lib/todo-service';
import { handleSupabaseError, AppError, ErrorType } from '../../../lib/error-handling';
import { useUser } from '../../../lib/user-context';
import { TodoItem } from '../../../types/todo';
import { getUserProjects } from '../../../lib/project-service';

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
  const [loading, setLoading] = useState(false);
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
      const { todos: fetchedTodos, error: todosError } = await getUserTodos(user.id);
      
      if (todosError) {
        setError(todosError);
        return;
      }
      
      setTodos(fetchedTodos);
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
      const { projects: userProjects, error: projectsError } = await getUserProjects(user.id);
      
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return;
      }
      
      setProjects(userProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, [user?.id]);

  // Create a new todo
  const createTodo = async (todoData: Omit<TodoItemAttributes, 'id' | 'createdAt'>, userId: string): Promise<TodoItemAttributes | null> => {
    if (!user?.id) return null;
    
    try {
      const { todo: newTodo, error: createError } = await apiCreateTodo(todoData, userId);
      
      if (createError || !newTodo) {
        console.error('Error creating todo:', createError);
        return null;
      }
      
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
      const { todo: updatedTodo, error: updateError } = await apiUpdateTodo(todoId, todoData);
      
      if (updateError || !updatedTodo) {
        console.error('Error updating todo:', updateError);
        return null;
      }
      
      // Update local state
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
  const deleteTodoById = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { success, error: deleteError } = await apiDeleteTodo(id);
      
      if (deleteError || !success) {
        console.error('Error deleting todo:', deleteError);
        return false;
      }
      
      // Update local state
      setTodos(prev => prev.filter(todo => todo.id !== id));
      
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

  // Refresh todos function
  const lastRefreshRef = useRef<number>(0);
  const refreshTodos = async (): Promise<void> => {
    const now = Date.now();
    // Don't allow refreshes more often than every 2 seconds
    if (now - lastRefreshRef.current < 2000) {
      console.log('Throttling refresh request');
      return;
    }
    
    lastRefreshRef.current = now;
    await fetchTodos();
  };

  // New todo CRUD operations
  const addTodo = async (todo: TodoItem) => {
    if (!user?.id) return;
    
    try {
      const todoData = {
        content: todo.content,
        completed: todo.completed || false,
        projectId: todo.projectId,
        assignedTo: todo.assignedTo,
        dueDate: todo.dueDate,
        createdBy: user.id
      };
      
      await createTodo(todoData, user.id);
    } catch (err) {
      setError(err as AppError);
    }
  };

  const updateTodo = async (todo: TodoItem) => {
    if (!user?.id) return;
    
    try {
      const todoData = {
        content: todo.content,
        completed: todo.completed,
        projectId: todo.projectId,
        assignedTo: todo.assignedTo,
        dueDate: todo.dueDate
      };
      
      await updateTodoAttributes(todo.id, todoData);
    } catch (err) {
      setError(err as AppError);
    }
  };

  const deleteTodo = async (id: string) => {
    if (!user?.id) return;
    
    try {
      await deleteTodoById(id);
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

// Hook to use the todo context
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