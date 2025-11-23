import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import type { Todo } from '~/features/todos/types'

function createTodoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `todo_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

const todosCollection = createCollection(
  localOnlyCollectionOptions<Todo>({
    id: 'todos-store',
    getKey: (todo) => todo.id,
  }),
)

export async function listTodos(): Promise<Todo[]> {
  return todosCollection.toArray
}

export async function addTodo(text: string): Promise<Todo> {
  const record: Todo = {
    id: createTodoId(),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  }
  await todosCollection.insert(record)
  return record
}

export async function toggleTodoRecord(id: string): Promise<Todo> {
  const existing = todosCollection.get(id)
  if (!existing) {
    throw new Error('Todo not found')
  }
  await todosCollection.update(id, (draft) => {
    draft.completed = !draft.completed
  })
  const updated = todosCollection.get(id)
  if (!updated) {
    throw new Error('Todo not found')
  }
  return updated
}

export async function deleteTodoRecord(id: string) {
  const existing = todosCollection.get(id)
  if (!existing) {
    throw new Error('Todo not found')
  }
  await todosCollection.delete(id)
}

export function getTodosCollection() {
  return todosCollection
}
