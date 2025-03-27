import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ShadcnTodoNodeView } from '../components/ShadcnTodoNodeView';
import { v4 as uuidv4 } from 'uuid';
import { supabase, adminSupabase } from '../../../lib/supabase';
import { toast } from '../../../components/ui/use-toast';
import { PluginKey } from 'prosemirror-state';
import { Editor } from "@tiptap/core";
import { findChildren } from "@tiptap/core";
import { createTodo, updateTodo as updateTodoRecord, deleteTodo } from './todo-service';

// ============================================================================
// TodoExtension - The main extension for todo functionality
// ============================================================================

export interface TodoAttributes {
  id: string;
  content: string;
  completed: boolean;
  assignedTo: string | null;
  projectId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface TodoOptions {
  HTMLAttributes: Record<string, any>;
  onToggle?: (id: string, completed: boolean) => void;
  onUpdate?: (attrs: Partial<TodoAttributes>) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    todo: {
      /**
       * Add a new todo item
       */
      addTodo: (attrs?: Partial<TodoAttributes>) => ReturnType;
      /**
       * Toggle todo completion
       */
      toggleTodo: (completed?: boolean) => ReturnType;
      /**
       * Update todo attributes
       */
      updateTodoAttributes: (attrs: Partial<TodoAttributes>) => ReturnType;
    };
  }
}

// Create a plugin key for todo items
export const todoPluginKey = new PluginKey('todoItem');

export const TodoExtension = Node.create<TodoOptions>({
  name: 'todo',
  group: 'block',
  content: 'inline*',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'shadcn-todo-item',
        version: '2.3',
      },
      onToggle: () => {},
      onUpdate: () => {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: uuidv4(),
      },
      completed: {
        default: false,
      },
      assignedTo: {
        default: null,
      },
      projectId: {
        default: null,
      },
      dueDate: {
        default: null,
      },
      createdAt: {
        default: new Date().toISOString(),
      },
      updatedAt: {
        default: undefined,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="todo-item"]',
        priority: 51,
        getAttrs: (element) => {
          if (typeof element === 'string') {
            return {};
          }
          return {
            id: element.getAttribute('data-id'),
            completed: element.getAttribute('data-completed') === 'true',
            assignedTo: element.getAttribute('data-assigned-to'),
            projectId: element.getAttribute('data-project-id'),
            dueDate: element.getAttribute('data-due-date'),
            createdAt: element.getAttribute('data-created-at'),
            updatedAt: element.getAttribute('data-updated-at'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = {
      ...HTMLAttributes,
      'data-type': 'todo-item',
      'data-id': node.attrs.id,
      'data-completed': node.attrs.completed,
      'data-assigned-to': node.attrs.assignedTo,
      'data-project-id': node.attrs.projectId,
      'data-due-date': node.attrs.dueDate,
      'data-created-at': node.attrs.createdAt,
      'data-updated-at': node.attrs.updatedAt,
    };

    return ['div', attrs, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShadcnTodoNodeView);
  },

  addCommands() {
    return {
      addTodo:
        (attrs = {}) =>
        ({ commands }) => {
          const now = new Date().toISOString();
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: attrs.id || uuidv4(),
              completed: attrs.completed || false,
              projectId: attrs.projectId || null,
              assignedTo: attrs.assignedTo || null,
              dueDate: attrs.dueDate || null,
              createdAt: attrs.createdAt || now,
              updatedAt: attrs.updatedAt || now,
            },
          });
        },

      toggleTodo:
        (completed) =>
        ({ chain, state }) => {
          const { selection } = state;
          const node = state.doc.nodeAt(selection.anchor);
          
          if (node && node.type.name === this.name) {
            const id = node.attrs.id;
            this.options.onToggle?.(id, completed ?? !node.attrs.completed);
            
            return chain()
              .updateAttributes(this.name, { 
                completed: completed ?? !node.attrs.completed,
                updatedAt: new Date().toISOString(),
              })
              .run();
          }
          return false;
        },

      updateTodoAttributes:
        (attrs) =>
        ({ chain }) => {
          const updates = {
            ...attrs,
            updatedAt: new Date().toISOString(),
          };
          
          this.options.onUpdate?.(updates);
          
          return chain()
            .updateAttributes(this.name, updates)
            .run();
        },
    };
  },
});

