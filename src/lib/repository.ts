/**
 * Helpers for normalizing repository labels derived from session metadata or paths.
 */

/** Normalize git remote style identifiers into a consistent owner/repo shape. */
export function normalizeRepositoryLabel(input?: string | null): string | undefined {
  if (!input) return undefined
  const trimmed = input.trim()
  if (!trimmed) return undefined

  const withoutGitSuffix = trimmed.replace(/\.git$/i, '')
  const sshMatch = withoutGitSuffix.match(/^git@([^:]+):(.+)$/)
  const cleaned = sshMatch ? `https://${sshMatch[1]}/${sshMatch[2]}` : withoutGitSuffix
  const path = cleaned.includes('://') ? cleaned.split('://')[1]?.split('?')[0] : cleaned
  if (!path) return undefined

  const segments = path
    .replace(/^\/+/, '')
    .split(/[\\/]+/)
    .filter(Boolean)

  if (!segments.length) return undefined

  const repo = segments.pop()!
  const owner = segments.pop()
  const safeRepo = repo.trim()
  const safeOwner = owner?.replace(/[:@]+$/, '').trim()

  if (!safeRepo) return undefined
  return safeOwner ? `${safeOwner}/${safeRepo}` : safeRepo
}

/** Fallback label derived from a file path when repo metadata is missing. */
export function fallbackRepositoryLabelFromPath(path?: string | null): string | undefined {
  if (!path) return undefined
  const normalized = path.replace(/\\/g, '/').split('/').filter(Boolean)
  if (!normalized.length) return undefined
  if (normalized.length >= 2) {
    return normalized[normalized.length - 2]
  }
  return normalized[0]
}
