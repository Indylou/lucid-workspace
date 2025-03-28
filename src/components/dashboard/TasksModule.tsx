import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { PlusCircle, Search, Calendar, CheckCircle, CircleSlash, Clock, FileText, MessageSquare } from 'lucide-react'
import { format, isAfter, isBefore, endOfDay } from 'date-fns'
import { toast } from '../ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { Label } from "../ui/label"
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '../../App'
import { supabase, User, Project, adminSupabase } from '../../lib/supabase'
import {
  TodoItemAttributes,
  getUserTodos,
  updateTodo,
  createTodo
} from '../../features/todos/lib'
import { cn } from '../../lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

// Define local versions of the interfaces to avoid type conflicts
type Task = Omit<TodoItemAttributes, 'completed'> & { 
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'review' | 'done';
  tags?: string[];
  description?: string;
  commentsCount?: number;
};

export function TasksModule() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'incomplete' | 'overdue'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch all tasks and projects
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Fetch personal and assigned tasks from Supabase
        const { todos: userTodos, error: userError } = await getUserTodos(user.id);
        
        if (userError) {
          throw new Error(userError.message);
        }
        
        // Ensure completed is always a boolean
        const tasksWithBooleanCompleted = userTodos.map(task => ({
          ...task,
          completed: task.completed === undefined ? false : task.completed
        })) as Task[];
        setTasks(tasksWithBooleanCompleted);
        
        // Fetch projects from Supabase
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*');
          
        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
        } else {
          setProjects(projectsData || []);
        }
        
        // Fetch users from Supabase
        const { data: usersData, error: usersError } = await adminSupabase
          .from('users')
          .select('*');
          
        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          setUsers(usersData || []);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'Error fetching tasks',
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTasks();
    
    // Refresh tasks every 30 seconds
    const intervalId = setInterval(fetchTasks, 30000);
    
    return () => clearInterval(intervalId);
  }, [user]);
  
  // Function to handle toggling task completion
  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      // Optimistically update the UI
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, completed } : task
        )
      );
      
      // Update in the database
      const result = await updateTodo(taskId, { completed });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      toast({
        title: completed ? 'Task completed' : 'Task reopened',
        description: `Task has been marked as ${completed ? 'complete' : 'incomplete'}.`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      
      // Revert the optimistic update
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, completed: !completed } : task
        )
      );
      
      toast({
        title: 'Error updating task',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  };

  // Function to get priority badge color
  const getPriorityColor = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'low':
        return 'bg-green-500/10 text-green-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  // Function to get status badge color
  const getStatusColor = (status: string = 'todo') => {
    switch (status) {
      case 'done':
        return 'bg-green-500/10 text-green-500';
      case 'in-progress':
        return 'bg-blue-500/10 text-blue-500';
      case 'review':
        return 'bg-purple-500/10 text-purple-500';
      case 'todo':
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  // Filter tasks based on current filters and search query
  const filteredTasks = tasks.filter(task => {
    // Filter by project if selected
    if (projectFilter !== 'all' && task.projectId !== projectFilter) {
      return false;
    }
    
    // Apply status filter
    if (filter === 'completed' && !task.completed) {
      return false;
    }
    
    if (filter === 'incomplete' && task.completed) {
      return false;
    }
    
    if (filter === 'overdue' && (!task.dueDate || !isAfter(new Date(), new Date(task.dueDate)) || task.completed)) {
      return false;
    }
    
    // Apply search query to content and description
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesContent = task.content.toLowerCase().includes(searchLower);
      const matchesDescription = task.description?.toLowerCase().includes(searchLower);
      const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      
      if (!matchesContent && !matchesDescription && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });
  
  // Group tasks by due date for better organization
  const tasksByDueDate = filteredTasks.reduce<Record<string, Task[]>>((groups, task) => {
    let group = 'No Due Date';
    
    if (task.dueDate) {
      const today = new Date();
      const dueDate = new Date(task.dueDate);
      const todayEnd = endOfDay(today);
      
      // Check if task is overdue
      if (isAfter(today, dueDate) && !task.completed) {
        group = 'Overdue';
      } 
      // Check if due today
      else if (isBefore(dueDate, todayEnd)) {
        group = 'Today';
      } 
      // Check if due this week (next 7 days)
      else if (isBefore(dueDate, new Date(today.setDate(today.getDate() + 7)))) {
        group = 'This Week';
      } 
      // Due later
      else {
        group = 'Later';
      }
    }
    
    if (!groups[group]) {
      groups[group] = [];
    }
    
    groups[group].push(task);
    return groups;
  }, {});

  // Find user by ID
  const getUserById = (userId: string | null | undefined): User | undefined => {
    if (!userId) return undefined;
    return users.find(u => u.id === userId);
  }

  // Find project by ID
  const getProjectById = (projectId: string | null | undefined): Project | undefined => {
    if (!projectId) return undefined;
    return projects.find(p => p.id === projectId);
  }

  // Function to handle creating a new task
  const handleCreateTask = async (taskData: {
    content: string,
    description?: string,
    projectId: string | null,
    assignedTo: string | null,
    dueDate: string | null,
    priority?: 'low' | 'medium' | 'high',
    status?: 'todo' | 'in-progress' | 'review' | 'done',
    tags?: string[]
  }) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to create a task"
        });
        return;
      }

      // Create the task in the database using the createTodo function
      const { todo: newTodo, error } = await createTodo({
        content: taskData.content,
        description: taskData.description,
        projectId: taskData.projectId,
        assignedTo: taskData.assignedTo,
        dueDate: taskData.dueDate,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'todo',
        tags: taskData.tags || [],
        completed: false
      }, user.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!newTodo) {
        throw new Error('Failed to create task');
      }
      
      // Add to local state
      setTasks(prevTasks => [newTodo as Task, ...prevTasks]);
      
      toast({
        title: 'Task created',
        description: 'New task has been created successfully'
      });
      
      // Close dialog
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.'
      });
    }
  };
  
  // TEMPORARY: RLS Debugging function - DELETE AFTER DEBUGGING
  const testRLS = async () => {
    try {
      console.log('=== Starting RLS Test ===');
      
      // 1. Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        role: session?.user?.role
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }

      // 2. Test read operation
      const { data: readData, error: readError } = await supabase
        .from('todos')
        .select('*')
        .limit(1);

      if (readError) {
        console.error('Read operation error:', {
          message: readError.message,
          details: readError.details,
          hint: readError.hint
        });
      } else {
        console.log('Read operation successful:', readData);
      }

      // 3. Test write operation
      const { data: writeData, error: writeError } = await supabase
        .from('todos')
        .insert({ 
          content: 'RLS Test Todo', 
          completed: false,
          created_by: session?.user?.id 
        })
        .select()
        .single();

      if (writeError) {
        console.error('Write operation error:', {
          message: writeError.message,
          details: writeError.details,
          hint: writeError.hint
        });
      } else {
        console.log('Write operation successful:', writeData);
      }

      console.log('=== RLS Test Complete ===');
    } catch (error) {
      console.error('RLS Test error:', error);
    }
  };

  // Add test button to UI - DELETE AFTER DEBUGGING
  useEffect(() => {
    // Add test button to the DOM
    const testButton = document.createElement('button');
    testButton.textContent = 'Test RLS';
    testButton.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded';
    testButton.onclick = () => testRLS();
    document.body.appendChild(testButton);

    // Cleanup
    return () => {
      document.body.removeChild(testButton);
    };
  }, []);

  const handleCreateTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const content = formData.get('content') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as 'low' | 'medium' | 'high';
    const status = formData.get('status') as 'todo' | 'in-progress' | 'review' | 'done';
    const tags = (formData.get('tags') as string || '')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    const assignedTo = formData.get('assignedTo') as string;
    const projectId = formData.get('projectId') as string;
    const dueDate = formData.get('dueDate') as string;

    await handleCreateTask({
      content,
      description,
      priority,
      status,
      tags,
      assignedTo: assignedTo || null,
      projectId: projectId || null,
      dueDate: dueDate || null
    });
  };

  // Function to handle toggling task completion
  const handleToggleTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedTask = await updateTodo(taskId, {
        completed: !task.completed
      });

      if (updatedTask) {
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          )
        );
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search and filters */}
      <div className="flex items-center gap-4 p-4 border-b">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <TabsList className="bg-muted">
          <TabsTrigger value="all" onClick={() => setFilter('all')}>All</TabsTrigger>
          <TabsTrigger value="completed" onClick={() => setFilter('completed')}>Completed</TabsTrigger>
          <TabsTrigger value="incomplete" onClick={() => setFilter('incomplete')}>Incomplete</TabsTrigger>
          <TabsTrigger value="overdue" onClick={() => setFilter('overdue')}>Overdue</TabsTrigger>
        </TabsList>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(tasksByDueDate).map(([group, tasks]) => (
              <div key={group}>
                <h3 className="font-semibold mb-4">{group}</h3>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <Card key={task.id} className={cn("transition-colors", task.completed && "bg-muted")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => handleToggleTask(task.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-sm font-medium", task.completed && "line-through text-muted-foreground")}>
                                {task.content}
                              </span>
                              {task.priority && (
                                <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                              )}
                              {task.status && (
                                <Badge variant="secondary" className={getStatusColor(task.status)}>
                                  {task.status}
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {task.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                                </div>
                              )}
                              {task.assignedTo && getUserById(task.assignedTo) && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={getUserById(task.assignedTo)?.avatar_url || ''} />
                                    <AvatarFallback>{getUserById(task.assignedTo)?.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <span>{getUserById(task.assignedTo)?.name}</span>
                                </div>
                              )}
                              {task.projectId && getProjectById(task.projectId) && (
                                <div className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  <span>{getProjectById(task.projectId)?.name}</span>
                                </div>
                              )}
                              {task.commentsCount !== undefined && task.commentsCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>{task.commentsCount}</span>
                                </div>
                              )}
                            </div>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                {task.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="bg-primary/10 text-primary">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create task dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to your list</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTaskSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="content">Task Title</Label>
                <Input id="content" name="content" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority">
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status">
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" name="tags" placeholder="feature, bug, design" />
              </div>
              <div>
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select name="assignedTo">
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="projectId">Project</Label>
                <Select name="projectId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input type="date" id="dueDate" name="dueDate" />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 