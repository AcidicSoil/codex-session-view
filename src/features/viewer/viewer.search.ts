import { z } from 'zod'
import { sanitizeSessionFilterIds } from '~/components/viewer/SessionList'
import type { ViewerSearch } from './route-id'

export const viewerSearchSchema = z
  .object({
    filters: z.array(z.string()).catch([]),
    expanded: z.array(z.string()).catch([]),
  })
  .transform(({ filters, expanded }): ViewerSearch => ({
    filters: sanitizeSessionFilterIds(filters),
    expanded: dedupe(expanded),
  }))

function dedupe(ids: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
