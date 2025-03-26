import React from 'react'
import { Editor } from '@tiptap/react'
import { Button } from '../../../components/ui/button'
import { CheckSquare, ListTodo } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover"
import { Calendar } from "../../../components/ui/calendar"
import { ProjectSelector } from './ProjectSelector'

interface TodoToolbarProps {
  editor: Editor
  onProjectSelect?: (projectId: string) => void
  currentProjectId?: string
}

export const TodoToolbar: React.FC<TodoToolbarProps> = ({ 
  editor, 
  onProjectSelect,
  currentProjectId 
}) => {
  const [isDueDateOpen, setIsDueDateOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)

  const addTodo = () => {
    // Get the current selection
    const { selection } = editor.state
    const { $head } = selection
    
    // Check if we're already in a todo item
    const node = $head.node()
    
    if (node && node.type.name === 'todo') {
      // If we're in a todo item, create a new one after it
      editor.chain().focus().addTodo().run()
    } else {
      // Otherwise, create a new todo item
      editor.chain().focus().addTodo().run()
    }
    
    // Position cursor in the newly created item
    editor.commands.focus('end')
  }

  const toggleTodo = () => {
    editor.chain().focus().toggleTodo().run()
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      editor.chain().focus().updateAttributes('todo', {
        dueDate: date.toISOString()
      }).run()
    }
    setIsDueDateOpen(false)
  }

  return (
    <div className="border-b p-2 flex gap-2 items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={addTodo}
        className="flex items-center gap-2"
      >
        <ListTodo className="h-4 w-4" />
        Add Todo
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTodo}
        className="flex items-center gap-2"
      >
        <CheckSquare className="h-4 w-4" />
        Toggle Todo
      </Button>

      {/* Project Selector */}
      {onProjectSelect && (
        <ProjectSelector
          onSelect={onProjectSelect}
          currentProjectId={currentProjectId}
        />
      )}

      {/* Calendar */}
      <Popover open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            Set Due Date
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="rounded-md border shadow"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 