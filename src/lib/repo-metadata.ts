import type { SessionMetaParsed } from '~/lib/session-parser'
import { parseSessionMetaLine } from '~/lib/session-parser'
import { normalizeRepositoryLabel, repositoryLabelFromCwd } from './repository'

export interface RepoMetadata {
  repo?: string;
  branch?: string;
  commit?: string;
  remote?: string;
  dirty?: boolean;
  cwd?: string;
}

export interface RepoDetails {
  repoLabel?: string
  repoMeta?: RepoMetadata
  workspaceRoot?: string
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

function parseMetaFromLine(line: string | undefined): SessionMetaParsed | undefined {
  if (!line) return undefined
  return unwrapMeta(parseSessionMetaLine(line))
}

export function buildRepoDetailsFromMeta(meta?: SessionMetaParsed | null): RepoDetails {
  if (!meta) return {}
  const repoLabelCandidates = gatherRepoLabelCandidates(meta)
  const repoLabel = repoLabelCandidates.find(isMeaningfulLabel)
  const cwdValue = (meta as Record<string, unknown>)?.cwd
  const repoMeta: RepoMetadata = {
    repo: repoLabel,
    branch: meta.git?.branch,
    commit: meta.git?.commit,
    remote: meta.git?.remote,
    dirty: meta.git?.dirty,
    cwd: typeof cwdValue === 'string' && cwdValue.trim().length > 0 ? cwdValue.trim() : undefined,
  }
  const hasMeta = Object.values(repoMeta).some((value) => value !== undefined && value !== '')
  return {
    repoLabel: repoLabel && isMeaningfulLabel(repoLabel) ? repoLabel : undefined,
    repoMeta: hasMeta ? repoMeta : undefined,
    workspaceRoot: typeof cwdValue === 'string' && cwdValue.trim().length > 0 ? cwdValue.trim() : undefined,
  }
}

function gatherRepoLabelCandidates(meta: SessionMetaParsed) {
  const anyMeta = meta as Record<string, unknown>
  const repoUrlFields = [
    anyMeta.repository_url,
    anyMeta.repositoryUrl,
    anyMeta.repo_url,
    anyMeta.repoUrl,
    anyMeta.repository,
    anyMeta.repo,
    pickRepoLikeValue(anyMeta.source),
    pickRepoLikeValue(anyMeta.model_provider),
  ]
    .map(asString)
    .map((value) => (value ? normalizeRepositoryLabel(value) ?? value : undefined))
    .filter(Boolean)

  const gitRepo = meta.git?.repo ? normalizeRepositoryLabel(meta.git.repo) ?? meta.git.repo : undefined
  const gitRemote = meta.git?.remote ? normalizeRepositoryLabel(meta.git.remote) ?? meta.git.remote : undefined
  const metaLabel = typeof anyMeta.repoLabel === 'string' ? (anyMeta.repoLabel as string) : undefined
  const cwdLabel = repositoryLabelFromCwd((anyMeta.cwd as string | undefined) ?? undefined)

  return [gitRepo, gitRemote, ...repoUrlFields, metaLabel, cwdLabel].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  )
}

function pickRepoLikeValue(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined
  const record = input as Record<string, unknown>
  const candidates = [
    record.repository_url,
    record.repo_url,
    record.repository,
    record.repo,
    record.url,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
    }
  }
  return undefined
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (value == null) return undefined
  try {
    return String(value)
  } catch {
    return undefined
  }
}

function isMeaningfulLabel(value?: string | null) {
  if (!value) return false
  const normalized = value.trim()
  if (!normalized) return false
  // Filter obvious noise like short numeric-only labels or placeholder strings
  if (/^src$/i.test(normalized)) return false
  if (/^\d+$/.test(normalized)) return false
  if (/^[0-9a-f-]{6,}$/i.test(normalized) && !normalized.includes('/')) return false
  return true
}

export function deriveRepoDetailsFromLine(line: string | undefined): RepoDetails {
  const meta = parseMetaFromLine(line)
  if (!meta) return {}
  return buildRepoDetailsFromMeta(meta)
}

export function deriveSessionTimestampMs(line: string | undefined): number | undefined {
  const meta = parseMetaFromLine(line)
  if (!meta?.timestamp) return undefined
  const parsed = Date.parse(meta.timestamp)
  if (!Number.isFinite(parsed)) {
    return undefined
  }
  return parsed
}
