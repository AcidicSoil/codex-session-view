import type { ResponseItem } from '~/lib/viewer-types'
import type { ResponseItemParsed } from '~/lib/session-parser'

export interface CommandFamily {
  id: string
  label: string
  pattern: RegExp
}

export interface CommandMetadata {
  familyId?: string
  familyLabel?: string
  commandText?: string
  commandToken?: string
  fileBadges: { label: string; title?: string }[]
}

export const COMMAND_FAMILIES: CommandFamily[] = [
  { id: 'git', label: 'git', pattern: /\bgit\b/i },
  { id: 'sed', label: 'sed', pattern: /\bsed\b/i },
  { id: 'rg', label: 'rg', pattern: /\brg\b|\bripgrep\b/i },
  { id: 'apply_patch', label: 'apply_patch', pattern: /apply_patch/i },
  { id: 'npm', label: 'npm', pattern: /\bnpm\b/i },
  { id: 'pnpm', label: 'pnpm', pattern: /\bpnpm\b/i },
  { id: 'yarn', label: 'yarn', pattern: /\byarn\b/i },
  { id: 'curl', label: 'curl', pattern: /\bcurl\b/i },
]

const MAX_FILE_BADGES = 1

type TimelineEvent = ResponseItem | ResponseItemParsed

type EventWithPath = Pick<ResponseItem, 'path'> & Pick<ResponseItemParsed, 'path'>

type EventWithCommand = Pick<ResponseItem, 'command'> & Pick<ResponseItemParsed, 'command'>

type EventWithTool = Pick<ResponseItem, 'toolName'> & Pick<ResponseItemParsed, 'toolName'>

type EventWithName = Pick<ResponseItem, 'name'> & Pick<ResponseItemParsed, 'name'>

type EventWithArgs = Pick<ResponseItem, 'args'> & Pick<ResponseItemParsed, 'args'>

function extractCommandFromArgs(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    try {
      const parsed = JSON.parse(trimmed)
      return extractCommandFromArgs(parsed) ?? trimmed
    } catch {
      return trimmed
    }
  }
  if (typeof value === 'object' && value !== null) {
    const command = (value as { command?: unknown }).command
    if (typeof command === 'string' && command.trim().length > 0) {
      return command
    }
  }
  return undefined
}

function extractPrimaryCommand(event: TimelineEvent): string | undefined {
  if (
    'type' in event &&
    (event as { type?: string }).type === 'FunctionCall' &&
    'args' in event
  ) {
    const args = (event as EventWithArgs).args
    const fromArgs = extractCommandFromArgs(args)
    if (fromArgs) {
      return fromArgs
    }
  }
  if ('command' in event && typeof (event as EventWithCommand).command === 'string') {
    return (event as EventWithCommand).command ?? undefined
  }
  if ('name' in event && typeof (event as EventWithName).name === 'string') {
    return (event as EventWithName).name
  }
  if ('toolName' in event && typeof (event as EventWithTool).toolName === 'string') {
    return (event as EventWithTool).toolName
  }
  return undefined
}

function extractFileBadge(event: TimelineEvent): { label: string; title?: string }[] {
  const files: string[] = []
  if ('path' in event && typeof (event as EventWithPath).path === 'string' && (event as EventWithPath).path) {
    files.push((event as EventWithPath).path)
  }
  if ('stdout' in event && typeof (event as { stdout?: string }).stdout === 'string') {
    const stdout = (event as { stdout: string }).stdout
    const matches = stdout.match(/[\w.-]+\/[\w./-]+/g)
    if (matches) {
      files.push(...matches.slice(0, 3))
    }
  }
  const unique = Array.from(new Set(files))
  return unique.map((path) => {
    const label = path.split(/[/\\]/).pop() ?? path
    return { label, title: path }
  })
}

export function detectCommandFamily(commandText: string | undefined) {
  if (!commandText) return undefined
  const trimmed = commandText.trim()
  return COMMAND_FAMILIES.find((family) => family.pattern.test(trimmed))
}

export function extractCommandMetadata(event: TimelineEvent): CommandMetadata {
  const commandText = extractPrimaryCommand(event)
  const family = detectCommandFamily(commandText)
  const fileBadges = extractFileBadge(event)
  const commandToken = commandText?.trim()?.split(/\s+/)[0]
  return {
    commandText: commandText?.trim(),
    commandToken,
    familyId: family?.id,
    familyLabel: family?.label,
    fileBadges,
  }
}

export interface CommandFilterState {
  families: string[]
  query: string
}

export function matchesCommandFilter(event: TimelineEvent, filter: CommandFilterState | null | undefined) {
  if (!filter || (!filter.families.length && filter.query.trim().length === 0)) {
    return true
  }
  const meta = extractCommandMetadata(event)
  if (filter.families.length > 0) {
    if (!meta.familyId || !filter.families.includes(meta.familyId)) {
      return false
    }
  }
  if (filter.query.trim().length > 0) {
    const needle = filter.query.trim().toLowerCase()
    const haystacks = [meta.commandText, meta.commandToken, ...meta.fileBadges.map((entry) => entry.label), ...meta.fileBadges.map((entry) => entry.title)]
    const hit = haystacks.some((value) => value?.toLowerCase().includes(needle))
    if (!hit) {
      return false
    }
  }
  return true
}

export function buildEventBadges(event: TimelineEvent) {
  const meta = extractCommandMetadata(event)
  const badges: { type: 'command' | 'file'; label: string; id?: string; title?: string }[] = []
  if (meta.commandToken) {
    badges.push({ type: 'command', label: meta.commandToken, id: meta.familyId, title: meta.commandText })
  } else if (meta.familyLabel) {
    badges.push({ type: 'command', label: meta.familyLabel, id: meta.familyId })
  }
  meta.fileBadges.slice(0, MAX_FILE_BADGES).forEach((entry) => {
    badges.push({ type: 'file', label: entry.label, title: entry.title })
  })
  return badges
}
