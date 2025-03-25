"use client"

import * as React from "react"
import { Editor } from "@tiptap/react"
import { TiptapEditor } from "../ui/tiptap-editor"
import { TiptapToolbar } from "../ui/tiptap-toolbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"

// Sample mentions data
const mentionSuggestions = [
  { id: '1', name: 'John Doe', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: '2', name: 'Jane Smith', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
  { id: '3', name: 'Robert Johnson', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
  { id: '4', name: 'Emily Davis', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { id: '5', name: 'Michael Wilson', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
]

export function RichTextExample() {
  const [content, setContent] = React.useState<string>('<p>Welcome to the <strong>Tiptap</strong> rich text editor demo!</p><p>This editor includes the following features:</p><ul><li>Basic text formatting (bold, italic, underline)</li><li>Headings (H1, H2, H3)</li><li>Lists (bullet and ordered)</li><li>Links</li><li>Images</li><li>Mentions</li><li>Horizontal rule</li><li>Font family & colors</li></ul><p>Try out all the features using the toolbar above!</p>')
  const [editor, setEditor] = React.useState<Editor | null>(null)

  const handleImageUpload = () => {
    // Create a file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    // Handle file selection
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement
      if (target.files?.length) {
        const file = target.files[0]
        const reader = new FileReader()
        
        reader.onload = (e) => {
          const result = e.target?.result as string
          if (result && editor) {
            // Insert the image
            editor.chain().focus().setImage({ src: result }).run()
          }
        }
        
        reader.readAsDataURL(file)
      }
    }
    
    // Trigger file selection dialog
    input.click()
  }

  const handleSave = () => {
    if (editor) {
      // Get HTML content
      const html = editor.getHTML()
      console.log('HTML Content:', html)
      
      // Get JSON content
      const json = editor.getJSON()
      console.log('JSON Content:', json)
      
      // Show alert with HTML content for demo purposes
      alert('Content saved! Check the console for HTML and JSON output.')
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Rich Text Editor</CardTitle>
        <CardDescription>A full-featured WYSIWYG editor powered by Tiptap</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden">
          <TiptapToolbar 
            editor={editor}
            onImageUpload={handleImageUpload}
          />
          <TiptapEditor
            initialContent={content}
            onChange={(html) => setContent(html)}
            onMount={setEditor}
            editable={true}
            className="min-h-[300px] p-4"
            mentions={mentionSuggestions}
            imageUploadHandler={handleImageUpload}
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSave}>Save Content</Button>
        </div>
      </CardContent>
    </Card>
  )
} 