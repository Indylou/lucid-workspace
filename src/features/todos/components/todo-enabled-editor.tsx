import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TodoExtension } from '../lib/todo-extensions';
import { useAuth } from '../../../App';
import { getUserProjects } from '../../../lib/project-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { cn } from '../../../lib/utils';

interface Project {
  id: string;
  name: string;
}

interface TodoEnabledEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

export function TodoEnabledEditor({ content, onChange, className }: TodoEnabledEditorProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');

  useEffect(() => {
    async function fetchProjects() {
      if (!user) return;
      const { projects: userProjects } = await getUserProjects(user.id);
      setProjects(userProjects);
    }
    fetchProjects();
  }, [user]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem,
      TodoExtension.configure({
        HTMLAttributes: {
          class: 'todo-item',
        },
        onToggle: (id: string, completed: boolean) => {
          // Handle todo toggle
          console.log('Todo toggled:', id, completed);
        },
        onUpdate: (attrs) => {
          // Handle todo update
          console.log('Todo updated:', attrs);
        }
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
          className
        ),
      },
      handleKeyDown: (view, event) => {
        // Handle Enter key to create new todos
        if (event.key === 'Enter' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          
          // Check if we're in a todo list
          const node = $from.node();
          if (node.type.name === 'todo') {
            // Create a new todo item
            view.dispatch(
              view.state.tr.split(selection.$from.pos).scrollIntoView()
            );
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-64">
          <Label htmlFor="project">Project</Label>
          <Select
            value={selectedProject}
            onValueChange={setSelectedProject}
          >
            <SelectTrigger id="project">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <style>
        {`
          .ProseMirror {
            min-height: 200px;
            padding: 1rem;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
          }

          .ProseMirror:focus {
            outline: none;
            border-color: #6366f1;
          }

          .ProseMirror p {
            margin: 1em 0;
            line-height: 1.5;
          }

          .ProseMirror p:first-child {
            margin-top: 0;
          }

          .ProseMirror p:last-child {
            margin-bottom: 0;
          }

          .todo-wrapper {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            margin: 0.5rem 0;
            padding: 0.25rem 0;
          }

          .todo-wrapper p {
            margin: 0;
          }

          .todo-checkbox {
            flex-shrink: 0;
            padding-top: 0.125rem;
          }

          .todo-content {
            flex: 1;
            min-width: 0;
            padding-top: 0.125rem;
          }

          .todo-content > * {
            display: inline;
          }
        `}
      </style>

      <EditorContent editor={editor} />
    </div>
  );
} 