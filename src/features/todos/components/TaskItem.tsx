import React from 'react'
import { TodoItem } from '../../../types/todo'
import { Checkbox } from '../../../components/ui/checkbox'
import { Badge } from '../../../components/ui/badge'
import { Calendar, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../../../lib/utils'

interface TaskItemProps {
  todo: TodoItem
  onToggleComplete: (id: string) => void
}

export function TaskItem({ todo, onToggleComplete }: TaskItemProps) {
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

  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-lg border",
      todo.completed && "bg-muted"
    )}>
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => onToggleComplete(todo.id)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-sm font-medium",
            todo.completed && "line-through text-muted-foreground"
          )}>
            {todo.content}
          </span>
          {todo.priority && (
            <Badge variant="secondary" className={getPriorityColor(todo.priority)}>
              {todo.priority}
            </Badge>
          )}
          {todo.status && (
            <Badge variant="secondary" className={getStatusColor(todo.status)}>
              {todo.status}
            </Badge>
          )}
        </div>
        {todo.description && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {todo.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {todo.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(todo.dueDate), 'MMM d')}</span>
            </div>
          )}
          {todo.commentsCount !== undefined && todo.commentsCount !== null && todo.commentsCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{todo.commentsCount}</span>
            </div>
          )}
        </div>
        {todo.tags && todo.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {todo.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="bg-primary/10 text-primary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 