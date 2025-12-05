import { createFileRoute } from '@tanstack/react-router';
import GradientOrb from '~/components/gradient-orb';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { Button } from '~/components/ui/button';
import { toast } from 'sonner';
import { logInfo } from '~/lib/logger';
import { NeuralGlow } from '~/components/ui/neural-glow';
import {
  createTodoAndSync,
  deleteTodoAndSync,
  getTodosCollection,
  preloadTodosCollection,
  toggleTodoAndSync,
} from '~/features/todos/collection';
import type { Todo } from '~/features/todos/types';




export const Route = createFileRoute('/(site)/todo/')({
  loader: async (opts) => {
    await preloadTodosCollection(opts.context.queryClient);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const todosCollection = getTodosCollection(queryClient);
  const todosResult = useLiveSuspenseQuery(todosCollection);
  const todos = (todosResult.data ?? []) as Todo[];

  const createTodoMutation = useMutation({
    mutationFn: async (text: string) => await createTodoAndSync(queryClient, text),
    onSuccess: () => {
      toast.success('Todo created successfully!');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create todo');
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async (id: string) => await toggleTodoAndSync(queryClient, id),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle todo');
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => await deleteTodoAndSync(queryClient, id),
    onSuccess: () => {
      toast.success('Todo deleted successfully!');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete todo');
    },
  });

  // Todo input state
  const [newTodoText, setNewTodoText] = useState('');

  const handleCreateTodo = () => {
    if (!newTodoText.trim()) {
      toast.error('Todo text cannot be empty');
      return;
    }
    const text = newTodoText.trim();
    logInfo('todos.ui', 'Create requested', { textLength: text.length });
    createTodoMutation.mutate(text, {
      onSuccess: () => setNewTodoText(''),
    });
  };

  const handleToggleTodo = (id: string) => {
    logInfo('todos.ui', 'Toggle requested', { id });
    toggleTodoMutation.mutate(id);
  };

  const handleDeleteTodo = (id: string) => {
    logInfo('todos.ui', 'Delete requested', { id });
    deleteTodoMutation.mutate(id);
  };

  return (
    <NeuralGlow variant="background" className="overflow-hidden">
      <main className="container relative z-0 mx-auto flex flex-col items-center px-4 pt-20 text-center md:pt-32">
        <GradientOrb className="-translate-x-1/2 absolute top-0 left-1/2 z-[-1] transform" />

        <h1 className="max-w-4xl font-medium text-4xl text-foreground md:text-6xl lg:text-7xl">
          Todo List
        </h1>

        <p className="mt-6 text-lg text-muted-foreground md:text-xl">
          The perfect starting point for your next web application
        </p>

        <p className="mt-4 text-muted-foreground text-xs uppercase tracking-wider">
          add todos here
        </p>

        {/* Todo List Section */}
        <div className="mt-12 w-full max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Todos (Server Functions + TanStack Query)</h2>
            <Button onClick={() => todosCollection.utils.refetch()} size="sm">
              Refresh
            </Button>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTodo()}
              placeholder="Add todo..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={createTodoMutation.isPending}
            />
            <Button
              onClick={handleCreateTodo}
              disabled={createTodoMutation.isPending || !newTodoText.trim()}
            >
              {createTodoMutation.isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No todos yet. Add one above!</p>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 rounded-md border border-border p-3"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo.id)}
                    disabled={
                      toggleTodoMutation.isPending ||
                      deleteTodoMutation.isPending ||
                      createTodoMutation.isPending
                    }
                    className="rounded"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      todo.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {todo.text}
                  </span>
                  <Button
                    onClick={() => handleDeleteTodo(todo.id)}
                    disabled={
                      toggleTodoMutation.isPending ||
                      deleteTodoMutation.isPending ||
                      createTodoMutation.isPending
                    }
                    variant="destructive"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </NeuralGlow>
  );
}
