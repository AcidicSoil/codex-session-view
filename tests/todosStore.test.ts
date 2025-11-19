import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('todosStore', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  it('creates and toggles todos in TanStack DB collection', async () => {
    const store = await import('~/server/persistence/todosStore')
    const created = await store.addTodo('First todo')
    expect(created.completed).toBe(false)

    const list = await store.listTodos()
    expect(list).toHaveLength(1)
    expect(list[0].text).toBe('First todo')

    const toggled = await store.toggleTodoRecord(created.id)
    expect(toggled.completed).toBe(true)
  })

  it('deletes todos', async () => {
    const store = await import('~/server/persistence/todosStore')
    const todo = await store.addTodo('Remove me')
    await store.deleteTodoRecord(todo.id)
    const remaining = await store.listTodos()
    expect(remaining).toHaveLength(0)
  })
})
