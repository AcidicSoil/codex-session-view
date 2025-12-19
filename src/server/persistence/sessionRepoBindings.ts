import { dbQuery } from '~/server/persistence/database'

export interface SessionRepoBindingRecord {
  sessionId: string
  assetPath: string
  rootDir: string
  updatedAt: number
}

export async function setSessionRepoBinding(binding: { sessionId: string; assetPath: string; rootDir: string }) {
  const updatedAt = Date.now()
  await dbQuery(
    `INSERT INTO session_repo_bindings (session_id, asset_path, root_dir, updated_at)
     VALUES ($1,$2,$3,TO_TIMESTAMP($4 / 1000.0))
     ON CONFLICT (session_id)
     DO UPDATE SET asset_path = EXCLUDED.asset_path,
                   root_dir = EXCLUDED.root_dir,
                   updated_at = EXCLUDED.updated_at`,
    [binding.sessionId, binding.assetPath, binding.rootDir, updatedAt],
  )
  return {
    sessionId: binding.sessionId,
    assetPath: binding.assetPath,
    rootDir: binding.rootDir,
    updatedAt,
  }
}

export async function getSessionRepoBinding(sessionId: string): Promise<SessionRepoBindingRecord | null> {
  const result = await dbQuery<{ sessionId: string; assetPath: string; rootDir: string; updatedAt: string }>(
    `SELECT session_id AS "sessionId",
            asset_path AS "assetPath",
            root_dir AS "rootDir",
            EXTRACT(EPOCH FROM updated_at) * 1000 AS "updatedAt"
       FROM session_repo_bindings
      WHERE session_id = $1`,
    [sessionId],
  )
  const row = result.rows[0]
  if (!row) {
    return null
  }
  return {
    sessionId: row.sessionId,
    assetPath: row.assetPath,
    rootDir: row.rootDir,
    updatedAt: Number(row.updatedAt),
  }
}

export async function clearSessionRepoBinding(sessionId: string) {
  await dbQuery(`DELETE FROM session_repo_bindings WHERE session_id = $1`, [sessionId])
}

export async function clearAllSessionRepoBindings() {
  await dbQuery(`DELETE FROM session_repo_bindings`)
}

export async function listSessionRepoBindings(): Promise<SessionRepoBindingRecord[]> {
  const result = await dbQuery<{ sessionId: string; assetPath: string; rootDir: string; updatedAt: string }>(
    `SELECT session_id AS "sessionId",
            asset_path AS "assetPath",
            root_dir AS "rootDir",
            EXTRACT(EPOCH FROM updated_at) * 1000 AS "updatedAt"
       FROM session_repo_bindings`,
  )
  return result.rows.map((row) => ({
    sessionId: row.sessionId,
    assetPath: row.assetPath,
    rootDir: row.rootDir,
    updatedAt: Number(row.updatedAt),
  }))
}
