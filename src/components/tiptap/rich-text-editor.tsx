"use client"

import * as React from "react"
import { Editor } from "@tiptap/react"
import { TiptapEditor } from "../ui/tiptap-editor"
import { TiptapToolbar } from "../ui/tiptap-toolbar"
import { cn } from "../../lib/utils"

interface RichTextEditorProps {
  className?: string
  initialContent?: string
  placeholder?: string
  editable?: boolean
  onChange?: (html: string) => void
}

export function RichTextEditor({
  className,
  initialContent = "",
  placeholder = "Write something amazing...",
  editable = true,
  onChange,
}: RichTextEditorProps) {
  const [content, setContent] = React.useState(initialContent)
  const [editor, setEditor] = React.useState<Editor | null>(null)

  const handleUpdate = React.useCallback(
    (html: string) => {
      setContent(html)
      onChange?.(html)
    },
    [onChange]
  )

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <TiptapToolbar editor={editor} />
      <TiptapEditor
        initialContent={content}
        onChange={handleUpdate}
        onMount={setEditor}
        placeholder={placeholder}
        editable={editable}
      />
    </div>
  )
}

// Export a controlled version of the editor that allows direct content manipulation
export function ControlledRichTextEditor({
  className,
  value = "",
  placeholder = "Write something amazing...",
  editable = true,
  onChange,
}: {
  className?: string
  value?: string
  placeholder?: string
  editable?: boolean
  onChange?: (html: string) => void
}) {
  const [editor, setEditor] = React.useState<Editor | null>(null)

  // Update editor content when value prop changes
  React.useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  const handleUpdate = React.useCallback(
    (html: string) => {
      onChange?.(html)
    },
    [onChange]
  )

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <TiptapToolbar editor={editor} />
      <TiptapEditor
        initialContent={value}
        onChange={handleUpdate}
        onMount={setEditor}
        placeholder={placeholder}
        editable={editable}
      />
    </div>
  )
} 