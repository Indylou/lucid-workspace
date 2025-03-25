"use client"

import * as React from "react"
import { Editor } from "@tiptap/react"
import { TiptapEditor } from "../ui/tiptap-editor"
import { TiptapToolbar } from "../ui/tiptap-toolbar"
import { cn } from "../../lib/utils"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../ui/card"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

interface EnhancedRichTextEditorProps {
  className?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
  maxLength?: number
  showCharacterCount?: boolean
  showToolbar?: boolean
  previewMode?: boolean
}

/**
 * EnhancedRichTextEditor is a fully controlled component for rich text editing
 * with support for advanced formatting, character count, and preview mode.
 */
export function EnhancedRichTextEditor({
  className,
  value,
  onChange,
  placeholder = "Write something amazing...",
  editable = true,
  maxLength = 10000,
  showCharacterCount = true,
  showToolbar = true,
  previewMode = false,
}: EnhancedRichTextEditorProps) {
  const [editor, setEditor] = React.useState<Editor | null>(null)
  const [showPreview, setShowPreview] = React.useState(previewMode)
  const [title, setTitle] = React.useState("")

  // Update editor content when value prop changes
  React.useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  const handleUpdate = React.useCallback(
    (html: string) => {
      if (html !== value) {
        onChange(html)
      }
    },
    [onChange, value]
  )

  return (
    <div className={cn("", className)}>
      {previewMode && (
        <Tabs defaultValue={showPreview ? "preview" : "edit"} onValueChange={(value) => setShowPreview(value === "preview")}>
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-0">
            {renderCard()}
          </TabsContent>
          <TabsContent value="preview" className="mt-0">
            <Card>
              {title && (
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
              )}
              <CardContent>
                <div 
                  className="prose prose-sm sm:prose max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-blue-500" 
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!previewMode && renderCard()}
    </div>
  )

  function renderCard() {
    return (
      <Card className="border rounded-md overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <Input
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-none p-0 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </CardHeader>
        {showToolbar && <TiptapToolbar editor={editor} />}
        <CardContent className="p-0">
          <div className="prose prose-sm sm:prose max-w-none dark:prose-invert prose-headings:font-semibold">
            <TiptapEditor
              initialContent={value}
              onChange={handleUpdate}
              onMount={setEditor}
              placeholder={placeholder}
              editable={editable}
              maxLength={showCharacterCount ? maxLength : undefined}
              className="border-none focus-within:ring-0 focus-within:ring-offset-0"
            />
          </div>
        </CardContent>
      </Card>
    )
  }
}

/**
 * Create a document-like editor with title and content
 */
export function DocumentEditor({
  initialValue = '<h2>Getting Started</h2><p>This is a <strong>rich text editor</strong> with support for:</p><ul><li>Rich formatting</li><li>Multiple fonts</li><li>Colors and highlighting</li></ul><p>Try it out!</p>',
  onSave,
}: {
  initialValue?: string
  onSave?: (data: { title: string; content: string }) => void
}) {
  const [content, setContent] = React.useState(initialValue)
  const [title, setTitle] = React.useState("Untitled Document")
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = () => {
    if (onSave) {
      setIsSaving(true)
      // Simulate API call
      setTimeout(() => {
        onSave({ title, content })
        setIsSaving(false)
      }, 1000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input 
            id="title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="w-full md:w-[400px]"
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
      <EnhancedRichTextEditor 
        value={content} 
        onChange={setContent}
        previewMode={true}
      />
    </div>
  )
} 