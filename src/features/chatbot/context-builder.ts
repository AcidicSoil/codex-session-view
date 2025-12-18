import type { AgentRule } from '~/lib/agents-rules/parser'
import type { PromptSection, AIProviderConfig } from '~/lib/ai/client'
import { buildPrompt, estimateTokenCount, getAiProviderConfig } from '~/lib/ai/client'
import type { ChatMessageRecord, MisalignmentRecord, SessionSnapshot } from '~/lib/sessions/model'
import type { ResponseItemParsed } from '~/lib/session-parser'

interface ContextBuilderOptions {
  snapshot: SessionSnapshot
  misalignments?: MisalignmentRecord[]
  history?: ChatMessageRecord[]
  agentRules?: AgentRule[]
  providerOverrides?: Partial<AIProviderConfig>
  maxEvents?: number
  extraSections?: PromptSection[]
}

interface ContextSectionMeta {
  section: PromptSection
  priority: number
  tokens: number
}

export interface ChatContextResult {
  prompt: string
  sections: PromptSection[]
  usedTokens: number
  trimmedSectionIds: string[]
  config: AIProviderConfig
}

const DEFAULT_EVENT_LIMIT = 25

export function buildChatContext(options: ContextBuilderOptions): ChatContextResult {
  const config = getAiProviderConfig(options.providerOverrides)
  const sections = collectSections(options)
  const measuredSections = sections.map<ContextSectionMeta>((section) => ({
    section,
    priority: sectionPriority(section.id),
    tokens: estimateTokenCount(section.content),
  }))
  const { selectedSections, trimmedSectionIds, usedTokens } = enforceBudget(measuredSections, config)
  const prompt = buildPrompt(selectedSections)

  return {
    prompt,
    sections: selectedSections,
    usedTokens,
    trimmedSectionIds,
    config,
  }
}

function collectSections(options: ContextBuilderOptions): PromptSection[] {
  const sections: PromptSection[] = []
  const { snapshot, misalignments, history, agentRules } = options
  const metaSection = createMetaSection(snapshot)
  if (metaSection) sections.push(metaSection)
  const misalignmentSection = createMisalignmentSection(misalignments)
  if (misalignmentSection) sections.push(misalignmentSection)
  const eventsSection = createEventsSection(snapshot.events, options.maxEvents ?? DEFAULT_EVENT_LIMIT)
  if (eventsSection) sections.push(eventsSection)
  const historySection = createHistorySection(history)
  if (historySection) sections.push(historySection)
  const rulesSection = createAgentRulesSection(agentRules)
  if (rulesSection) sections.push(rulesSection)
  if (options.extraSections?.length) {
    sections.push(...options.extraSections)
  }
  return sections
}

function enforceBudget(items: ContextSectionMeta[], config: AIProviderConfig) {
  const reserved = Math.max(config.maxOutputTokens, 1024)
  const limit = Math.max(config.maxContextTokens - reserved, 2048)
  const selected: ContextSectionMeta[] = [...items]
  const trimmed: string[] = []

  let totalTokens = selected.reduce((sum, item) => sum + item.tokens, 0)
  if (totalTokens <= limit) {
    return { selectedSections: selected.map((item) => item.section), trimmedSectionIds: trimmed, usedTokens: totalTokens }
  }

  const sorted = [...selected].sort((a, b) => b.priority - a.priority)
  while (totalTokens > limit && sorted.length > 0) {
    const candidate = sorted.shift()
    if (!candidate) break
    trimmed.push(candidate.section.id)
    totalTokens -= candidate.tokens
    const index = selected.findIndex((item) => item.section.id === candidate.section.id)
    if (index >= 0) {
      selected.splice(index, 1)
    }
  }

  return { selectedSections: selected.map((item) => item.section), trimmedSectionIds: trimmed, usedTokens: totalTokens }
}

