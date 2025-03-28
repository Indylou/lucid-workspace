import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BarChart, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getUserTodos } from '../../features/todos/lib/todo-service';
import type { TodoItem } from '../../types/todo';
import { Project, getUserProjects, getProjectMetrics } from '../../lib/project-service';
import { cn } from '../../lib/utils';

interface CompletionStats {
  total: number;
  completed: number;
  overdue: number;
  rate: number;
}

interface ProjectMetrics {
  id: string;
  name: string;
  completion_rate: number;
  tasks_total: number;
  tasks_completed: number;
  recent_activity: number;
}

export function AnalyticsModule() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CompletionStats>({
    total: 0,
    completed: 0,
    overdue: 0,
    rate: 0
  });
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Fetch todos
        const { todos } = await getUserTodos(user.id);
        const now = new Date();
        
        const completionStats: CompletionStats = {
          total: 0,
          completed: 0,
          overdue: 0,
          rate: 0
        };

        const overdueTasks = todos.filter(todo => 
          !todo.completed && 
          todo.dueDate && 
          new Date(todo.dueDate) < new Date()
        ).length;

        const upcomingTasks = todos.filter(todo => 
          !todo.completed && 
          todo.dueDate && 
          new Date(todo.dueDate) > new Date()
        ).length;

        completionStats.total = todos.length;
        completionStats.completed = todos.filter(todo => todo.completed).length;
        completionStats.overdue = overdueTasks;
        completionStats.rate = completionStats.total > 0 
          ? (completionStats.completed / completionStats.total) * 100 
          : 0;

        setStats(completionStats);

        // Fetch projects and their metrics
        const { projects } = await getUserProjects(user.id);
        const metricsPromises = projects.map(async (project: Project) => {
          const { metrics } = await getProjectMetrics(project.id);
          return {
            id: project.id,
            name: project.name,
            ...metrics
          };
        });

        const projectMetricsData = await Promise.all(metricsPromises);
        setProjectMetrics(projectMetricsData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Analytics Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.rate.toFixed(1)}%</div>
                  <Progress value={stats.rate} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completed}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.overdue}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="projects" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projectMetrics.map(project => (
                <Card key={project.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{project.name}</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Completion</span>
                        <span className="text-sm font-medium">{project.completion_rate.toFixed(1)}%</span>
                      </div>
                      <Progress value={project.completion_rate} />
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Tasks</p>
                          <p className="text-sm font-medium">{project.tasks_completed}/{project.tasks_total}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Recent Activity</p>
                          <p className="text-sm font-medium">{project.recent_activity} updates</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 