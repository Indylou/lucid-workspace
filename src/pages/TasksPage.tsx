import React, { useState, useEffect, useMemo } from 'react'
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
import styles from '../styles/tasks.module.css'
import { cn } from '../lib/utils'
import { ThemeToggle } from "../components/ThemeToggle";
import { QuickActions } from "../components/QuickActions";
import AppLayout from "../components/layout/AppLayout";
import { PageHeader } from '../components/layout/PageHeader';
import TaskBoard from '../components/TaskBoard';

// Extend User type to match our TaskUser structure
interface TaskUser extends Omit<User, 'updated_at'> {
  updated_at?: string;
}

export default function TasksPage() {
  const handleAddTask = () => {
    // Add task functionality
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
        <PageHeader
          title="Tasks"
          description="Manage and track your team's tasks"
          action={{
            label: "Add Task",
            onClick: handleAddTask
          }}
        />

        <div className="flex-1 overflow-hidden">
          <TaskBoard />
        </div>
      </div>
    </AppLayout>
  );
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