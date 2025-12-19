import { randomUUID } from 'node:crypto'
import { dbQuery } from '~/server/persistence/database'
import type { Todo } from '~/features/todos/types'

const TODO_COLUMNS = `
  id,
  text,
  completed,
  created_at AS "createdAt",
  updated_at AS "updatedAt",
  session_id AS "sessionId"
`

export async function listTodos(): Promise<Todo[]> {
  const result = await dbQuery<Todo>(`SELECT ${TODO_COLUMNS} FROM todos ORDER BY created_at ASC`)
  return result.rows
}

export async function addTodo(text: string): Promise<Todo> {
  const now = new Date().toISOString()
  const result = await dbQuery<Todo>(
    `INSERT INTO todos (id, text, completed, created_at, updated_at)
     VALUES ($1, $2, FALSE, $3, $3)
     RETURNING ${TODO_COLUMNS}`,
    [randomUUID(), text, now],
  )
  return result.rows[0]
}

export async function toggleTodoRecord(id: string): Promise<Todo> {
  const existing = await dbQuery<Todo>(`SELECT ${TODO_COLUMNS} FROM todos WHERE id = $1`, [id])
  const todo = existing.rows[0]
  if (!todo) {
    throw new Error('Todo not found')
  }
  const result = await dbQuery<Todo>(
    `UPDATE todos
        SET completed = NOT completed,
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${TODO_COLUMNS}`,
    [id],
  )
  return result.rows[0]
}

export async function deleteTodoRecord(id: string) {
  const result = await dbQuery(`DELETE FROM todos WHERE id = $1`, [id])
  if (result.rowCount === 0) {
    throw new Error('Todo not found')
  }
}