function sectionPriority(id: string) {
  switch (id) {
    case 'session-meta':
      return 1
    case 'misalignments':
      return 2
    case 'recent-events':
      return 3
    case 'resolved-events':
      return 3
    case 'chat-history':
      return 4
    case 'agent-rules':
      return 5
    default:
      return 10
  }
}

function createMetaSection(snapshot: SessionSnapshot): PromptSection | null {
  if (!snapshot.meta) {
    return null
  }
  const lines = [
    `Session ID: ${snapshot.sessionId}`,
    `Timestamp: ${snapshot.meta.timestamp ?? 'unknown'}`,
    snapshot.meta.git?.repo ? `Repo: ${snapshot.meta.git.repo} (${snapshot.meta.git.branch ?? 'unknown branch'})` : null,
    snapshot.meta.instructions ? `Instructions: ${snapshot.meta.instructions}` : null,
  ].filter(Boolean)
  return {
    id: 'session-meta',
    heading: 'Session metadata',
    content: lines.join('\n'),
  }
}

function createMisalignmentSection(list: MisalignmentRecord[] | undefined): PromptSection | null {
  if (!list || list.length === 0) {
    return null
  }
  const activeItems = list.filter((item) => item.status !== 'dismissed')
  if (activeItems.length === 0) {
    return null
  }
  const content = activeItems
    .map((item, index) => {
      const header = `${index + 1}. [${item.severity.toUpperCase()} | ${item.status}] ${item.title}`
      const summary = `Summary: ${item.summary}`
      const evidence = item.evidence?.length ? `Evidence: ${item.evidence.map((e) => e.message).join(' | ')}` : null
      const range = item.eventRange
        ? `Events: ${item.eventRange.startIndex} - ${item.eventRange.endIndex} (${item.eventRange.startAt} → ${item.eventRange.endAt})`
        : null
      return [header, summary, evidence, range].filter(Boolean).join('\n')
    })
    .join('\n\n')
  return {
    id: 'misalignments',
    heading: 'Detected misalignments',
    content,
  }
}

function createEventsSection(events: ResponseItemParsed[], maxEvents: number): PromptSection | null {
  if (!events || events.length === 0) {
    return null
  }
  const selected = events.slice(-maxEvents)
  const lines = selected.map((event) => formatEventLine(event))
  return {
    id: 'recent-events',
    heading: `Recent events (latest ${selected.length})`,
    content: lines.join('\n'),
  }
}

function createHistorySection(history: ChatMessageRecord[] | undefined): PromptSection | null {
  if (!history || history.length === 0) {
    return null
  }
  const selected = history.slice(-20)
  const lines = selected.map((message) => `- [${message.role}] ${message.content}`)
  return {
    id: 'chat-history',
    heading: 'Chat history',
    content: lines.join('\n'),
  }
}

function createAgentRulesSection(rules: AgentRule[] | undefined): PromptSection | null {
  if (!rules || rules.length === 0) {
    return null
  }
  const selected = rules.slice(0, 15)
  const lines = selected.map((rule, index) => {
    const bullets = rule.bullets.length > 0 ? `\n  - ${rule.bullets.join('\n  - ')}` : ''
    return `${index + 1}. ${rule.heading} [${rule.severity.toUpperCase()}]\n${rule.summary}${bullets}`.trim()
  })
  return {
    id: 'agent-rules',
    heading: 'Relevant AGENT rules',
    content: lines.join('\n\n'),
  }
}

function formatEventLine(event: ResponseItemParsed) {
  switch (event.type) {
    case 'Message':
      return `- [${event.role}] ${truncate(event.content)}`
    case 'LocalShellCall':
      return `- [shell] ${event.command}`
    case 'FunctionCall':
      return `- [fn:${event.name}] duration ${event.durationMs ?? 'n/a'}ms`
    case 'Reasoning':
      return `- [reasoning] ${truncate(event.content)}`
    default:
      return `- [${event.type}] event captured`
  }
}

function truncate(content: string | unknown, maxLength = 320) {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength - 3)}...`
}
