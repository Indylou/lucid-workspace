import React, { useState, useEffect, forwardRef, useRef } from 'react';
import { Calendar, Clock, Trash2, User } from 'lucide-react';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { toast } from '../../../components/ui/use-toast';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../../../components/ui/avatar';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';
import { Input } from '../../../components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Calendar as CalendarComponent } from '../../../components/ui/calendar';
import { updateTodo, createTodo } from '../lib/todo-service';
import { TodoAttributes } from '../lib/todo-extensions';
import { useUser } from '../../../lib/user-context';

// Simple TodoItem component for standalone usage
export function TodoItem({ 
  id, 
  content, 
  completed = false, 
  dueDate,
  assignedTo,
  onUpdate,
  onDelete
}: {
  id: string;
  content: string;
  completed?: boolean;
  dueDate?: string | null;
  assignedTo?: string | null;
  onUpdate?: (id: string, data: Partial<TodoAttributes>) => void;
  onDelete?: (id: string) => void;
}) {
  const [isChecked, setIsChecked] = useState(completed);
  const [loading, setLoading] = useState(false);

  // Format the due date if it exists
  const formattedDueDate = dueDate ? formatDistanceToNow(new Date(dueDate), { addSuffix: true }) : null;
  const isOverdue = dueDate && !completed && isAfter(new Date(), new Date(dueDate));

  // Handle checkbox change
  const handleCheckChange = async (checked: boolean) => {
    setIsChecked(checked);
    setLoading(true);
    
    try {
      if (onUpdate) {
        await onUpdate(id, { completed: checked });
      } else {
        // Default behavior if no onUpdate is provided
        const { error } = await updateTodo(id, { completed: checked });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
      setIsChecked(!checked); // Revert on error
      toast({
        title: 'Failed to update todo',
        description: 'There was an error updating the todo item.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <div className={`flex items-start gap-2 p-2 rounded-md transition-colors ${isOverdue ? 'bg-red-50' : ''}`}>
      <Checkbox 
        id={`todo-${id}`}
        checked={isChecked}
        onCheckedChange={handleCheckChange}
        disabled={loading}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <label 
          htmlFor={`todo-${id}`}
          className={`cursor-pointer text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}
        >
          {content}
        </label>
        
        {formattedDueDate && (
          <div className={`flex items-center text-xs mt-1 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
            <Clock size={12} className="mr-1" />
            {formattedDueDate}
          </div>
        )}
      </div>
      
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </Button>
      )}
    </div>
  );
}

// Enhanced version with editing capabilities for rich text integrations
export function EnhancedTodoItem({
  id,
  content,
  completed = false,
  dueDate,
  assignedTo,
  projectId,
  onUpdate,
  onDelete,
  users = []
}: {
  id: string;
  content: string;
  completed?: boolean;
  dueDate?: string | null;
  assignedTo?: string | null;
  projectId?: string | null;
  onUpdate?: (id: string, data: Partial<TodoAttributes>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  users?: Array<{ id: string; name: string; avatar?: string }>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isChecked, setIsChecked] = useState(completed);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(dueDate || undefined);
  const [selectedUser, setSelectedUser] = useState<string | undefined>(assignedTo || undefined);
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Format the due date if it exists
  const formattedDueDate = dueDate ? formatDistanceToNow(new Date(dueDate), { addSuffix: true }) : null;
  const isOverdue = dueDate && !completed && isAfter(new Date(), new Date(dueDate));

  // Handle checkbox change
  const handleCheckChange = async (checked: boolean) => {
    setIsChecked(checked);
    setLoading(true);
    
    try {
      if (onUpdate) {
        await onUpdate(id, { completed: checked });
      } else {
        // Default behavior if no onUpdate is provided
        const { error } = await updateTodo(id, { completed: checked });
        if (error) throw error;
      }

      toast({
        title: checked ? 'Task completed' : 'Task reopened',
        description: checked ? 'The task has been marked as completed.' : 'The task has been reopened.',
      });
    } catch (error) {
      console.error('Failed to update todo:', error);
      setIsChecked(!checked); // Revert on error
      toast({
        title: 'Failed to update todo',
        description: 'There was an error updating the todo item.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (date: Date | undefined) => {
    if (!date) return;
    
    const isoDate = date.toISOString();
    setSelectedDate(isoDate);
    
    try {
      if (onUpdate) {
        await onUpdate(id, { dueDate: isoDate });
      } else {
        const { error } = await updateTodo(id, { dueDate: isoDate });
        if (error) throw error;
      }

      toast({
        title: 'Due date updated',
        description: `Due date set to ${date.toLocaleDateString()}.`,
      });
    } catch (error) {
      console.error('Failed to update due date:', error);
      toast({
        title: 'Failed to update due date',
        description: 'There was an error updating the due date.',
      });
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    setSelectedUser(userId);
    
    try {
      if (onUpdate) {
        await onUpdate(id, { assignedTo: userId });
      } else {
        const { error } = await updateTodo(id, { assignedTo: userId });
        if (error) throw error;
      }

      const userName = users.find(u => u.id === userId)?.name || 'user';
      toast({
        title: 'Assignee updated',
        description: `Task assigned to ${userName}.`,
      });
    } catch (error) {
      console.error('Failed to update assignee:', error);
      toast({
        title: 'Failed to update assignee',
        description: 'There was an error updating the assignee.',
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (onDelete) {
        await onDelete(id);
        toast({
          title: 'Task deleted',
          description: 'The task has been deleted successfully.',
        });
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
      toast({
        title: 'Failed to delete task',
        description: 'There was an error deleting the task.',
      });
    }
  };

  const handleContentSave = async () => {
    try {
      if (onUpdate && editedContent !== content) {
        await onUpdate(id, { content: editedContent });
        setIsEditing(false);
        toast({
          title: 'Task updated',
          description: 'The task content has been updated.',
        });
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update todo content:', error);
      toast({
        title: 'Failed to update task',
        description: 'There was an error updating the task content.',
      });
    }
  };

  return (
    <Card className={`group p-2 transition-shadow hover:shadow-md ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
      <div className="flex items-start gap-3">
        <Checkbox 
          id={`todo-${id}`}
          checked={isChecked}
          onCheckedChange={handleCheckChange}
          disabled={loading}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input 
              value={editedContent} 
              onChange={(e) => setEditedContent(e.target.value)}
              onBlur={handleContentSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleContentSave();
                } else if (e.key === 'Escape') {
                  setEditedContent(content);
                  setIsEditing(false);
                }
              }}
              autoFocus
            />
          ) : (
            <div 
              className={`text-sm cursor-pointer ${isChecked ? 'line-through text-muted-foreground' : ''}`}
              onClick={() => setIsEditing(true)}
            >
              {content}
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {/* Due date popover */}
            <Popover open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`h-7 text-xs gap-1 ${isOverdue ? 'border-red-300 text-red-600' : 'text-muted-foreground'}`}
                >
                  <Calendar size={14} />
                  {formattedDueDate || 'Set due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate ? new Date(selectedDate) : undefined}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {/* Assignee selection */}
            {users.length > 0 && (
              <Select 
                value={selectedUser || ''} 
                onValueChange={handleAssigneeChange}
              >
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Delete button */}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-7 ml-auto text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
} 