export interface TodoItem {
  id: string;
  content: string;
  description?: string;
  completed: boolean;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  dueDate: string | null;
  assignedTo: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  commentsCount?: number;
}

export interface Comment {
  id: string;
  todoId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    avatar?: string;
  };
} 