import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTodoAndSync,
  deleteTodoAndSync,
  preloadTodosCollection,
  toggleTodoAndSync,
} from '~/features/todos/collection'
import type { Todo } from '~/features/todos/types'

const remoteState = vi.hoisted(() => ({ todos: [] as Todo[] }))

vi.mock('~/server/function/todos', () => {
  return {
    getTodos: vi.fn(async () => remoteState.todos),
    createTodo: vi.fn(async ({ data }: { data: { text: string } }) => {
      const todo: Todo = {
        id: `todo-${remoteState.todos.length + 1}`,
        text: data.text,
        completed: false,
        createdAt: new Date().toISOString(),
      }
      remoteState.todos.push(todo)
      return todo
    }),
    toggleTodo: vi.fn(async ({ data }: { data: { id: string } }) => {
      const todo = remoteState.todos.find((t) => t.id === data.id)
      if (!todo) {
        throw new Error('Todo not found')
      }
      todo.completed = !todo.completed
      return { ...todo }
    }),
    deleteTodo: vi.fn(async ({ data }: { data: { id: string } }) => {
      remoteState.todos = remoteState.todos.filter((todo) => todo.id !== data.id)
      return { success: true }
    }),
  }
})

describe('todos query collection integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    remoteState.todos = []
    queryClient = new QueryClient()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('preloads and mutates via direct writes', async () => {
    const collection = await preloadTodosCollection(queryClient)
    expect(collection.toArray).toHaveLength(0)

    await createTodoAndSync(queryClient, 'One')
    expect(collection.toArray).toHaveLength(1)

    const createdId = collection.toArray[0]?.id as string
    await toggleTodoAndSync(queryClient, createdId)
    expect(collection.get(createdId)?.completed).toBe(true)

    await deleteTodoAndSync(queryClient, createdId)
    expect(collection.toArray).toHaveLength(0)
  })
})
