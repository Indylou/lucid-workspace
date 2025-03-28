// This file will export utilities specific to todos
// Currently empty, but will be expanded as needed

// Export utility functions and types for the todos feature
export type { TodoItem } from '../../../types/todo';
export { getUserTodos, getProjectTodos, createTodo, updateTodo } from '../lib/todo-service';

export {}; 