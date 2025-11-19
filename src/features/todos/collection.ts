import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import type { QueryClient } from '@tanstack/react-query'
import { createTodo, deleteTodo, getTodos, toggleTodo } from '~/server/function/todos'
import type { Todo } from './types'
import { todoSchema } from './types'

type TodosCollection = ReturnType<typeof createTodosCollection>

const collectionByQueryClient = new WeakMap<QueryClient, TodosCollection>()

function createTodosCollection(queryClient: QueryClient) {
  return createCollection(
    queryCollectionOptions<Todo>({
      id: 'todos-query-collection',
      queryKey: ['todos'],
      queryFn: async ({ signal }) => await getTodos({ signal }),
      queryClient,
      getKey: (todo) => todo.id,
      schema: todoSchema,
      staleTime: 1000 * 30,
    })
  )
}

export function getTodosCollection(queryClient: QueryClient): TodosCollection {
  const existing = collectionByQueryClient.get(queryClient)
  if (existing) {
    return existing
  }

  const collection = createTodosCollection(queryClient)
  collectionByQueryClient.set(queryClient, collection)
  return collection
}

export async function preloadTodosCollection(queryClient: QueryClient) {
  const collection = getTodosCollection(queryClient)
  await collection.preload()
  return collection
}

export async function createTodoAndSync(queryClient: QueryClient, text: string) {
  const collection = getTodosCollection(queryClient)
  const todo = await createTodo({ data: { text } })
  collection.utils.writeInsert(todo)
  return todo
}

export async function toggleTodoAndSync(queryClient: QueryClient, id: string) {
  const collection = getTodosCollection(queryClient)
  const todo = await toggleTodo({ data: { id } })
  collection.utils.writeUpsert(todo)
  return todo
}

export async function deleteTodoAndSync(queryClient: QueryClient, id: string) {
  const collection = getTodosCollection(queryClient)
  await deleteTodo({ data: { id } })
  collection.utils.writeDelete(id)
}
