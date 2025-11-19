import type { ResponseItem } from '~/lib/viewer-types';

export function eventKey(item: ResponseItem, absoluteIndex: number): string {
  const anyItem = item as any
  if (anyItem?.id) return `${String(anyItem.id)}-${absoluteIndex}`
  if (typeof anyItem?.index === 'number') return `idx-${anyItem.index}-${absoluteIndex}`
  const type = typeof anyItem?.type === 'string' ? anyItem.type : 'event'
  return `${type}-${absoluteIndex}`
}
