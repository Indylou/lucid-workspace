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
  const [dueDate, setDueDate] = useState(initialTodo?.dueDate || '')
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
  }
  
  return (
    <div className="todo-editor space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="document-title">Note Title</Label>
          <Input
            id="document-title"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="w-full md:w-[400px]"
          />
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave}>
            {initialTodo ? 'Update Todo' : 'Add Todo'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Document</CardTitle>
            </CardHeader>
            <CardContent>
              <TodoEnabledEditor
                initialContent={content}
                onChange={setContent}
                projectId={projectId}
                onEditorReady={handleEditorReady}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Task Views Column */}
        <div>
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              {isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="personal">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="personal">My Tasks</TabsTrigger>
                  <TabsTrigger value="project">Project Tasks</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal" className="space-y-4 mt-4">
                  {personalTodos.length === 0 ? (
                    <p className="text-muted-foreground">No tasks assigned to you</p>
                  ) : (
                    <div className="space-y-2">
                      {personalTodos.map((todo) => (
                        <TaskItem
                          key={todo.id}
                          todo={todo}
                          onToggleComplete={toggleTodoCompletion}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="project" className="space-y-4 mt-4">
                  {projectTodos.length === 0 ? (
                    <p className="text-muted-foreground">No tasks in this project</p>
                  ) : (
                    <div className="space-y-2">
                      {projectTodos.map((todo) => (
                        <TaskItem
                          key={todo.id}
                          todo={todo}
                          onToggleComplete={toggleTodoCompletion}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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