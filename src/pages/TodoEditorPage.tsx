import React, { useState } from 'react'
import { TodoEditor } from '../features/todos/components'
import { TodoItem } from '../types/todo'

export default function TodoEditorPage() {
  const [savedContent, setSavedContent] = useState<TodoItem | null>(null)

  const handleSave = (todo: TodoItem) => {
    setSavedContent(todo)
    alert('Document saved successfully!')
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold">Todo Document Editor</h1>
        <p className="text-muted-foreground">
          Create rich-text documents with structured todos that sync to personal and project task views.
        </p>
      </div>

      <TodoEditor 
        projectId="project-demo"
        currentUser="user1"
        onSave={handleSave}
      />

      {savedContent && (
        <div className="mt-8 p-4 border rounded-md">
          <h2 className="text-xl font-semibold mb-2">Saved Content (JSON):</h2>
          <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
            {JSON.stringify(savedContent, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 