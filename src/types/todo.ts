export interface TodoItem {
  id: string;
  content: string;
  description: string | null;
  completed: boolean;
  status: 'todo' | 'in-progress' | 'review' | 'done' | null;
  priority: 'low' | 'medium' | 'high' | null;
  tags: string[] | null;
  dueDate: string | null;
  assignedTo: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  commentsCount: number | null;
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