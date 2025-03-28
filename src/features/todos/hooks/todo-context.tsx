import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase, Project } from '../../../lib/supabase';
import { getUserTodos, createTodo as apiCreateTodo, updateTodo as apiUpdateTodo, deleteTodo as apiDeleteTodo, toggleTodoCompletion, assignTodo } from '../lib/todo-service';
import { handleSupabaseError, AppError, ErrorType } from '../../../lib/error-handling';
import { useUser } from '../../../lib/user-context';
import { TodoItem } from '../../../types/todo';
import { getUserProjects } from '../../../lib/project-service';

type TodoContextType = {
  todos: TodoItem[];
  loading: boolean;
  error: AppError | null;
  userTodos: TodoItem[];
  projectTodos: Record<string, TodoItem[]>;
  selectedProject: string | null;
  setSelectedProject: (id: string | null) => void;
  filter: 'all' | 'completed' | 'incomplete' | 'overdue';
  setFilter: (filter: 'all' | 'completed' | 'incomplete' | 'overdue') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTodo: (id: string, updates: Partial<TodoItem>) => Promise<void>;
  deleteTodoById: (id: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
  projects?: Project[];
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleComplete: (id: string, completed: boolean) => Promise<void>;
  assignToUser: (id: string, userId: string | null) => Promise<void>;
};

const TodoContext = createContext<TodoContextType | undefined>(undefined);

// Helper function to transform database todo objects to frontend format
export function mapDbTodoToFrontend(dbTodo: any): TodoItem {
  return {
    id: dbTodo.id,
    content: dbTodo.content,
    description: dbTodo.description || null,
    completed: dbTodo.completed || false,
    status: dbTodo.status || 'todo',
    priority: dbTodo.priority || 'medium',
    tags: dbTodo.tags || [],
    projectId: dbTodo.project_id,
    assignedTo: dbTodo.assigned_to,
    dueDate: dbTodo.due_date,
    createdAt: dbTodo.created_at,
    updatedAt: dbTodo.updated_at,
    commentsCount: dbTodo.comments_count || 0
  };
}

export function TodoProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [todos, setTodos] = useState<TodoItem[]>([]);
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

  const projectTodos: Record<string, TodoItem[]> = todos.reduce((acc, todo) => {
    if (todo.projectId) {
      if (!acc[todo.projectId]) {
        acc[todo.projectId] = [];
      }
      acc[todo.projectId].push(todo);
    }
    return acc;
  }, {} as Record<string, TodoItem[]>);

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
  const createTodo = async (todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const todoWithDefaults = {
        ...todoData,
        commentsCount: 0
      };
      
      const { todo: newTodo, error: createError } = await apiCreateTodo(todoWithDefaults, user.id);
      
      if (createError || !newTodo) {
        console.error('Error creating todo:', createError);
        return;
      }
      
      // Update local state
      setTodos(prev => [newTodo, ...prev]);
    } catch (err) {
      console.error('Error in createTodo:', err);
    }
  };

  // Update a todo
  const updateTodo = async (id: string, updates: Partial<TodoItem>): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const { todo: updatedTodo, error: updateError } = await apiUpdateTodo(id, updates);
      
      if (updateError || !updatedTodo) {
        console.error('Error updating todo:', updateError);
        return;
      }
      
      // Update local state
      setTodos(prev => prev.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
    } catch (err) {
      console.error('Error in updateTodo:', err);
    }
  };

  // Delete a todo
  const deleteTodoById = async (id: string): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const { success, error: deleteError } = await apiDeleteTodo(id);
      
      if (deleteError || !success) {
        console.error('Error deleting todo:', deleteError);
        return;
      }
      
      // Update local state
      setTodos(prev => prev.filter(todo => todo.id !== id));
    } catch (err) {
      console.error('Error in deleteTodo:', err);
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

  // Toggle todo completion
  const toggleComplete = async (id: string, completed: boolean): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const { todo: updatedTodo, error: toggleError } = await toggleTodoCompletion(id, completed);
      
      if (toggleError || !updatedTodo) {
        console.error('Error toggling todo completion:', toggleError);
        return;
      }
      
      // Update local state
      setTodos(prev => prev.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
    } catch (err) {
      console.error('Error in toggleComplete:', err);
    }
  };

  // Assign todo to user
  const assignToUser = async (id: string, userId: string | null): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const { todo: updatedTodo, error: assignError } = await assignTodo(id, userId);
      
      if (assignError || !updatedTodo) {
        console.error('Error assigning todo:', assignError);
        return;
      }
      
      // Update local state
      setTodos(prev => prev.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
    } catch (err) {
      console.error('Error in assignToUser:', err);
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
        updateTodo,
        deleteTodoById,
        refreshTodos,
        projects,
        addTodo: createTodo,
        deleteTodo: deleteTodoById,
        toggleComplete,
        assignToUser
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