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
    <div className="container mx-auto py-6 max-w-7xl px-4 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tasks and collaborate with team members.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={() => setShowProjectDialog(true)}
            variant="outline"
            size="sm"
            className="h-9"
          >
            New Project
          </Button>
          <Button 
            onClick={() => setShowTaskDialog(true)}
            size="sm"
            className="h-9"
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Column */}
        <div className="w-full md:w-64 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="justify-start"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    All Tasks
                    <Badge className="ml-auto">{filterCounts.all}</Badge>
                  </Button>
                  <Button
                    variant={filter === 'incomplete' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('incomplete')}
                    className="justify-start"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    In Progress
                    <Badge className="ml-auto">{filterCounts.incomplete}</Badge>
                  </Button>
                  <Button
                    variant={filter === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('completed')}
                    className="justify-start"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Completed
                    <Badge className="ml-auto">{filterCounts.completed}</Badge>
                  </Button>
                  <Button
                    variant={filter === 'overdue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('overdue')}
                    className="justify-start text-destructive"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Overdue
                    <Badge variant="destructive" className="ml-auto">{filterCounts.overdue}</Badge>
                  </Button>
                </div>
              </div>
              
              {/* Project Filter */}
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={selectedProject || 'all'}
                  onValueChange={(value: string) => setSelectedProject(value === 'all' ? null : value)}
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select
                  value={userFilter || 'all'}
                  onValueChange={value => setUserFilter(value === 'all' ? null : value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value={user?.id || '_self'}>
                      <div className="flex items-center">
                        <span className="ml-2">Me</span>
                      </div>
                    </SelectItem>
                    {users
                      .filter(u => u.id !== user?.id)
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center">
                            <span className="ml-2">{u.name || u.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full"
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
        </div>
        
        {/* Tasks Column */}
        <div className="flex-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>
                  {selectedProject 
                    ? getProjectNameById(selectedProject) 
                    : filter === 'all' 
                      ? 'All Tasks' 
                      : filter === 'completed' 
                        ? 'Completed Tasks' 
                        : filter === 'incomplete'
                          ? 'In-Progress Tasks'
                          : 'Overdue Tasks'
                  }
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={refreshTodos}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
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
                        className="h-4 w-4"
                      >
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 4v4h4"></path>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                        <path d="M16 16h4v4"></path>
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search tasks..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <CardDescription className="pt-1">
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
            
            <CardContent>
              {loading ? (
                <div className="py-8 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading tasks...
                </div>
              ) : filteredTodos.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p>No tasks found</p>
                  <p className="text-sm">
                    {searchQuery 
                      ? "Try adjusting your search or filters."
                      : "Create a new task to get started."}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => setShowTaskDialog(true)}
                  >
                    <PlusCircle className="mr-1 h-4 w-4" />
                    New Task
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-16rem)] py-1">
                  <div className="space-y-3 pr-3">
                    {filteredTodos.map((todo) => (
                      <EnhancedTodoItem
                        key={todo.id}
                        id={todo.id}
                        content={todo.content}
                        completed={todo.completed}
                        dueDate={todo.dueDate}
                        assignedTo={todo.assignedTo}
                        projectId={todo.projectId}
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

      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        onSuccess={handleProjectSuccess}
      />

      {/* Task Creation Dialog */}
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