import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import type { RepoRootMissingReason } from '~/server/lib/sessionRepoRoots.server'
import type { SessionRepoBindingRecord } from '~/server/persistence/sessionRepoBindings'
import { sessionRepoContextInputSchema, type SessionRepoContextInput } from './sessionRepoContext.shared'

export interface SessionRepoContextResponse {
  status: 'ok' | 'error' | 'cleared'
  repoContext?: SessionRepoBindingRecord
  message?: string
  reason?: RepoRootMissingReason
}

const loadSessionRepoContextServer = createServerOnlyFn(() => import('./sessionRepoContext.server'))

export async function handleSessionRepoContextAction(
  data: SessionRepoContextInput,
): Promise<SessionRepoContextResponse> {
  const { handleSessionRepoContextActionServer } = await loadSessionRepoContextServer()
  return handleSessionRepoContextActionServer(data)
}

export const sessionRepoContext = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => sessionRepoContextInputSchema.parse(data))
  .handler(async ({ data }) => handleSessionRepoContextAction(data))
