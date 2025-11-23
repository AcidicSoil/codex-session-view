import type { SessionMetaParsed } from '~/lib/session-parser'
import { parseSessionMetaLine } from '~/lib/session-parser'
import { normalizeRepositoryLabel } from './repository'

export interface RepoMetadata {
  repo?: string
  branch?: string
  commit?: string
  remote?: string
  dirty?: boolean
}

export interface RepoDetails {
  repoLabel?: string
  repoMeta?: RepoMetadata
}

type MetaParseResult = ReturnType<typeof parseSessionMetaLine>

function unwrapMeta(result: MetaParseResult): SessionMetaParsed | undefined {
  const anyResult = result as any
  if (anyResult?.success && anyResult.data) {
    return anyResult.data as SessionMetaParsed
  }
  if (anyResult?.ok && anyResult.value) {
    return anyResult.value as SessionMetaParsed
  }
  return undefined
}

export function buildRepoDetailsFromMeta(meta?: SessionMetaParsed | null): RepoDetails {
  if (!meta?.git) return {}
  const repoMeta: RepoMetadata = {
    repo: normalizeRepositoryLabel(meta.git.repo) ?? meta.git.repo,
    branch: meta.git.branch,
    commit: meta.git.commit,
    remote: meta.git.remote,
    dirty: meta.git.dirty,
  }
  const hasMeta = Object.values(repoMeta).some((value) => value !== undefined && value !== '')
  return {
    repoLabel: repoMeta.repo ?? normalizeRepositoryLabel(meta.git.repo),
    repoMeta: hasMeta ? repoMeta : undefined,
  }
}

export function deriveRepoDetailsFromLine(line: string | undefined): RepoDetails {
  if (!line) return {}
  const meta = unwrapMeta(parseSessionMetaLine(line))
  if (!meta) return {}
  return buildRepoDetailsFromMeta(meta)
}
