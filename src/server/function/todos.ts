import { createServerFn } from '@tanstack/react-start';
import { logError, logInfo } from '~/lib/logger';
import {
  addTodo,
  deleteTodoRecord,
  listTodos,
  toggleTodoRecord,
} from '~/server/persistence/todosStore';
import { createTodoInputSchema, todoIdSchema } from '~/features/todos/types';

export const getTodos = createServerFn({ method: 'GET' }).handler(async () => {
  logInfo('todos.fn', 'Fetching todos');
  const todos = await listTodos();
  logInfo('todos.fn', 'Fetched todos', { count: todos.length });
  return todos;
});

export const createTodo = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => createTodoInputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      logInfo('todos.fn', 'Creating todo');
      const todo = await addTodo(data.text);
      logInfo('todos.fn', 'Created todo', { id: todo.id });
      return todo;
    } catch (error) {
      logError('todos.fn', 'Failed to create todo', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  });

export const toggleTodo = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => todoIdSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      logInfo('todos.fn', 'Toggling todo', { id: data.id });
      const todo = await toggleTodoRecord(data.id);
      logInfo('todos.fn', 'Toggled todo', { id: data.id, completed: todo.completed });
      return todo;
    } catch (error) {
      logError('todos.fn', 'Failed to toggle todo', {
        id: data.id,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  });

export const deleteTodo = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => todoIdSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      logInfo('todos.fn', 'Deleting todo', { id: data.id });
      await deleteTodoRecord(data.id);
      logInfo('todos.fn', 'Deleted todo', { id: data.id });
      return { success: true };
    } catch (error) {
      logError('todos.fn', 'Failed to delete todo', {
        id: data.id,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  });
