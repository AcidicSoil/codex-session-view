export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createSearchMatcher(query?: string | null) {
  const normalized = typeof query === 'string' ? query.trim() : ''
  if (!normalized) return null
  return new RegExp(escapeRegExp(normalized), 'gi')
}
