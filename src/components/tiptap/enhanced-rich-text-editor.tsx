"use client"

import * as React from "react"
import { Editor } from "@tiptap/react"
import { TiptapEditor } from "../ui/tiptap-editor"
import { TiptapToolbar } from "../ui/tiptap-toolbar"
import { cn } from "../../lib/utils"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "../ui/card"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useAuth } from '../../App'
import { supabase } from '../../lib/supabase'
import { toast } from "../ui/use-toast"
import { StarterKit } from '@tiptap/starter-kit'
import { useEditor, EditorContent } from '@tiptap/react'
import { TodoToolbar } from '../../features/todos/components/todo-toolbar'
import { TodoAttachment } from "../../lib/storage-service"
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Heading from '@tiptap/extension-heading'
import CodeBlock from '@tiptap/extension-code-block'
import Blockquote from '@tiptap/extension-blockquote'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import { Extension } from '@tiptap/core'
import Underline from '@tiptap/extension-underline'
import { TodoExtension } from '../../features/todos/lib/todo-extensions'

interface EnhancedRichTextEditorProps {
  className?: string
  value: string
  initialContent?: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
  maxLength?: number
  showCharacterCount?: boolean
  showToolbar?: boolean
  previewMode?: boolean
  hideTitle?: boolean
  onEditorReady?: (editor: Editor) => void
  enableTodos?: boolean
  projectId?: string
  onProjectSelect?: (projectId: string) => void
  initialTitle?: string
  onTitleChange?: (title: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}

/**
 * EnhancedRichTextEditor is a fully controlled component for rich text editing
 * with support for advanced formatting, character count, and preview mode.
 */
export const EnhancedRichTextEditor = React.forwardRef<HTMLDivElement, EnhancedRichTextEditorProps>(
  ({
    value,
    initialContent = '',
    onChange,
    className,
    placeholder = 'Write something...',
    editable = true,
    maxLength = 10000,
    showToolbar = true,
    ...props
  }, ref) => {
    const editor = useEditor({
      extensions: [
        Document,
        Paragraph.configure({
          HTMLAttributes: {
            class: 'mb-2',
          },
        }),
        Text,
        Bold,
        Italic,
        Heading.configure({
          levels: [1, 2, 3],
        }),
        StarterKit.configure({
          document: false,
          paragraph: false,
          text: false,
          bold: false,
          italic: false,
          heading: false,
        }) as Extension,
        ...(props.enableTodos ? [TodoExtension.configure({
          HTMLAttributes: {
            class: 'shadcn-todo-item',
            version: '2.3',
          },
        })] : []),
        Underline,
        Strike,
        Code,
        CodeBlock,
        Blockquote,
      ],
      content: value || initialContent,
      editable,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert focus:outline-none min-h-[200px]',
        },
      },
    })

    const { user } = useAuth()
    const [showPreview, setShowPreview] = React.useState(props.previewMode || false)
    const [title, setTitle] = React.useState(props.initialTitle || "")

    // Update title when initialTitle prop changes
    React.useEffect(() => {
      if (props.initialTitle && props.initialTitle !== title) {
        setTitle(props.initialTitle);
      }
    }, [props.initialTitle]);

    // Handle title changes
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      
      // Call the onTitleChange callback if provided
      if (props.onTitleChange) {
        props.onTitleChange(newTitle);
      }
      
