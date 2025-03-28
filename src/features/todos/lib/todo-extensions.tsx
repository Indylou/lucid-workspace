import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { v4 as uuidv4 } from 'uuid';
import { TodoItem } from '../../../types/todo';

export interface TodoAttributes extends Omit<TodoItem, 'updatedAt'> {
  updatedAt?: string;
}

export interface TodoOptions {
  HTMLAttributes: Record<string, any>;
  onToggle?: (id: string, completed: boolean) => void;
  onUpdate?: (attrs: Partial<TodoAttributes>) => void;
}

export const TodoExtension = Node.create<TodoOptions>({
  name: 'todo',
  group: 'block',
  content: 'inline*',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'todo-item',
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
      description: {
        default: null,
      },
      priority: {
        default: null,
      },
      status: {
        default: null,
      },
      tags: {
        default: null,
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
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', {
      ...HTMLAttributes,
      'data-type': 'todo-item',
      class: 'todo-item'
    }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TodoNodeView);
  },
}); 