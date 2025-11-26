export function truncateRuleTitle(title: string, max = 70) {
  const normalized = title.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  if (normalized.length <= max) {
    return normalized
  }
  if (max <= 3) {
    return normalized.slice(0, max)
  }
  return `${normalized.slice(0, max - 3).trimEnd()}...`
}