      // Update document title if no parent component is handling it
      if (!props.onTitleChange) {
        if (newTitle) {
          document.title = `${newTitle} - Lucid`;
        } else {
          document.title = 'Untitled Document - Lucid';
        }
      }
    };

    // Update editor content when value prop changes
    React.useEffect(() => {
      if (editor && editor.getHTML() !== initialContent) {
        editor.commands.setContent(initialContent)
      }
    }, [editor, initialContent])

    // Call onEditorReady when editor is initialized
    React.useEffect(() => {
      if (editor && props.onEditorReady) {
        props.onEditorReady(editor)
      }
    }, [editor, props.onEditorReady])

    // Todo event handlers
    const handleTodoUpdate = React.useCallback((todoData: any) => {
      console.log('Todo updated:', todoData)
      // Here you would sync with backend
      toast({
        title: 'Todo updated',
        description: `Completed: ${todoData.completed ? 'Yes' : 'No'}${todoData.assignedTo ? ', Assigned to user' : ''}${todoData.dueDate ? ', Due date set' : ''}`,
      })
    }, [])
    
    const handleTodoAttachment = React.useCallback((attachmentData: any) => {
      console.log('Attachment update:', attachmentData)
      
      toast({
        title: attachmentData.action === 'attach' ? 'File attached' : 'File removed',
        description: attachmentData.action === 'attach' 
          ? `Added "${attachmentData.attachment.displayName}" to todo` 
          : `Removed attachment from todo`,
      })
    }, [])
    
    // Event listener for todo updates
    React.useEffect(() => {
      if (!editor) return
      
      const handleTodoUpdateEvent = (event: CustomEvent) => {
        handleTodoUpdate(event.detail)
      }
      
      window.addEventListener('todo:update', handleTodoUpdateEvent as EventListener)
      
      return () => {
        window.removeEventListener('todo:update', handleTodoUpdateEvent as EventListener)
      }
    }, [editor, handleTodoUpdate])
    
    // Event listener for todo attachments
    React.useEffect(() => {
      if (!editor) return
      
      const handleTodoAttachmentEvent = (event: CustomEvent) => {
        handleTodoAttachment(event.detail)
      }
      
      window.addEventListener('todo:attachment', handleTodoAttachmentEvent as EventListener)
      
      return () => {
        window.removeEventListener('todo:attachment', handleTodoAttachmentEvent as EventListener)
      }
    }, [editor, handleTodoAttachment])

    const handleUpdate = React.useCallback(
      (value: string) => {
        if (value !== initialContent) {
          onChange(value)
        }
      },
      [onChange, initialContent]
    )

    return (
      <div className={cn("", className)} ref={ref} onKeyDown={props.onKeyDown}>
        {props.previewMode && (
          <Tabs defaultValue={showPreview ? "preview" : "edit"} onValueChange={(value: string) => setShowPreview(value === "preview")}>
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
                    dangerouslySetInnerHTML={{ __html: initialContent }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!props.previewMode && renderCard()}
      </div>
    )

    function renderCard() {
      return (
        <Card className="border-none shadow-none bg-transparent h-full flex flex-col">
          {!props.hideTitle && (
            <CardHeader className="px-4 py-3 border-b flex-shrink-0">
              <Input
                placeholder="Document title"
                value={title}
                onChange={handleTitleChange}
                className="border-none p-0 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </CardHeader>
          )}
          
          {props.enableTodos ? (
            <CardContent className="p-0 CardContent flex-grow min-h-[70vh]">
              <div className="glass-effect-editor h-full">
                <div className="prose prose-sm sm:prose max-w-none dark:prose-invert prose-headings:font-semibold h-full flex flex-col">
                  {showToolbar && editor && (
                    <TodoToolbar 
                      editor={editor} 
                      onProjectSelect={props.onProjectSelect}
                      currentProjectId={props.projectId}
                    />
                  )}
                  <EditorContent editor={editor} className="EditorContent flex-grow" />
                </div>
              </div>
            </CardContent>
          ) : (
            <>
              {showToolbar && <TiptapToolbar editor={editor} />}
              <CardContent className="p-0 CardContent flex-grow min-h-[70vh]">
                <div className="prose prose-sm sm:prose max-w-none dark:prose-invert prose-headings:font-semibold h-full flex flex-col">
                  <TiptapEditor
                    initialContent={value || initialContent}
                    onChange={handleUpdate}
                    onMount={(e) => {
                      if (props.onEditorReady) {
                        props.onEditorReady(e);
                      }
                    }}
                    placeholder={placeholder}
                    editable={editable}
                    maxLength={props.showCharacterCount ? maxLength : undefined}
                    className="border-none focus-within:ring-0 focus-within:ring-offset-0 EditorContent flex-grow"
                  />
                </div>
              </CardContent>
            </>
          )}
        </Card>
      )
    }
  }
)

/**
 * Create a document-like editor with title and content
 */
export function DocumentEditor({
  initialValue = '<h2>Getting Started</h2><p>This is a <strong>rich text editor</strong> with support for:</p><ul><li>Rich formatting</li><li>Multiple fonts</li><li>Colors and highlighting</li><li>Todo items with assignees and due dates</li></ul><p>Try it out!</p>',
  initialTitle = "Untitled Document",
  onSave,
  enableTodos = true,
}: {
  initialValue?: string
  initialTitle?: string
  onSave?: (data: { title: string; content: string }) => void
  enableTodos?: boolean
}) {
  const [content, setContent] = React.useState(initialValue)
  const [title, setTitle] = React.useState(initialTitle)
  const [isSaving, setIsSaving] = React.useState(false)

  // Update document title in browser tab when title changes
  React.useEffect(() => {
    if (title) {
      document.title = `${title} - Lucid`;
    } else {
      document.title = 'Untitled Document - Lucid';
    }
  }, [title]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

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
        enableTodos={enableTodos}
        initialTitle={title}
        onTitleChange={handleTitleChange}
      />
    </div>
  )
} 