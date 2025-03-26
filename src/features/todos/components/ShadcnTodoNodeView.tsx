import React, { useState, useEffect, useContext } from 'react';
import { Calendar, Clock, Trash2, UserIcon, Edit, Check, X, CalendarIcon, ChevronDown, Pencil } from 'lucide-react';
import { formatDistanceToNow, isAfter, format } from 'date-fns';
import { NodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { UserAssignment } from './UserAssignment';
import { cn } from '../../../lib/utils';
import { DatePicker } from '../../../components/ui/date-picker';
import { UserSelector } from './UserSelector';

// UI Components
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Calendar as CalendarComponent } from '../../../components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { toast } from '../../../components/ui/use-toast';

// Type imports
import { TodoAttributes } from '../lib/todo-extensions';
import { Project, User as SupabaseUser } from '../../../lib/supabase';

// Add context hook
import { useTodos } from '../hooks';
import { useUser } from '../../../lib/user-context';

// ShadcnTodoNodeView component 
export const ShadcnTodoNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, editor } = props;
  const { id, completed, dueDate, assignedTo, projectId } = node.attrs;
  
  // Get users and projects from context
  const todosContext = useTodos();
  const { user } = useUser();
  
  // Extract content from the node
  const extractContentFromNode = () => {
    let content = '';
    node.forEach((childNode: any) => {
      content += childNode.text || '';
    });
    return content;
  };

  const [isChecked, setIsChecked] = useState(completed || false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(extractContentFromNode());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dueDate ? new Date(dueDate) : undefined
  );
  const [loading, setLoading] = useState(false);

  // Update edited content when node content changes
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(extractContentFromNode());
    }
  }, [node.content]);

  // Format the due date if it exists
  const formattedDueDate = dueDate ? formatDistanceToNow(new Date(dueDate), { addSuffix: true }) : null;
  const isOverdue = dueDate && !isChecked && isAfter(new Date(), new Date(dueDate));

  useEffect(() => {
    // Synchronize the checked state with props
    setIsChecked(!!completed);
  }, [completed]);

  // Handle checkbox change
  const handleCheckChange = (checked: boolean) => {
    setIsChecked(checked);
    setLoading(true);
    
    // Update node attributes
    updateAttributes({
      completed: checked,
      updatedAt: new Date().toISOString(),
    });
    
    // Dispatch custom event for external handlers
    const event = new CustomEvent('todoToggle', { 
      detail: { id, completed: checked } 
    });
    document.dispatchEvent(event);
    
    setLoading(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsDueDateOpen(false);
    
    if (date) {
      updateAttributes({
        dueDate: date.toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      // Dispatch event for external handlers
      const event = new CustomEvent('external-todo-update', { 
        detail: { id, dueDate: date.toISOString() } 
      });
      document.dispatchEvent(event);
      
      toast({
        title: "Due date updated",
        description: `Due date set to ${format(date, 'PPP')}`,
      });
    }
  };

  const handleAssigneeSelect = (userId: string) => {
    updateAttributes({
      assignedTo: userId || null,
      updatedAt: new Date().toISOString(),
    });
    
    // Dispatch event for external handlers
    const event = new CustomEvent('external-todo-update', { 
      detail: { id, assignedTo: userId || null } 
    });
    document.dispatchEvent(event);
    
    toast({
      title: "Task assigned",
      description: "Task has been assigned successfully",
    });
  };

  const removeDueDate = () => {
    setSelectedDate(undefined);
    setIsDueDateOpen(false);
    
    updateAttributes({
      dueDate: null,
      updatedAt: new Date().toISOString(),
    });
    
    // Dispatch event for external handlers
    const event = new CustomEvent('external-todo-update', { 
      detail: { id, dueDate: null } 
    });
    document.dispatchEvent(event);
    
    toast({
      title: "Due date removed",
      description: "Due date has been removed from this task",
    });
  };

  // Handle saving edited content
  const handleSaveContent = () => {
    // We need to replace the node content with the edited content
    const pos = editor.view.state.selection.from;
    
    // Create a transaction to replace the node content
    const tr = editor.view.state.tr;
    
    // Delete existing content
    editor.commands.focus();
    editor.commands.command(({ tr, commands }) => {
      const nodePos = tr.selection.$from.before();
      // First clear the node's content
      const node = tr.doc.nodeAt(nodePos);
      if (node) {
        tr.deleteRange(nodePos + 1, nodePos + node.nodeSize - 1);
        // Insert new content as text
        tr.insertText(editedContent, nodePos + 1);
        return true;
      }
      return false;
    });
    
    // Update additional attributes
    updateAttributes({
      content: editedContent,
      updatedAt: new Date().toISOString(),
    });
    
    // Dispatch event for external handlers
    const event = new CustomEvent('external-todo-update', { 
      detail: { id, content: editedContent } 
    });
    document.dispatchEvent(event);
    
    toast({
      title: "Task updated",
      description: "Task content has been updated successfully",
    });
    
    setIsEditing(false);
  };

  // Project selection handler
  const handleProjectSelect = (projectId: string) => {
    updateAttributes({
      projectId: projectId === '_none' ? null : projectId,
      updatedAt: new Date().toISOString(),
    });
    
    // Dispatch event for external handlers
    const event = new CustomEvent('external-todo-update', { 
      detail: { id, projectId: projectId === '_none' ? null : projectId } 
    });
    document.dispatchEvent(event);
    
    // Refresh the todos list to reflect the changes
    todosContext?.refreshTodos?.();
    
    // Get project name for the toast
    const projectName = todosContext?.projects?.find((p: Project) => p.id === projectId)?.name || 'project';
    
    toast({
      title: "Project assigned",
      description: projectId === '_none' 
        ? "Task removed from project" 
        : `Task assigned to ${projectName}`,
    });
  };

  // Get the current project name
  const getProjectName = () => {
    if (!projectId) return null;
    return todosContext?.projects?.find((p: Project) => p.id === projectId)?.name || projectId;
  };

  // Enhanced card-based UI
  return (
    <NodeViewWrapper
      className={cn(
        "relative flex items-center gap-2 p-1 rounded-md",
        node.attrs.completed && "bg-accent"
      )}
    >
      <div className="flex-shrink-0 pt-1">
        <Checkbox 
          checked={isChecked} 
          onCheckedChange={handleCheckChange}
          disabled={loading}
        />
      </div>
      
      <div className="flex-grow min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="flex-grow"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={() => handleSaveContent()}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div 
              className={`flex-grow ${isChecked ? 'line-through text-muted-foreground' : ''}`}
              onClick={() => setIsEditing(true)}
            >
              <NodeViewContent className="inline" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {assignedTo && (
                <UserAssignment userId={assignedTo} />
              )}
              {dueDate && (
                <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs">
                  {formattedDueDate}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <DatePicker date={selectedDate} onSelect={handleDateSelect} />
        <UserSelector onSelect={handleAssigneeSelect} currentUserId={assignedTo} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Settings Menu */}
      <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        {/* ... rest of the settings menu ... */}
      </DropdownMenu>
    </NodeViewWrapper>
  );
};

export default ShadcnTodoNodeView; 