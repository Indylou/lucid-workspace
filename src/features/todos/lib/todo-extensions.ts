import { Node, Editor } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { v4 as uuidv4 } from 'uuid';
import { TodoItem } from '../../../types/todo';
import { ShadcnTodoNodeView } from '../components/ShadcnTodoNodeView';
import { mergeAttributes } from '@tiptap/core';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../components/ui/use-toast';

// ============================================================================
// TodoExtension - The main extension for todo functionality
// ============================================================================

export interface TodoAttributes extends Omit<TodoItem, 'updatedAt'> {
  updatedAt?: string;
}

export interface TodoOptions {
  HTMLAttributes: Record<string, any>;
  onToggle?: (id: string, completed: boolean) => void;
  onUpdate?: (id: string, attributes: Record<string, any>) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    todo: {
      setTodo: (attributes?: { id?: string }) => ReturnType;
      toggleTodo: () => ReturnType;
      unsetTodo: () => ReturnType;
      addTodo: (attributes?: { id?: string }) => ReturnType;
    };
  }
}

export const TodoExtension = Node.create<TodoOptions>({
  name: 'todo',
  
  addOptions() {
    return {
      HTMLAttributes: {},
      onToggle: undefined,
      onUpdate: undefined,
    };
  },

  group: 'block',
  content: 'inline*',
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: () => uuidv4(),
      },
      completed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-completed') === 'true',
        renderHTML: (attributes) => ({
          'data-completed': attributes.completed,
        }),
      },
      assignedTo: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-assigned-to'),
        renderHTML: (attributes) => ({
          'data-assigned-to': attributes.assignedTo,
        }),
      },
      projectId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-project-id'),
        renderHTML: (attributes) => ({
          'data-project-id': attributes.projectId,
        }),
      },
      dueDate: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-due-date'),
        renderHTML: (attributes) => ({
          'data-due-date': attributes.dueDate,
        }),
      },
      createdAt: {
        default: () => new Date().toISOString(),
        parseHTML: (element) => element.getAttribute('data-created-at'),
        renderHTML: (attributes) => ({
          'data-created-at': attributes.createdAt,
        }),
      },
      updatedAt: {
        default: () => new Date().toISOString(),
        parseHTML: (element) => element.getAttribute('data-updated-at'),
        renderHTML: (attributes) => ({
          'data-updated-at': attributes.updatedAt,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="todo"]',
        priority: 51,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'todo' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShadcnTodoNodeView);
  },

  addCommands() {
    return {
      setTodo:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes);
        },
      toggleTodo:
        () =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph');
        },
      unsetTodo:
        () =>
        ({ commands }) => {
          return commands.setNode('paragraph');
        },
      addTodo:
        (attributes = {}) =>
        ({ chain }) => {
          const now = new Date().toISOString();
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                id: attributes.id || uuidv4(),
                completed: false,
                createdAt: now,
                updatedAt: now,
                ...attributes,
              },
            })
            .run();
        },
    };
  },
});

// ============================================================================
// Todo Sync - For syncing todos with the database
// ============================================================================

export function findTodos(editor: Editor): TodoAttributes[] {
  const todos: TodoAttributes[] = [];
  
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
        status: node.attrs.status,
        priority: node.attrs.priority,
        tags: node.attrs.tags,
        description: node.attrs.description,
        commentsCount: node.attrs.commentsCount || 0
      });
    }
  });
  
  return todos;
}

let lastSyncTime = 0;
const SYNC_DEBOUNCE_TIME = 3000; // 3 seconds
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
      startSyncProcess(editor, userId);
    }
  }, 1000);

  // Set up an update handler
  const updateHandler = () => {
    if (!isDestroyed) {
      startSyncProcess(editor, userId);
    }
  };

  // Add the update handler to the editor
  editor.on('update', updateHandler);

  // Return a cleanup function
  return () => {
    isDestroyed = true;
    clearTimeout(initialSyncTimeout);
    editor.off('update', updateHandler);
  };
}

function startSyncProcess(editor: any, userId: string) {
  if (syncInProgress || !editor || !userId) {
    return;
  }
  
  // Debounce sync calls
  const now = Date.now();
  if (now - lastSyncTime < SYNC_DEBOUNCE_TIME) {
    return;
  }
  
  lastSyncTime = now;
  syncInProgress = true;
  syncAttempts++;
  
  console.log(`[todo-extensions] Starting sync with userId: ${userId} (attempt ${syncAttempts})`);
  
  // Use setTimeout to defer the sync to avoid React rendering issues
  setTimeout(() => {
    syncTodosWithDatabase(editor, userId)
      .then(() => {
        syncInProgress = false;
        syncAttempts = 0;
      })
      .catch((error) => {
        console.error('[todo-extensions] Error during sync:', error);
        syncInProgress = false;
        
        // Retry sync if under max attempts
        if (syncAttempts < MAX_SYNC_ATTEMPTS) {
          setTimeout(() => {
            startSyncProcess(editor, userId);
          }, SYNC_RETRY_DELAY);
        } else {
          console.error(`[todo-extensions] Max sync attempts (${MAX_SYNC_ATTEMPTS}) reached. Giving up.`);
          syncAttempts = 0;
        }
      });
  }, 0);
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
    syncAttempts++;
  } finally {
    syncInProgress = false;
  }
}

// Helper function to check if a todo has changed
function hasChanged(existingTodo: TodoAttributes, newTodo: Partial<TodoAttributes>): boolean {
  return Object.entries(newTodo).some(([key, value]) => {
    if (key === 'updatedAt') return false; // Ignore updatedAt field
    return existingTodo[key as keyof TodoAttributes] !== value;
  });
} 