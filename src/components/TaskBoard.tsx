import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, MoreVertical, Clock, MessageCircle, Trash2, Pencil } from "lucide-react";
import React from "react";
import { cn } from "../lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useTodos } from "../features/todos/hooks";
import { useUser } from "../lib/user-context";
import { TodoItem } from "../types/todo";
import { CommentsDialog } from "./CommentsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { toast } from "./ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface Task extends TodoItem {
  user?: {
    name: string;
    avatar?: string;
  };
}

interface Column {
  id: 'todo' | 'in-progress' | 'review' | 'done';
  title: string;
  tasks: Task[];
  color: string;
}

export default function TaskBoard() {
  const { user } = useUser();
  const { todos, addTodo, updateTodo, deleteTodo, loading } = useTodos();
  const [showAddTaskDialog, setShowAddTaskDialog] = React.useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [newTask, setNewTask] = React.useState<Partial<TodoItem>>({
    content: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedTo: null,
    projectId: null,
    tags: [],
    status: "todo"
  });

  // Transform todos into columns
  const columns = React.useMemo(() => {
    const todoColumn: Column = {
      id: "todo",
      title: "To Do",
      color: "from-blue-500/20 to-blue-500/30",
      tasks: []
    };
    
    const inProgressColumn: Column = {
      id: "in-progress",
      title: "In Progress",
      color: "from-yellow-500/20 to-yellow-500/30",
      tasks: []
    };
    
    const reviewColumn: Column = {
      id: "review",
      title: "Review",
      color: "from-purple-500/20 to-purple-500/30",
      tasks: []
    };
    
    const doneColumn: Column = {
      id: "done",
      title: "Done",
      color: "from-green-500/20 to-green-500/30",
      tasks: []
    };

    // Map todos to tasks and distribute to columns
    todos.forEach(todo => {
      const task: Task = {
        ...todo,
        completed: todo.completed || false,
        status: todo.status || 'todo',
        priority: todo.priority || 'medium',
        tags: todo.tags || [],
        dueDate: todo.dueDate || null,
        assignedTo: todo.assignedTo || null,
        projectId: todo.projectId || null,
        user: todo.assignedTo ? {
          name: todo.assignedTo,
          avatar: undefined
        } : undefined
      };

      switch (task.status) {
        case 'in-progress':
          inProgressColumn.tasks.push(task);
          break;
        case 'review':
          reviewColumn.tasks.push(task);
          break;
        case 'done':
          doneColumn.tasks.push(task);
          break;
        default:
          todoColumn.tasks.push(task);
      }
    });

    return [todoColumn, inProgressColumn, reviewColumn, doneColumn];
  }, [todos]);

  const handleAddTask = () => {
    setShowAddTaskDialog(true);
  };

  const handleCreateTask = async () => {
    if (!user?.id || !newTask.content?.trim()) return;

    try {
      const todoItem: TodoItem = {
        id: `task-${Date.now()}`,
        content: newTask.content.trim(),
        description: newTask.description || "",
        completed: false,
        status: newTask.status || "todo",
        priority: newTask.priority || "medium",
        tags: newTask.tags || [],
        dueDate: newTask.dueDate || null,
        assignedTo: newTask.assignedTo || null,
        projectId: newTask.projectId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addTodo(todoItem);
      toast({
        title: "Success",
        description: "Task created successfully",
      });

      setShowAddTaskDialog(false);
      setNewTask({
        content: "",
        description: "",
        priority: "medium",
        dueDate: "",
        assignedTo: null,
        projectId: null,
        tags: [],
        status: "todo"
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      await updateTodo(editingTask);
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTodo(taskId);
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.setData("sourceColumnId", sourceColumnId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetColumnId: Column['id']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const sourceColumnId = e.dataTransfer.getData("sourceColumnId");

    if (sourceColumnId === targetColumnId) return;

    // Find the task in the todos
    const task = todos.find(t => t.id === taskId);
    if (!task) return;

    try {
      const updatedTodo: TodoItem = {
        ...task,
        status: targetColumnId,
        completed: targetColumnId === "done",
        priority: task.priority,
        tags: task.tags,
        updatedAt: new Date().toISOString()
      };
      
      await updateTodo(updatedTodo);
      toast({
        title: "Success",
        description: "Task moved successfully",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (
    field: keyof TodoItem,
    value: string | string[] | null
  ) => {
    setNewTask(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Task Board</h2>
          <p className="text-sm text-muted-foreground">Drag and drop tasks to update their status</p>
        </div>
        <Button onClick={handleAddTask}>
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTask.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newTask.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Task description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value: TodoItem['priority']) => handleInputChange('priority', value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={newTask.dueDate || ''}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={newTask.tags?.join(', ')}
                onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()))}
                placeholder="Enter tags"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={!newTask.content?.trim()}>Create Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editingTask?.content}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, content: e.target.value } : null)}
                placeholder="Task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editingTask?.description}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Task description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={editingTask?.priority}
                onValueChange={(value: TodoItem['priority']) => 
                  setEditingTask(prev => prev ? { ...prev, priority: value } : null)
                }
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={editingTask?.dueDate || ''}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={editingTask?.tags?.join(', ')}
                onChange={(e) => setEditingTask(prev => 
                  prev ? { ...prev, tags: e.target.value.split(',').map(t => t.trim()) } : null
                )}
                placeholder="Enter tags"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button onClick={handleUpdateTask}>Update Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <CommentsDialog
          todoId={selectedTask.id}
          isOpen={showCommentsDialog}
          onClose={() => {
            setShowCommentsDialog(false);
            setSelectedTask(null);
          }}
        />
      )}

      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
        {columns.map(column => (
          <div
            key={column.id}
            className="flex flex-col min-h-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  column.id === "todo" ? "bg-blue-500" :
                  column.id === "in-progress" ? "bg-yellow-500" :
                  column.id === "review" ? "bg-purple-500" :
                  "bg-green-500"
                )} />
                <h3 className="text-sm font-medium">{column.title}</h3>
                <span className="text-xs text-muted-foreground">
                  ({column.tasks.length})
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-3 min-h-0 overflow-y-auto">
              {column.tasks.map(task => (
                <Card
                  key={task.id}
                  className={cn(
                    "p-3 shadow-sm hover:shadow-md transition-all cursor-move group",
                    "bg-gradient-to-br backdrop-blur-sm",
                    column.color
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id, column.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium">{task.content}</h4>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTask(task)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {task.description}
                    </p>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {task.tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] font-medium"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {task.assignedTo && (
                        <Avatar className="h-6 w-6">
                          {task.user?.avatar ? (
                            <AvatarImage src={task.user.avatar} alt={task.user.name} />
                          ) : (
                            <AvatarFallback>
                              {task.user?.name?.[0] || '?'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.priority === "high" ? "bg-red-500" :
                        task.priority === "medium" ? "bg-yellow-500" :
                        "bg-green-500"
                      )} />
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-foreground"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowCommentsDialog(true);
                        }}
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 