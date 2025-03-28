import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { TodoEnabledEditor } from './todo-enabled-editor'
import { getProjectTodos, getUserTodos, TodoItemAttributes } from '../lib/todo-service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Checkbox } from '../../../components/ui/checkbox'
import { Separator } from '../../../components/ui/separator'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { TodoItem } from '../../../types/todo'
import { useTodoContext } from '../hooks/todo-context'
import { Textarea } from '../../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'

interface TodoEditorProps {
  projectId?: string
  currentUser?: string
  initialTodo?: TodoItem
  onSave?: (todo: TodoItem) => void
  onCancel?: () => void
}

export function TodoEditor({
  projectId = 'default-project',
  currentUser = 'current-user',
  initialTodo,
  onSave,
  onCancel,
}: TodoEditorProps) {
  const [content, setContent] = useState(initialTodo?.content || '')
  const [description, setDescription] = useState(initialTodo?.description || '')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(initialTodo?.priority || 'medium')
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'review' | 'done'>(initialTodo?.status || 'todo')
  const [tags, setTags] = useState<string[]>(initialTodo?.tags || [])
  const [dueDate, setDueDate] = useState<string | null>(initialTodo?.dueDate || null)
  const [assignedTo, setAssignedTo] = useState(initialTodo?.assignedTo || '')
  const [documentTitle, setDocumentTitle] = useState('Untitled Document')
  const [personalTodos, setPersonalTodos] = useState<TodoItemAttributes[]>([])
  const [projectTodos, setProjectTodos] = useState<TodoItemAttributes[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const editorRef = useRef<any>(null)
  const { addTodo, updateTodo } = useTodoContext()
  
  // Function to load todos
  const loadTodos = async () => {
    setIsLoading(true)
    try {
      // Load personal todos
      const { todos: userTodos } = await getUserTodos(currentUser || '')
      setPersonalTodos(userTodos)
      
      // Load project todos
      const { todos: projTodos } = await getProjectTodos(projectId)
      setProjectTodos(projTodos)
    } catch (error) {
      console.error('Error loading todos:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Toggle task completion 
  const toggleTodoCompletion = (todoId: string, completed: boolean) => {
    if (editorRef.current) {
      // Use the editor's command to toggle completion
      editorRef.current.commands.toggleTodoItemCompletion(todoId)
      
      // Refresh the todo lists
      void loadTodos()
    }
  }
  
  // Listen for changes to refresh todo lists
  useEffect(() => {
    // Initial load
    void loadTodos()
  }, [currentUser, projectId])
  
  // Handle editor initialization
  const handleEditorReady = (editor: any) => {
    editorRef.current = editor
    
    // Listen for custom todo update events
    window.addEventListener('todo:update', () => {
      // Schedule a refresh after todo updates
      void loadTodos()
    })
  }
  
  // Handle saving
  const handleSave = async () => {
    if (!content.trim()) return

    const todoData: TodoItem = {
      id: initialTodo?.id || crypto.randomUUID(),
      content: content.trim(),
      completed: initialTodo?.completed || false,
      dueDate: dueDate || null,
      assignedTo: assignedTo || null,
      projectId: projectId || null,
      createdAt: initialTodo?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description,
      priority,
      status,
      tags,
    }

    if (initialTodo) {
      await updateTodo(todoData)
    } else {
      await addTodo(todoData)
    }

    onSave?.(todoData)
    setContent('')
    setDueDate('')
    setAssignedTo('')
    setDescription('')
    setPriority('medium')
    setStatus('todo')
    setTags([])
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSave()
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagList = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
    setTags(tagList)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="content">Task Title</Label>
        <Input
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What needs to be done?"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details about this task..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value: any) => setStatus(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={tags.join(', ')}
          onChange={handleTagsChange}
          placeholder="feature, bug, design"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          type="date"
          id="dueDate"
          value={dueDate || ''}
          onChange={(e) => setDueDate(e.target.value || null)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Task</Button>
      </div>
    </form>
  )
}

// Task item component for the task lists
function TaskItem({
  todo,
  onToggleComplete,
}: {
  todo: TodoItemAttributes;
  onToggleComplete: (id: string, completed: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-md border">
      <Checkbox
        checked={todo.completed}
        onCheckedChange={(checked) => onToggleComplete(todo.id, !!checked)}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className={todo.completed ? "line-through text-muted-foreground" : ""}>
          {todo.content || "Untitled task"}
        </div>
        {todo.assignedTo && (
          <div className="text-xs text-muted-foreground mt-1">
            Assigned to: <span className="font-medium">@{todo.assignedTo}</span>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          Created: {new Date(todo.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
} 