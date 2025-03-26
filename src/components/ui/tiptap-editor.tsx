"use client"

import * as React from "react"
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Extension } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Mention from '@tiptap/extension-mention'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { cn } from "../../lib/utils"

export interface TiptapEditorProps {
  initialContent?: string
  onChange?: (html: string) => void
  className?: string
  placeholder?: string
  editable?: boolean
  maxLength?: number
  mentions?: Array<{ id: string; name: string; avatar?: string }>
  imageUploadHandler?: () => void
  onMount?: (editor: Editor) => void
}

export const TiptapEditor = React.forwardRef<HTMLDivElement, TiptapEditorProps>(
  ({ initialContent = '', onChange, className, placeholder = 'Write something...', editable = true, maxLength = 10000, mentions = [], imageUploadHandler, onMount, ...props }, ref) => {
    // Create a custom mention suggestion handler
    const mentionSuggestion = {
      items: ({ query }: { query: string }) => {
        return mentions
          .filter(user => user.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5)
      },
      render: () => {
        let popup: HTMLElement

        return {
          onStart: (props: any) => {
            // Create the popup element
            popup = document.createElement('div')
            popup.classList.add('mention-suggestion')
            popup.style.cssText = 'position: absolute; z-index: 50; background: white; border: 1px solid #eee; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;'
            
            // Render the component with the suggestions
            document.body.appendChild(popup)
            
            // Append suggestion items
            props.items.forEach((item: any, index: number) => {
              const suggestionItem = document.createElement('div')
              suggestionItem.classList.add('mention-suggestion-item')
              suggestionItem.style.cssText = 'padding: 0.5rem 1rem; display: flex; align-items: center; cursor: pointer; user-select: none; transition: background 0.2s ease;'
              suggestionItem.onmouseover = () => { suggestionItem.style.background = '#f3f4f6' }
              suggestionItem.onmouseout = () => { suggestionItem.style.background = 'white' }
              suggestionItem.onclick = () => props.command(item)
              
              if (index === props.selectedIndex) {
                suggestionItem.style.background = '#f3f4f6'
              }
              
              // Add avatar if available
              if (item.avatar) {
                const avatar = document.createElement('img')
                avatar.src = item.avatar
                avatar.alt = item.name
                avatar.style.cssText = 'width: 1.5rem; height: 1.5rem; border-radius: 9999px; margin-right: 0.5rem; object-fit: cover;'
                suggestionItem.appendChild(avatar)
              } else {
                const avatarFallback = document.createElement('div')
                avatarFallback.style.cssText = 'width: 1.5rem; height: 1.5rem; border-radius: 9999px; margin-right: 0.5rem; background-color: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 0.75rem;'
                avatarFallback.textContent = item.name.charAt(0).toUpperCase()
                suggestionItem.appendChild(avatarFallback)
              }
              
              // Add name
              const name = document.createElement('span')
              name.textContent = item.name
              suggestionItem.appendChild(name)
              
              popup.appendChild(suggestionItem)
            })
            
            // Position the popup near the cursor
            const { view } = props
            const { top, left } = view.coordsAtPos(props.clientRect.pos)
            
            popup.style.top = `${top + 20}px`
            popup.style.left = `${left}px`
          },
          onUpdate: (props: any) => {
            // Clear the popup
            while (popup.firstChild) {
              popup.removeChild(popup.firstChild)
            }
            
            // Append updated suggestion items
            props.items.forEach((item: any, index: number) => {
              const suggestionItem = document.createElement('div')
              suggestionItem.classList.add('mention-suggestion-item')
              suggestionItem.style.cssText = 'padding: 0.5rem 1rem; display: flex; align-items: center; cursor: pointer; user-select: none; transition: background 0.2s ease;'
              suggestionItem.onmouseover = () => { suggestionItem.style.background = '#f3f4f6' }
              suggestionItem.onmouseout = () => { suggestionItem.style.background = 'white' }
              suggestionItem.onclick = () => props.command(item)
              
              if (index === props.selectedIndex) {
                suggestionItem.style.background = '#f3f4f6'
              }
              
              // Add avatar if available
              if (item.avatar) {
                const avatar = document.createElement('img')
                avatar.src = item.avatar
                avatar.alt = item.name
                avatar.style.cssText = 'width: 1.5rem; height: 1.5rem; border-radius: 9999px; margin-right: 0.5rem; object-fit: cover;'
                suggestionItem.appendChild(avatar)
              } else {
                const avatarFallback = document.createElement('div')
                avatarFallback.style.cssText = 'width: 1.5rem; height: 1.5rem; border-radius: 9999px; margin-right: 0.5rem; background-color: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 0.75rem;'
                avatarFallback.textContent = item.name.charAt(0).toUpperCase()
                suggestionItem.appendChild(avatarFallback)
              }
              
              // Add name
              const name = document.createElement('span')
              name.textContent = item.name
              suggestionItem.appendChild(name)
              
              popup.appendChild(suggestionItem)
            })
            
            // Position the popup near the cursor
            const { view } = props
            const { top, left } = view.coordsAtPos(props.clientRect.pos)
            
            popup.style.top = `${top + 20}px`
            popup.style.left = `${left}px`
          },
          onKeyDown: (props: any) => {
            if (props.event.key === 'Escape') {
              props.event.preventDefault()
              props.event.stopPropagation()
              return true
            }
            
            return false
          },
          onExit: () => {
            if (popup && popup.parentNode) {
              popup.parentNode.removeChild(popup)
            }
          },
        }
      },
    }

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          bulletList: {
            keepMarks: true,
            keepAttributes: true,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: true,
          },
          horizontalRule: false,
        }) as Extension,
        Image,
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          validate: href => /^https?:\/\//.test(href),
        }),
        Underline,
        TextStyle,
        FontFamily,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          suggestion: mentionSuggestion,
        }),
        HorizontalRule,
      ],
      content: initialContent,
      editable,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: cn('prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert focus:outline-none w-full max-w-full', className),
          spellcheck: 'false',
        },
      },
    })

    // Call onMount when editor is initialized
    React.useEffect(() => {
      if (editor && onMount) {
        onMount(editor)
      }
    }, [editor, onMount])

    // Handle image upload
    React.useEffect(() => {
      if (editor && imageUploadHandler) {
        // We're just going to use the handler directly from the toolbar
        // rather than adding a custom command to the editor
      }
    }, [editor, imageUploadHandler])

    return (
      <div 
        className={cn('tiptap-editor relative', className)}
        data-placeholder={placeholder}
        ref={ref}
        {...props}
      >
        <EditorContent editor={editor} />
      </div>
    )
  }
)
TiptapEditor.displayName = "TiptapEditor" 