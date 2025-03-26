import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  BarChart as BarChartIcon, 
  PieChart, 
  LineChart, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  User
} from 'lucide-react'
import { useAuth } from '../../App'
import { toast } from '../ui/use-toast'
import { TodoItemAttributes, getUserTodos } from '../../features/todos/lib'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isThisWeek, differenceInDays } from 'date-fns'
import { supabase } from '../../lib/supabase'

// Mock project types
interface Project {
  id: string
  name: string
  taskCount: number
  completedTaskCount: number
  collaborators: number
  activityLevel: 'high' | 'medium' | 'low'
  lastUpdated: Date
}

interface UserActivity {
  date: Date
  completedTasks: number
  addedTasks: number
}

interface CompletionStats {
  completed: number
  pending: number
  overdue: number
  total: number
  completionRate: number
}

export function AnalyticsModule() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('personal')
  const [isLoading, setIsLoading] = useState(true)
  const [userTasks, setUserTasks] = useState<TodoItemAttributes[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])
  const [completionStats, setCompletionStats] = useState<CompletionStats>({
    completed: 0,
    pending: 0,
    overdue: 0,
    total: 0,
    completionRate: 0
  })

  // Fetch data for analytics
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      
      try {
        if (!user) {
          throw new Error('User not authenticated')
        }
        
        // Use real data from Supabase instead of mock data
        
        // Fetch user tasks
        const { todos } = await getUserTodos(user.id)
        setUserTasks(todos)
        
        // Calculate completion stats
        const completed = todos.filter(t => t.completed).length
        const pending = todos.filter(t => !t.completed && (!t.dueDate || new Date(t.dueDate) >= new Date())).length
        const overdue = todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length
        const total = todos.length
        
        setCompletionStats({
          completed,
          pending,
          overdue,
          total,
          completionRate: total > 0 ? (completed / total) * 100 : 0
        })
        
        // Fetch projects from Supabase
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
        
        if (projectsError) {
          console.error('Error fetching projects:', projectsError)
          throw new Error('Failed to fetch projects')
        }
        
        // Transform project data to include task counts
        const projectsWithTaskCounts = await Promise.all(
          (projectsData || []).map(async (project) => {
            // Fetch tasks for this project
            const { data: projectTasks, error } = await supabase
              .from('todos')
              .select('*')
              .eq('project_id', project.id)
            
            if (error) {
              console.error(`Error fetching tasks for project ${project.id}:`, error)
              return null
            }
            
            const taskCount = projectTasks?.length || 0
            const completedTaskCount = projectTasks?.filter(t => t.completed).length || 0
            
            // Get collaborators for this project
            const { data: collaborators, error: collabError } = await supabase
              .from('project_members')
              .select('*')
              .eq('project_id', project.id)
            
            if (collabError) {
              console.error(`Error fetching collaborators for project ${project.id}:`, collabError)
            }
            
            // Determine activity level based on recent tasks
            const recentTasks = projectTasks?.filter(t => {
              const updateDate = new Date(t.updated_at || t.created_at)
              const daysDiff = (new Date().getTime() - updateDate.getTime()) / (1000 * 3600 * 24)
              return daysDiff <= 7 // Tasks updated in the last 7 days
            })
            
            let activityLevel: 'high' | 'medium' | 'low' = 'low'
            if (recentTasks && recentTasks.length > 0) {
              activityLevel = recentTasks.length > 5 ? 'high' : recentTasks.length > 2 ? 'medium' : 'low'
            }
            
            // Get the last updated date
            const lastUpdated = projectTasks && projectTasks.length > 0
              ? projectTasks.reduce((latest, task) => {
                  const taskDate = new Date(task.updated_at || task.created_at)
                  return taskDate > latest ? taskDate : latest
                }, new Date(0))
              : new Date()
            
            return {
              id: project.id,
              name: project.name,
              taskCount,
              completedTaskCount,
              collaborators: collaborators?.length || 0,
              activityLevel,
              lastUpdated
            } as Project
          })
        )
        
        // Filter out null projects (from errors)
        setProjects(projectsWithTaskCounts.filter(p => p !== null) as Project[])
        
        // Generate activity data for the past week
        const start = startOfWeek(new Date())
        const end = endOfWeek(new Date())
        const days = eachDayOfInterval({ start, end })
        
        // Get activity data for each day in the week
        const activityData = await Promise.all(
          days.map(async (date) => {
            const dayStart = new Date(date)
            dayStart.setHours(0, 0, 0, 0)
            
            const dayEnd = new Date(date)
            dayEnd.setHours(23, 59, 59, 999)
            
            // Get completed tasks for this day
            const { data: completedTasks, error: completedError } = await supabase
              .from('todos')
              .select('*')
              .eq('completed', true)
              .gte('updated_at', dayStart.toISOString())
              .lte('updated_at', dayEnd.toISOString())
              .eq('assigned_to', user.id)
            
            if (completedError) {
              console.error(`Error fetching completed tasks for ${date.toDateString()}:`, completedError)
            }
            
            // Get added tasks for this day
            const { data: addedTasks, error: addedError } = await supabase
              .from('todos')
              .select('*')
              .gte('created_at', dayStart.toISOString())
              .lte('created_at', dayEnd.toISOString())
              .eq('assigned_to', user.id)
            
            if (addedError) {
              console.error(`Error fetching added tasks for ${date.toDateString()}:`, addedError)
            }
            
            return {
              date,
              completedTasks: completedTasks?.length || 0,
              addedTasks: addedTasks?.length || 0
            }
          })
        )
        
        setUserActivity(activityData)
        
      } catch (error) {
        console.error('Error fetching analytics data:', error)
        toast({
          title: 'Error loading analytics',
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAnalyticsData()
  }, [user])

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your productivity and project progress</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Projects
          </TabsTrigger>
        </TabsList>
        
        {/* Personal Analytics */}
        <TabsContent value="personal" className="space-y-6">
          {/* Top Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {/* Task Completion Rate */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionStats.completionRate.toFixed(0)}%</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  <span>5% increase from last week</span>
                </div>
                <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${completionStats.completionRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Tasks Completed */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Tasks Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionStats.completed}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  <span>3 more than last week</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Pending Tasks */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-amber-500" />
                  Pending Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionStats.pending}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ArrowDownRight className="mr-1 h-3 w-3 text-amber-500" />
                  <span>2 less than last week</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Overdue Tasks */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-red-500" />
                  Overdue Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionStats.overdue}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ArrowDownRight className="mr-1 h-3 w-3 text-green-500" />
                  <span>1 less than last week</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Weekly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>Your task completion and creation over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <div className="flex flex-col h-full">
                  {/* Mock Bar Chart - In a real app, use a chart library like recharts */}
                  <div className="flex-1 flex items-end justify-between mt-6">
                    {userActivity.map((day, i) => (
                      <div key={i} className="flex flex-col items-center justify-end space-y-2 w-1/7">
                        <div className="flex flex-col items-center space-y-1">
                          <div 
                            className="w-12 bg-primary/80 rounded-t"
                            style={{ height: `${day.completedTasks * 30}px` }}
                          ></div>
                          <div 
                            className="w-12 bg-blue-300 rounded-t"
                            style={{ height: `${day.addedTasks * 30}px` }}
                          ></div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(day.date, 'EEE')}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-center mt-6 space-x-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary rounded mr-2"></div>
                      <span className="text-sm">Completed</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-300 rounded mr-2"></div>
                      <span className="text-sm">Created</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Task Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Task Status</CardTitle>
                <CardDescription>Distribution of your tasks by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center">
                  {/* Mock Pie Chart - In a real app, use a chart library */}
                  <div className="relative h-40 w-40">
                    <div className="absolute inset-0 rounded-full border-8 border-primary" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' }}></div>
                    <div className="absolute inset-0 rounded-full border-8 border-amber-400" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' }}></div>
                    <div className="absolute inset-0 rounded-full border-8 border-red-400" style={{ clipPath: 'polygon(0 0, 20% 0, 20% 20%, 0% 20%)' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{completionStats.total}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary rounded mr-2"></div>
                      <span className="text-sm">Completed</span>
                    </div>
                    <span className="text-sm font-medium">{completionStats.completed} tasks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-amber-400 rounded mr-2"></div>
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="text-sm font-medium">{completionStats.pending} tasks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400 rounded mr-2"></div>
                      <span className="text-sm">Overdue</span>
                    </div>
                    <span className="text-sm font-medium">{completionStats.overdue} tasks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Task Tags/Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Project Distribution</CardTitle>
                <CardDescription>Your tasks by project</CardDescription>
              </CardHeader>
              <CardContent>
                {/* In a real app, you would use data from API */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                      <span className="text-sm">Website Redesign</span>
                    </div>
                    <span className="text-sm font-medium">8 tasks</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '32%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
                      <span className="text-sm">Marketing Campaign</span>
                    </div>
                    <span className="text-sm font-medium">6 tasks</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: '24%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                      <span className="text-sm">Q4 Planning</span>
                    </div>
                    <span className="text-sm font-medium">5 tasks</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '20%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                      <span className="text-sm">Personal Tasks</span>
                    </div>
                    <span className="text-sm font-medium">6 tasks</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gray-500" style={{ width: '24%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Project Analytics */}
        <TabsContent value="projects" className="space-y-6">
          {/* Top Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Projects */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  Total Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  <span>1 new this month</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Total Tasks */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                  Total Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projects.reduce((sum, project) => sum + project.taskCount, 0)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  <span>8 more than last month</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Tasks Completed */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Completed Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projects.reduce((sum, project) => sum + project.completedTaskCount, 0)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  <span>12 more than last month</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Total Collaborators */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  <span>2 new this month</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Project Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Project Completion Rates</CardTitle>
              <CardDescription>Task completion percentage by project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {projects.map(project => {
                  const completionRate = project.taskCount > 0 
                    ? (project.completedTaskCount / project.taskCount) * 100 
                    : 0
                  
                  return (
                    <div key={project.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {project.completedTaskCount} / {project.taskCount} tasks
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            completionRate > 75 ? 'bg-green-500' : 
                            completionRate > 50 ? 'bg-blue-500' : 
                            completionRate > 25 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <div>
                          Last updated: {format(project.lastUpdated, 'MMM d, yyyy')}
                        </div>
                        <div>
                          {completionRate.toFixed(0)}% complete
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Project Activity and Team Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Project Activity</CardTitle>
                <CardDescription>Recent activity by project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {projects
                    .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
                    .map(project => (
                      <div key={project.id} className="flex items-start space-x-4">
                        <div className={`mt-0.5 h-9 w-9 rounded-full flex items-center justify-center ${
                          project.activityLevel === 'high' ? 'bg-green-100 text-green-700' :
                          project.activityLevel === 'medium' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Last updated {format(project.lastUpdated, 'MMM d, yyyy')}
                          </div>
                          <div className="text-sm">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              project.activityLevel === 'high' ? 'bg-green-100 text-green-800' :
                              project.activityLevel === 'medium' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {project.activityLevel === 'high' ? 'High activity' :
                               project.activityLevel === 'medium' ? 'Medium activity' :
                               'Low activity'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Team Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Team Distribution</CardTitle>
                <CardDescription>Collaborators by project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  {/* Mock Pie Chart - In a real app, use a chart library */}
                  <div className="relative h-48 w-48">
                    <svg viewBox="0 0 100 100" className="h-full w-full">
                      {/* Project 1 */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="20" strokeDasharray="60 40" strokeDashoffset="0"></circle>
                      {/* Project 2 */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="20" strokeDasharray="45 55" strokeDashoffset="-60"></circle>
                      {/* Project 3 */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22c55e" strokeWidth="20" strokeDasharray="30 70" strokeDashoffset="-105"></circle>
                      {/* Project 4 */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="20" strokeDasharray="15 85" strokeDashoffset="-135"></circle>
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  {projects.map((project, index) => {
                    const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#ef4444']
                    return (
                      <div key={project.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: colors[index % colors.length] }}></div>
                          <span className="text-sm">{project.name}</span>
                        </div>
                        <span className="text-sm font-medium">{project.collaborators} members</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 