// ============================================================================
// Todo Sync - For syncing todos with the database
// ============================================================================

export function findTodos(editor: any) {
  const todos: any[] = [];
  
  if (!editor) return todos;

  editor.state.doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'todo') {
      const id = node.attrs.id || uuidv4();
      const completed = !!node.attrs.completed;
      
      // Get the text content
      let content = '';
      node.forEach((childNode: any) => {
        content += childNode.text || '';
      });
      
      todos.push({
        id,
        content,
        completed,
        projectId: node.attrs.projectId,
        assignedTo: node.attrs.assignedTo,
        dueDate: node.attrs.dueDate,
        createdAt: node.attrs.createdAt || new Date().toISOString(),
        updatedAt: node.attrs.updatedAt || new Date().toISOString(),
      });
    }
  });
  
  return todos;
}

let lastSyncTime = 0;
const SYNC_DEBOUNCE_TIME = 1000; // 1 second
let syncInProgress = false;
let syncAttempts = 0;
const MAX_SYNC_ATTEMPTS = 3;
const SYNC_RETRY_DELAY = 2000; // 2 seconds

export function initTodoSync(editor: any, userId: string) {
  if (!editor || !userId) {
    console.error('[todo-extensions] Cannot initialize todo sync: missing editor or userId');
    return null;
  }

  let isDestroyed = false;
  console.log('[todo-extensions] Initializing todo sync with userId:', userId);

  // Reset sync state
  syncInProgress = false;
  syncAttempts = 0;
  lastSyncTime = 0;

  // Initial sync after a small delay to ensure editor is ready
  const initialSyncTimeout = setTimeout(() => {
    if (!isDestroyed) {
      console.log('[todo-extensions] Starting initial sync...');
      syncTodosWithDatabase(editor, userId).catch(error => {
        console.error('[todo-extensions] Error during initial sync:', error);
      });
    }
  }, 100);

  // Set up an interval to sync todos periodically
  const syncInterval = setInterval(() => {
    if (!isDestroyed) {
      syncTodosWithDatabase(editor, userId).catch(error => {
        console.error('[todo-extensions] Error during periodic sync:', error);
        
        // If we've had multiple failures, notify the user
        if (syncAttempts >= MAX_SYNC_ATTEMPTS) {
          toast({
            title: "Sync Warning",
            description: "Having trouble syncing todos. Will retry in a few seconds."
          });
          
          // Reset sync attempts after showing the warning
          syncAttempts = 0;
        }
      });
    }
  }, 5000); // Sync every 5 seconds

  // Return cleanup function
  return () => {
    console.log('[todo-extensions] Cleaning up todo sync...');
    isDestroyed = true;
    clearTimeout(initialSyncTimeout);
    clearInterval(syncInterval);
    
    // Perform one final sync
    if (editor && userId) {
      console.log('[todo-extensions] Performing final sync before cleanup...');
      syncTodosWithDatabase(editor, userId).catch(error => {
        console.error('[todo-extensions] Error during final sync:', error);
      });
    }
  };
}

