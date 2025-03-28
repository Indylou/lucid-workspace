import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Search,
  PlusCircle,
  Users,
  Clock,
  BarChart2,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Tag as TagIcon,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../App';
import { supabase } from '../lib/supabase';
import { ProjectDialog } from '../components/ProjectDialog';
import { toast } from '../components/ui/use-toast';
import { PageHeader } from '../components/layout/PageHeader';

interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'on-hold';
  progress: number;
  team_size: number;
  start_date: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tasks_total: number;
  tasks_completed: number;
  tags: string[];
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = () => {
    setSelectedProject(undefined);
    setShowProjectDialog(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDialog(true);
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500';
      case 'on-hold':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-500';
      case 'high':
        return 'bg-orange-500/10 text-orange-500';
      case 'medium':
        return 'bg-blue-500/10 text-blue-500';
      case 'low':
        return 'bg-green-500/10 text-green-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'all' || project.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'all' || project.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.tasks_total || 0), 0);
  const completedTasks = projects.reduce(
    (acc, p) => acc + (p.tasks_completed || 0),
    0
  );
  const totalTeamMembers = projects.reduce(
    (acc, p) => acc + (p.team_size || 0),
    0
  );

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
        <PageHeader
          title="Projects"
          description="Manage and track your team's projects"
          action={{
            label: "New Project",
            onClick: handleCreateProject
          }}
        />

        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col gap-2 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Projects</span>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{activeProjects}</div>
              <p className="text-xs text-muted-foreground">
                {activeProjects} projects in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Tasks</span>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {completedTasks} / {totalTasks}
              </div>
              <p className="text-xs text-muted-foreground">
                {((completedTasks / totalTasks) * 100 || 0).toFixed(0)}% tasks
                completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Team Members</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{totalTeamMembers}</div>
              <p className="text-xs text-muted-foreground">
                Across all projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Due Soon</span>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {
                  projects.filter(
                    (p) =>
                      p.due_date &&
                      new Date(p.due_date) > new Date() &&
                      new Date(p.due_date) <
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Projects due in 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto pb-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-2">
                      <Badge
                        variant="secondary"
                        className={getStatusColor(project.status)}
                      >
                        {project.status.charAt(0).toUpperCase() +
                          project.status.slice(1)}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={getPriorityColor(project.priority)}
                      >
                        {project.priority.charAt(0).toUpperCase() +
                          project.priority.slice(1)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditProject(project)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{project.team_size} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {project.tasks_completed}/{project.tasks_total} tasks
                      </span>
                    </div>
                    {project.start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Starts {format(new Date(project.start_date), 'MMM d')}
                        </span>
                      </div>
                    )}
                    {project.due_date && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Due {format(new Date(project.due_date), 'MMM d')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TagIcon className="h-3 w-3" />
                      </div>
                      {project.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Last Updated */}
                  <div className="text-xs text-muted-foreground mt-4">
                    Updated{' '}
                    {formatDistanceToNow(new Date(project.updated_at), {
                      addSuffix: true,
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        project={selectedProject}
        onSuccess={() => {
          setShowProjectDialog(false);
          fetchProjects();
        }}
      />
    </AppLayout>
  );
} 