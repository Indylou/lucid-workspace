export interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  dueDate: string | null;
  assignedTo: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
} 