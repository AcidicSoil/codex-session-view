import type { Conversation } from './types'

export function formatDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const thisWeek = new Date(today)
  thisWeek.setDate(thisWeek.getDate() - 7)

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateOnly.getTime() === today.getTime()) {
    return 'Today'
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }
  if (dateOnly.getTime() >= thisWeek.getTime()) {
    return 'This Week'
  }

  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()
  const currentYear = now.getFullYear()

  if (year === currentYear) {
    return `${month} ${day}`
  }
  return `${month} ${day}, ${year}`
}

export function groupConversationsByDate(conversations: Conversation[]) {
  const groups: Record<string, Conversation[]> = {}

  conversations.forEach((conv) => {
    if (!conv.lastMessageAt) {
      groups.Older = groups.Older ?? []
      groups.Older.push(conv)
      return
    }

    const label = formatDate(conv.lastMessageAt)
    groups[label] = groups[label] ?? []
    groups[label].push(conv)
  })

  const orderedLabels = ['Today', 'Yesterday', 'This Week']
  const result: { label: string; conversations: Conversation[] }[] = []

  orderedLabels.forEach((label) => {
    if (groups[label]) {
      result.push({ label, conversations: groups[label] })
      delete groups[label]
    }
  })

  Object.keys(groups)
    .sort()
    .forEach((label) => {
      if (label === 'Older') return
      result.push({ label, conversations: groups[label] })
    })

  if (groups.Older) {
    result.push({ label: 'Older', conversations: groups.Older })
  }

  return result
}
