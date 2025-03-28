import React, { useState, useEffect } from 'react'
import { useTodos } from '../features/todos/hooks'
import { supabase, User, Project, adminSupabase } from '../lib/supabase'
import { useUser } from '../lib/user-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Search, Filter, PlusCircle, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { isPast, isToday } from 'date-fns'
import { toast } from '../components/ui/use-toast'
import { ProjectDialog } from '../components/ProjectDialog'
import { getUserProjects } from '../lib/project-service'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { EnhancedTodoItem } from '../features/todos/components'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ScrollArea } from '../components/ui/scroll-area'
import { TodoItem } from '../types/todo'

// Extend User type to match our TaskUser structure
interface TaskUser extends Omit<User, 'updated_at'> {
  updated_at?: string;
}

export default function TasksPage() {
  const { user } = useUser()
  const { 
    todos, 
    loading, 
    filter, 
    setFilter, 
    searchQuery, 
    setSearchQuery,
    createTodo,
    selectedProject, 
    setSelectedProject,
    refreshTodos,
    updateTodo,
    deleteTodo
  } = useTodos()
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<TaskUser[]>([])
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [userFilter, setUserFilter] = useState<string | null>(null)

  // Fetch projects and users
  useEffect(() => {
    const fetchProjectsAndUsers = async () => {
      try {
        // Fetch projects
        const { projects: projectsData, error: projectsError } = await getUserProjects()
        
        if (projectsError) {
          console.error('Error fetching projects:', projectsError)
          toast({
            title: 'Error',
            description: 'Failed to load projects'
          })
          return
        }
        
        setProjects(projectsData || [])
        
        // Fetch users
        const { data: usersData, error: usersError } = await adminSupabase
          .from('users')
          .select('id, name, email, avatar_url, created_at')
        
        if (usersError) {
          console.error('Error fetching users:', usersError)
        } else {
          setUsers(usersData || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    
    fetchProjectsAndUsers()
  }, [])

  // Filter and sort todos
  const getFilteredTodos = () => {
    // First apply the user filter
    let filteredTodos = userFilter
      ? todos.filter(todo => todo.assignedTo === userFilter)
      : todos

    // Then apply the project filter
    if (selectedProject) {
      filteredTodos = filteredTodos.filter(todo => todo.projectId === selectedProject)
    }
    
    // Then apply the status filter
    switch (filter) {
      case 'completed':
        filteredTodos = filteredTodos.filter(todo => todo.completed)
        break
      case 'incomplete':
        filteredTodos = filteredTodos.filter(todo => !todo.completed)
        break
      case 'overdue':
        filteredTodos = filteredTodos.filter(todo => {
          if (!todo.dueDate || todo.completed) return false
          const dueDate = new Date(todo.dueDate)
          return isPast(dueDate) && !isToday(dueDate)
        })
        break
      default:
        // 'all' - no filtering needed
        break
    }
    
    // Finally, apply search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredTodos = filteredTodos.filter(todo => 
        todo.content.toLowerCase().includes(query)
      )
    }
    
    // Sort: completed at the bottom, then by due date (closest first), then by creation date (newest first)
    return filteredTodos.sort((a, b) => {
      // Completed items go to the bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      
      // Sort by due date (if both have due dates)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      
      // Items with due dates come before those without
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      
      // Finally sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  const filteredTodos = getFilteredTodos()
  
  // Get counts for filters
  const filterCounts = {
    all: todos.length,
    completed: todos.filter(todo => todo.completed).length,
    incomplete: todos.filter(todo => !todo.completed).length,
    overdue: todos.filter(todo => {
      if (!todo.dueDate || todo.completed) return false
      const dueDate = new Date(todo.dueDate)
      return isPast(dueDate) && !isToday(dueDate)
    }).length
  }

  // Handler for project creation success
  const handleProjectSuccess = (newProject: Project) => {
    setProjects(prev => [...prev, newProject])
    setSelectedProject(newProject.id)
    toast({
      title: 'Project created',
      description: `${newProject.name} has been created successfully`,
    })
  }

  // Handler for task creation
  const handleCreateTask = async (taskData: {
    content: string,
    projectId: string | null,
    assignedTo: string | null,
    dueDate: string | null
  }) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create tasks'
      });
      return;
    }

    try {
      // Create a new task
      const newTodo = await createTodo({
        content: taskData.content,
        completed: false,
        projectId: taskData.projectId,
        assignedTo: taskData.assignedTo,
        dueDate: taskData.dueDate,
        createdBy: user.id
      }, user.id);
      
      if (newTodo) {
        setShowTaskDialog(false);
        toast({
          title: 'Task created',
          description: 'New task has been successfully created'
        });
        
        // If the user applied filters that would hide this todo, switch to all filter
        if (filter !== 'all' || (selectedProject && selectedProject !== taskData.projectId)) {
          setFilter('all');
          if (taskData.projectId) {
            setSelectedProject(taskData.projectId);
          }
        }
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error creating task',
        description: 'Failed to create the task'
      });
    }
  }

  // Function to find the project name by ID
  const getProjectNameById = (projectId: string | undefined | null) => {
    if (!projectId) return null
    const project = projects.find(p => p.id === projectId)
    return project?.name || null
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-medium">Tasks</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowProjectDialog(true)}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              New Project
            </Button>
            <Button 
              onClick={() => setShowTaskDialog(true)}
              size="sm"
              className="h-8"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] h-full gap-3">
          {/* Filters Card */}
          <Card className="h-auto md:h-full bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-2">
              {/* Status Filter */}
              <div className="space-y-1">
                <div className="grid grid-cols-1 gap-0.5">
                  <Button
                    variant={filter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="justify-start h-7 px-2 text-xs font-normal"
                  >
                    <Filter className="mr-2 h-3 w-3" />
                    All Tasks
                    <Badge variant="secondary" className="ml-auto text-[10px] font-normal px-1.5 py-0">{filterCounts.all}</Badge>
                  </Button>
                  <Button
                    variant={filter === 'incomplete' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('incomplete')}
                    className="justify-start h-7 px-2 text-xs font-normal"
                  >
                    <Clock className="mr-2 h-3 w-3" />
                    In Progress
                    <Badge variant="secondary" className="ml-auto text-[10px] font-normal px-1.5 py-0">{filterCounts.incomplete}</Badge>
                  </Button>
                  <Button
                    variant={filter === 'completed' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('completed')}
                    className="justify-start h-7 px-2 text-xs font-normal"
                  >
                    <CheckCircle2 className="mr-2 h-3 w-3" />
                    Completed
                    <Badge variant="secondary" className="ml-auto text-[10px] font-normal px-1.5 py-0">{filterCounts.completed}</Badge>
                  </Button>
                  <Button
                    variant={filter === 'overdue' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('overdue')}
                    className="justify-start h-7 px-2 text-xs font-normal text-destructive"
                  >
                    <AlertCircle className="mr-2 h-3 w-3" />
                    Overdue
                    <Badge variant="destructive" className="ml-auto text-[10px] font-normal px-1.5 py-0">{filterCounts.overdue}</Badge>
                  </Button>
                </div>
              </div>
              
              {/* Project Filter */}
              <div className="space-y-1">
                <Select
                  value={selectedProject || 'all'}
                  onValueChange={(value: string) => setSelectedProject(value === 'all' ? null : value)}
                >
                  <SelectTrigger className="h-7 text-xs font-normal bg-background">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Assigned To Filter */}
              <div className="space-y-1">
                <Select
                  value={userFilter || 'all'}
                  onValueChange={value => setUserFilter(value === 'all' ? null : value)}
                >
                  <SelectTrigger className="h-7 text-xs font-normal bg-background">
                    <SelectValue placeholder="Filter by User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value={user?.id || '_self'}>
                      <div className="flex items-center">
                        <span>Me</span>
                      </div>
                    </SelectItem>
                    {users
                      .filter(u => u.id !== user?.id)
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center">
                            <span>{u.name || u.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="px-2 pb-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full h-7 text-xs font-normal"
                onClick={() => {
                  setFilter('all');
                  setSelectedProject(null);
                  setUserFilter(null);
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
            </CardFooter>
          </Card>

          {/* Tasks Column */}
          <Card className="h-auto md:h-full">
            <CardHeader className="flex-none pb-2">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search tasks..."
                    className="pl-7 h-7 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={refreshTodos}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="h-3.5 w-3.5"
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 4v4h4"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M16 16h4v4"></path>
                    </svg>
                  )}
                </Button>
              </div>
              
              <CardDescription className="text-[10px] text-muted-foreground mt-1.5">
                {filteredTodos.length} {filteredTodos.length === 1 ? 'task' : 'tasks'} {
                  filter === 'all' 
                    ? '' 
                    : filter === 'completed' 
                      ? '(completed)' 
                      : filter === 'incomplete'
                        ? '(in progress)'
                        : '(overdue)'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 min-h-0">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTodos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground mb-3 opacity-20" />
                  <p className="text-xs font-medium">No tasks found</p>
                  <Button 
                    onClick={() => setShowTaskDialog(true)} 
                    variant="outline" 
                    size="sm"
                    className="mt-3 h-7 text-xs"
                  >
                    <PlusCircle className="mr-1.5 h-3 w-3" />
                    Create a task
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-full -mx-6">
                  <div className="space-y-1 px-6">
                    {filteredTodos.map((todo) => (
                      <EnhancedTodoItem
                        key={todo.id}
                        {...todo}
                        users={users}
                        onUpdate={async (id, data) => {
                          const todoData: TodoItem = {
                            id,
                            content: data.content || '',
                            completed: data.completed || false,
                            dueDate: data.dueDate || null,
                            assignedTo: data.assignedTo || null,
                            projectId: data.projectId || null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          await updateTodo(todoData);
                          refreshTodos();
                        }}
                        onDelete={async (id) => {
                          await deleteTodo(id);
                          refreshTodos();
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        onSuccess={handleProjectSuccess}
      />

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to your projects or personal to-do list.
            </DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            projects={projects}
            users={users}
            onSubmit={handleCreateTask}
            onCancel={() => setShowTaskDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Task creation form component
function CreateTaskForm({ 
  projects, 
  users, 
  onSubmit, 
  onCancel 
}: { 
  projects: Project[];
  users: TaskUser[];
  onSubmit: (task: { content: string; projectId: string | null; assignedTo: string | null; dueDate: string | null }) => void;
  onCancel: () => void;
}) {
  const { user } = useUser();
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(user?.id || null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      content,
      projectId,
      assignedTo,
      dueDate
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
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
          <Select
            value={projectId || '_none'}
            onValueChange={(value: string) => setProjectId(value === '_none' ? null : value)}
          >
            <SelectTrigger id="project">
              <SelectValue placeholder="None (Personal Task)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None (Personal Task)</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="assigned-to">Assigned To</Label>
          <Select
            value={assignedTo || '_none'}
            onValueChange={(value: string) => setAssignedTo(value === '_none' ? null : value)}
          >
            <SelectTrigger id="assigned-to">
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Unassigned</SelectItem>
              <SelectItem value={user?.id || '_self'}>
                Me{user?.name ? ` (${user.name})` : ''}
              </SelectItem>
              {users
                .filter(u => u.id !== user?.id)
                .map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
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
        <Button type="submit" disabled={!content.trim()}>
          Create Task
        </Button>
      </DialogFooter>
    </form>
  );
} 