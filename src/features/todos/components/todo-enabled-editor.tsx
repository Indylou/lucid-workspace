import React from 'react'
import { Editor, useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Extension } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Heading from '@tiptap/extension-heading'
import { TodoToolbar } from './todo-toolbar'
import { TodoExtension } from '../lib/todo-extensions'

interface TodoEnabledEditorProps {
  initialContent?: string
  onChange?: (html: string) => void
  className?: string
  placeholder?: string
  editable?: boolean
  maxLength?: number
  showToolbar?: boolean
  projectId?: string
  documentId?: string
  currentUser?: string
  onEditorReady?: (editor: Editor) => void
  onTodoUpdate?: (attrs: any) => void
  onTodoAttachment?: (data: any) => void
}

export const TodoEnabledEditor = React.forwardRef<HTMLDivElement, TodoEnabledEditorProps>(
  ({
    initialContent = '',
    onChange,
    className,
    placeholder = 'Write something...',
    editable = true,
    maxLength = 10000,
    showToolbar = true,
    projectId,
    documentId,
    currentUser,
    onEditorReady,
    onTodoUpdate,
    onTodoAttachment,
    ...props
  }, ref) => {
    const editor = useEditor({
      extensions: [
        Document.configure({
          content: 'block+',
        }),
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
        TodoExtension.configure({
          HTMLAttributes: {
            class: 'shadcn-todo-item',
            version: '2.3',
          },
          onToggle: (id, completed) => {
            if (onTodoUpdate) {
              onTodoUpdate({ id, completed });
            }
          },
          onUpdate: (attrs) => {
            if (onTodoUpdate) {
              onTodoUpdate(attrs);
            }
          }
        }),
      ],
      content: initialContent,
      editable,
      onUpdate: ({ editor }) => {
        try {
          const html = editor.getHTML();
          onChange?.(html);
        } catch (error) {
          console.error('Error getting HTML:', error);
        }
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert focus:outline-none min-h-[200px]',
        },
        handleDOMEvents: {
          keydown: (view, event) => {
            // Handle Enter key to create new todo
            if (event.key === 'Enter' && !event.shiftKey) {
              const { state } = view;
              const { selection } = state;
              const node = selection.$head.node();
              
              if (node.type.name === 'todo' && editor) {
                event.preventDefault();
                editor.commands.addTodo();
                return true;
              }
            }
            return false;
          },
        },
      },
    });

    React.useEffect(() => {
      if (editor && onEditorReady) {
        onEditorReady(editor);
      }
    }, [editor, onEditorReady]);

    return (
      <div className={className} ref={ref}>
        {showToolbar && editor && <TodoToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    );
  }
); 