export async function syncTodosWithDatabase(editor: any, userId: string) {
  if (!editor || !userId) {
    console.error('[todo-extensions] Cannot sync todos: missing editor or userId');
    return;
  }

  if (syncInProgress) {
    console.log('[todo-extensions] Sync already in progress, skipping...');
    return;
  }

  try {
    // Debounce sync operations
    const now = Date.now();
    if (now - lastSyncTime < SYNC_DEBOUNCE_TIME) {
      console.log('[todo-extensions] Debouncing sync operation...');
      return;
    }
    
    lastSyncTime = now;
    syncInProgress = true;
    syncAttempts++;
    
    console.log(`[todo-extensions] Starting sync with userId: ${userId} (attempt ${syncAttempts})`);
    const todos = findTodos(editor);
    console.log(`[todo-extensions] Found ${todos.length} todos to sync`);
    
    let syncErrors = 0;
    let successCount = 0;
    
    for (const todo of todos) {
      try {
        // Check if todo exists
        const { data: existingTodo, error: fetchError } = await supabase
          .from('todos')
          .select('*')
          .eq('id', todo.id)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error(`[todo-extensions] Error fetching todo ${todo.id}:`, fetchError);
          syncErrors++;
          continue;
        }
        
        if (existingTodo) {
          // Update existing todo if it has changed
          if (hasChanged(existingTodo, todo)) {
            console.log(`[todo-extensions] Updating todo ${todo.id}`);
            const { error: updateError } = await supabase
              .from('todos')
              .update({
                content: todo.content,
                completed: todo.completed,
                project_id: todo.projectId,
                assigned_to: todo.assignedTo,
                due_date: todo.dueDate,
                updated_at: todo.updatedAt || new Date().toISOString(),
              })
              .eq('id', todo.id);
              
            if (updateError) {
              console.error(`[todo-extensions] Error updating todo ${todo.id}:`, updateError);
              syncErrors++;
            } else {
              successCount++;
            }
          } else {
            successCount++;
          }
        } else {
          // Create a new todo
          console.log(`[todo-extensions] Creating new todo ${todo.id}`);
          const { error: insertError } = await supabase
            .from('todos')
            .insert([{
              id: todo.id,
              content: todo.content,
              completed: todo.completed,
              project_id: todo.projectId,
              assigned_to: todo.assignedTo,
              due_date: todo.dueDate,
              created_by: userId,
              created_at: todo.createdAt,
              updated_at: todo.updatedAt || todo.createdAt,
            }]);
            
          if (insertError) {
            console.error(`[todo-extensions] Error creating todo ${todo.id}:`, insertError);
            syncErrors++;
          } else {
            successCount++;
          }
        }
      } catch (error) {
        console.error(`[todo-extensions] Error syncing todo ${todo.id}:`, error);
        syncErrors++;
      }
    }

    if (syncErrors > 0) {
      console.warn(`[todo-extensions] ${syncErrors} todos failed to sync, ${successCount} succeeded`);
      
      // If we have consistent failures, we might want to notify the user
      if (syncAttempts >= MAX_SYNC_ATTEMPTS) {
        toast({
          title: "Sync Issues",
          description: `${syncErrors} todos failed to sync. Please check your connection.`
        });
      }
    } else {
      console.log(`[todo-extensions] Successfully synced ${successCount} todos`);
      // Reset sync attempts on successful sync
      syncAttempts = 0;
    }
  } catch (error) {
    console.error('[todo-extensions] Error in syncTodosWithDatabase:', error);
    // Increment sync attempts instead of syncErrors since it's out of scope
    syncAttempts++;
  } finally {
    syncInProgress = false;
  }
}

// Helper function to check if a todo has changed
function hasChanged(existingTodo: any, newTodo: any) {
  return (
    existingTodo.content !== newTodo.content ||
    existingTodo.completed !== newTodo.completed ||
    existingTodo.project_id !== newTodo.projectId ||
    existingTodo.assigned_to !== newTodo.assignedTo ||
    existingTodo.due_date !== newTodo.dueDate
  );
}

// Function to handle todo events from other parts of the application
export function setupExternalTodoEvents(editor: any) {
  const handleExternalTodoUpdate = (event: CustomEvent) => {
    const { id, ...updates } = event.detail;
    if (!id || !editor) return;
    
    let found = false;
    
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'todo' && node.attrs.id === id) {
        found = true;
        editor.chain().focus()
          .setNodeSelection(pos)
          .updateAttributes('todo', { ...updates, updatedAt: new Date().toISOString() })
          .run();
        return false; // Stop traversal
      }
    });
    
    return found;
  };
  
  document.addEventListener('external-todo-update', handleExternalTodoUpdate as EventListener);
  
  return () => {
    document.removeEventListener('external-todo-update', handleExternalTodoUpdate as EventListener);
  };
} 