import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { PlusCircle, Search, Calendar, CheckCircle, CircleSlash, Clock } from 'lucide-react'
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

// Define local versions of the interfaces to avoid type conflicts
type Task = Omit<TodoItemAttributes, 'completed'> & { completed: boolean };

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
    
    // Apply search query
    if (searchQuery && !task.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
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
    projectId: string | null,
    assignedTo: string | null,
    dueDate: string | null
  }) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to create a task"
        });
        return;
      }

      console.log('[TasksModule] Creating task with user.id:', user.id);
      console.log('[TasksModule] Task data:', taskData);

      // Create the task in the database using the createTodo function
      const { todo: newTodo, error } = await createTodo({
        content: taskData.content,
        projectId: taskData.projectId,
        assignedTo: taskData.assignedTo,
        dueDate: taskData.dueDate,
        completed: false,
        createdBy: user.id
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage and track your tasks across all projects</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <CreateTaskDialog 
              projects={projects}
              users={users}
              onSubmit={handleCreateTask}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="mb-8 flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {projects.length > 0 && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="border rounded-md px-3 py-1 text-sm bg-background"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20 mx-auto" />
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-muted-foreground">Create a new task or adjust your filters</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)} 
                  variant="outline" 
                  className="mt-4"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create a task
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Group tasks by due date */}
              {Object.entries(tasksByDueDate).map(([group, groupTasks]) => (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-4">
                    {group === 'Overdue' && <CircleSlash className="h-5 w-5 text-red-500" />}
                    {group === 'Today' && <Clock className="h-5 w-5 text-orange-500" />}
                    {group === 'This Week' && <Calendar className="h-5 w-5 text-blue-500" />}
                    {group === 'Later' && <Calendar className="h-5 w-5 text-gray-500" />}
                    {group === 'No Due Date' && <Calendar className="h-5 w-5 text-muted-foreground" />}
                    <h2 className="text-xl font-semibold">{group}</h2>
                    <Badge variant="outline">{groupTasks.length}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {groupTasks.map(task => (
                      <TaskCard 
                        key={task.id}
                        task={task}
                        user={getUserById(task.assignedTo)}
                        project={getProjectById(task.projectId)}
                        onToggleComplete={handleToggleComplete}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// TaskCard component for displaying individual tasks
function TaskCard({ 
  task, 
  user, 
  project,
  onToggleComplete 
}: { 
  task: Task; 
  user?: User;
  project?: Project;
  onToggleComplete: (id: string, completed: boolean) => void;
}) {
  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox 
            id={`task-${task.id}`}
            checked={task.completed || false}
            onCheckedChange={() => onToggleComplete(task.id, !task.completed)}
            className="mt-1"
          />
          
          <div className="flex-1">
            <div className={`text-base font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
              {task.content}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              {project && (
                <Badge variant="outline" className="text-xs">
                  {project.name}
                </Badge>
              )}
              
              {task.dueDate && (
                <div className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center ${
                  isAfter(new Date(), new Date(task.dueDate))
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                }`}>
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(task.dueDate), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
          
          {user && (
            <Avatar className="h-6 w-6">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.name} />
              ) : (
                <AvatarFallback>
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// CreateTaskDialog component
function CreateTaskDialog({ 
  projects, 
  users, 
  onSubmit, 
  onCancel 
}: { 
  projects: Project[];
  users: User[];
  onSubmit: (task: { content: string; projectId: string | null; assignedTo: string | null; dueDate: string | null }) => void;
  onCancel: () => void;
}) {
  const { user: currentUser } = useAuth()
  const [content, setContent] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [assignedTo, setAssignedTo] = useState<string | null>(currentUser?.id || null)
  const [dueDate, setDueDate] = useState<string | null>(null)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      content,
      projectId,
      assignedTo,
      dueDate
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>
          Add a new task to your projects or personal to-do list.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="task-content">Task Description</Label>
          <Input
            id="task-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What needs to be done?"
            className="col-span-3"
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="project">Project</Label>
          <select
            id="project"
            className="rounded-md border border-input h-10 px-3 py-2 bg-background text-sm"
            value={projectId || ''}
            onChange={(e) => setProjectId(e.target.value || null)}
          >
            <option value="">None (Personal Task)</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="assigned-to">Assigned To</Label>
          <select
            id="assigned-to"
            className="rounded-md border border-input h-10 px-3 py-2 bg-background text-sm"
            value={assignedTo || ''}
            onChange={(e) => setAssignedTo(e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {users.map(user => (
              <option 
                key={user.id} 
                value={user.id}
              >
                {user.name} {user.id === currentUser?.id ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="due-date">Due Date (Optional)</Label>
          <Input
            id="due-date"
            type="date"
            value={dueDate || ''}
            onChange={(e) => setDueDate(e.target.value || null)}
            className="col-span-3"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!content}>
          Create Task
        </Button>
      </DialogFooter>
    </form>
  )
} 