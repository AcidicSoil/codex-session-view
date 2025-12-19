import { Pool, type PoolClient } from 'pg'
import { env } from '~/env/server'

let pool: Pool | null = null

export function getDatabasePool() {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL })
  }
  return pool
}

export async function dbQuery<T = unknown>(text: string, params: unknown[] = []) {
  const client = getDatabasePool()
  return await client.query<T>(text, params)
}

export async function runInTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const poolInstance = getDatabasePool()
  const client = await poolInstance.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
