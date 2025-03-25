"use client"

import * as React from "react"
import { Editor } from '@tiptap/react'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  Undo, 
  Redo,
  Code,
  Quote,
  Underline,
  Highlighter,
  Type,
  Link as LinkIcon,
  Image as ImageIcon,
  AtSign,
  Minus
} from 'lucide-react'
import { cn } from "../../lib/utils"
import { Button } from "../../components/ui/button"
import { Separator } from "../../components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Input } from "../../components/ui/input"

interface TiptapToolbarProps {
  editor: Editor | null
  className?: string
  onImageUpload?: () => void
}

export function TiptapToolbar({ editor, className, onImageUpload }: TiptapToolbarProps) {
  const [linkUrl, setLinkUrl] = React.useState<string>('')
  const [isLinkOpen, setIsLinkOpen] = React.useState<boolean>(false)

  if (!editor) {
    return null
  }

  const fontFamilies = [
    { name: 'Default', value: 'sans-serif' },
    { name: 'Serif', value: 'serif' },
    { name: 'Mono', value: 'monospace' },
  ]

  const setFontFamily = (fontFamily: string) => {
    editor.chain().focus().setFontFamily(fontFamily).run()
  }

  const colorOptions = [
    { name: 'Black', value: '#000000' },
    { name: 'Gray', value: '#4b5563' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
  ]

  const highlightColors = [
    { name: 'Yellow', value: '#fef9c3' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Purple', value: '#f3e8ff' },
  ]

  const setColor = (color: string) => {
    editor.chain().focus().setColor(color).run()
  }

  const setHighlight = (color: string) => {
    editor.chain().focus().toggleHighlight({ color }).run()
  }

  const setLink = () => {
    // Check if we have a valid URL
    if (linkUrl) {
      // If text is selected, apply link to selection
      editor.chain().focus().setLink({ href: linkUrl }).run()
    } else {
      // If we want to remove a link
      editor.chain().focus().unsetLink().run()
    }
    setIsLinkOpen(false)
    setLinkUrl('')
  }

  const currentLinkAttributes = editor.getAttributes('link')
  
  // Function to upload an image
  const handleImageUpload = () => {
    if (onImageUpload) {
      onImageUpload()
    } else {
      // Fallback if no custom upload handler is provided
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (event) => {
        const target = event.target as HTMLInputElement
        if (target.files?.length) {
          const file = target.files[0]
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            if (result) {
              editor.chain().focus().setImage({ src: result }).run()
            }
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    }
  }

  // Function to add a mention
  const addMention = () => {
    editor.chain().focus().insertContent('@').run()
  }

  return (
    <div className={cn("flex flex-wrap gap-1 p-2 border-b", className)}>
      {/* Text formatting */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent text-accent-foreground' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-accent text-accent-foreground' : ''}
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Headings */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-accent text-accent-foreground' : ''}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent text-accent-foreground' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-accent text-accent-foreground' : ''}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Lists */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Code and quote */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'bg-accent text-accent-foreground' : ''}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-accent text-accent-foreground' : ''}
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Link */}
      <Popover open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <PopoverTrigger asChild>
          <Button 
            type="button"
            variant="ghost"
            size="sm"
            className={editor.isActive('link') ? 'bg-accent text-accent-foreground' : ''}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm">
              Link URL
            </label>
            <Input 
              type="url" 
              placeholder="https://example.com" 
              value={linkUrl} 
              onChange={(e) => setLinkUrl(e.target.value)}
              className="h-8 text-sm"
              defaultValue={currentLinkAttributes.href as string}
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={setLink}
              >
                Save
              </Button>
              {editor.isActive('link') && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run()
                    setIsLinkOpen(false)
                  }}
                >
                  Remove Link
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Image Upload */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleImageUpload}
      >
        <ImageIcon className="h-4 w-4" />
      </Button>

      {/* Horizontal Rule */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </Button>

      {/* Mention */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addMention}
      >
        <AtSign className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-8" />

      {/* Font family */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <Type className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Font</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="flex flex-col space-y-1">
            {fontFamilies.map((font) => (
              <Button
                key={font.value}
                variant="ghost"
                size="sm"
                onClick={() => setFontFamily(font.value)}
                className={cn(
                  'justify-start',
                  editor.isActive('textStyle', { fontFamily: font.value }) && 'bg-accent text-accent-foreground'
                )}
                style={{ fontFamily: font.value }}
              >
                {font.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Color and highlight popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <div 
              className="h-4 w-4 rounded-full border"
              style={{ 
                backgroundColor: editor.getAttributes('textStyle').color || '#000000',
              }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <Tabs defaultValue="color">
            <TabsList className="grid w-full grid-cols-2 mb-2">
              <TabsTrigger value="color">Text Color</TabsTrigger>
              <TabsTrigger value="highlight">Highlight</TabsTrigger>
            </TabsList>
            <TabsContent value="color" className="mt-0">
              <div className="grid grid-cols-3 gap-1">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setColor(color.value)}
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="highlight" className="mt-0">
              <div className="grid grid-cols-3 gap-1">
                {highlightColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setHighlight(color.value)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center"
                    style={{ backgroundColor: color.value }}
                    title={`Highlight ${color.name}`}
                  >
                    <Highlighter className="h-4 w-4 text-gray-600" />
                  </button>
                ))}
                <button
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white"
                  title="Remove highlight"
                >
                  <Highlighter className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-8" />

      {/* Undo/redo */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 