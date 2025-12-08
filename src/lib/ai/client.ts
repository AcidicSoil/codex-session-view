import type { ChatMode, MisalignmentRecord, SessionSnapshot } from '~/lib/sessions/model'
import type { ResponseItemParsed } from '~/lib/session-parser'

export interface AIProviderConfig {
  model: string
  maxContextTokens: number
  maxOutputTokens: number
  temperature: number
  topP: number
  stream: boolean
}

export interface PromptSection {
  id: string
  heading: string
  content: string
}

const DEFAULT_MODEL =
  readEnvValue('AI_SESSION_DEFAULT_MODEL') ?? readEnvValue('AI_MODEL') ?? 'internlm_januscoderv-7b';
const DEFAULT_CONTEXT = Number(readEnvValue('AI_MAX_CONTEXT') ?? 32768)
const DEFAULT_OUTPUT = Number(readEnvValue('AI_MAX_OUTPUT') ?? 6144);

function readEnvValue(key: string) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

function readServerEnv(key: string) {
  return readEnvValue(key)
}

export function getAiProviderConfig(overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
  return {
    model: overrides.model ?? DEFAULT_MODEL,
    maxContextTokens: overrides.maxContextTokens ?? DEFAULT_CONTEXT,
    maxOutputTokens: overrides.maxOutputTokens ?? DEFAULT_OUTPUT,
    temperature: overrides.temperature ?? 0,
    topP: overrides.topP ?? 1,
    stream: overrides.stream ?? true,
  }
}

export function estimateTokenCount(text: string) {
  if (!text) return 0
  // crude heuristic: ~4 characters per token. Works cross-provider without SDK dependencies.
  return Math.ceil(text.length / 4)
}

export function buildPrompt(sections: PromptSection[]) {
  return sections
    .map((section) => `# ${section.heading}\n\n${section.content.trim()}\n`)
    .join('\n')
    .trim()
}

export interface SummaryGeneratorOptions {
  snapshot: SessionSnapshot
  misalignments?: MisalignmentRecord[]
  recentEvents?: ResponseItemParsed[]
  contextHeadings?: string[]
  promptSummary?: string
}

export interface CommitMessageGeneratorOptions extends SummaryGeneratorOptions {
  maxCommits?: number
}

const SUMMARY_SECTION_DEFINITION = [
  { heading: 'Goals', key: 'goals', limit: 5 },
  { heading: 'Main changes', key: 'main', limit: 10 },
  { heading: 'Issues', key: 'issues', limit: 5 },
  { heading: 'Follow-ups', key: 'followUps', limit: 5 },
] as const

export function generateSessionSummaryMarkdown(options: SummaryGeneratorOptions): string {
  const goals = deriveGoals(options)
  const mainChanges = deriveMainChanges(options)
  const issues = deriveIssues(options)
  const followUps = deriveFollowUps(options)
  const sections: Record<(typeof SUMMARY_SECTION_DEFINITION)[number]['key'], string[]> = {
    goals,
    main: mainChanges,
    issues,
    followUps,
  }

  return SUMMARY_SECTION_DEFINITION.map((section) => {
    const bullets = formatBullets(sections[section.key], section.limit)
    return `## ${section.heading}\n${bullets}`
  }).join('\n\n')
}

export function generateCommitMessages(options: CommitMessageGeneratorOptions): string[] {
  const misalignmentCommits = (options.misalignments ?? []).map((item) =>
    formatCommitSubject(`fix(agents): address ${truncateText(item.title, 40)}`),
  )
  const eventCommits = (options.recentEvents ?? [])
    .slice(-5)
    .map((event) => describeEventCommit(event))
    .filter((value): value is string => Boolean(value))
  const fallback = [`chore(session): document current findings`]
  const unique = dedupeStrings([...misalignmentCommits, ...eventCommits, ...fallback])
  const limit = Math.max(1, options.maxCommits ?? 5)
  return unique.slice(0, limit)
}

function deriveGoals(options: SummaryGeneratorOptions) {
  const goals: string[] = []
  const instructions = options.snapshot.meta?.instructions
  if (instructions) {
    for (const sentence of splitSentences(instructions)) {
      if (sentence.length === 0) continue
      goals.push(`Ensure ${sentence}`)
    }
  }
  if (options.contextHeadings && options.contextHeadings.length > 0) {
    goals.push(`Leverage context sections: ${options.contextHeadings.join(', ')}`)
  }
  if (options.promptSummary) {
    goals.push(`Respond to prompt: ${options.promptSummary}`)
  }
  return dedupeStrings(goals)
}

function deriveMainChanges(options: SummaryGeneratorOptions) {
  const recent = (options.recentEvents ?? options.snapshot.events ?? []).slice(-12)
  return recent.map((event) => describeEventSummary(event)).filter(Boolean) as string[]
}

function deriveIssues(options: SummaryGeneratorOptions) {
  const issues = (options.misalignments ?? [])
    .filter((item) => item.status !== 'dismissed')
    .map((item) => `${capitalize(item.severity)} severity ${item.title}: ${item.summary}`)
  return dedupeStrings(issues)
}

function deriveFollowUps(options: SummaryGeneratorOptions) {
  const followUps: string[] = []
  for (const misalignment of options.misalignments ?? []) {
    if (misalignment.status === 'dismissed') continue
    followUps.push(`Review rule ${misalignment.ruleId} evidence and update status (${misalignment.status}).`)
  }
  if (followUps.length === 0) {
    followUps.push('Plan next remediation steps with the Session Coach insights.')
  }
  return dedupeStrings(followUps)
}

function formatBullets(values: string[], limit: number) {
  const limited = values.filter(Boolean).slice(0, limit)
  if (limited.length === 0) {
    return '- None.'
  }
  return limited.map((value) => `- ${clampSentence(value)}`).join('\n')
}

function clampSentence(text: string) {
  const normalized = ensureSentence(text)
  if (normalized.length <= 160) {
    return normalized
  }
  return `${normalized.slice(0, 157).trimEnd()}...`
}

function ensureSentence(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return 'None.'
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function describeEventSummary(event: ResponseItemParsed) {
  switch (event.type) {
    case 'Message':
      return `${capitalize(event.role ?? 'message')} message summarized.`
    case 'LocalShellCall':
      return `Executed shell command ${truncateText(event.command ?? 'command', 45)}.`
    case 'FunctionCall':
      return `Ran function ${event.name ?? 'fn'} in ${event.durationMs ?? 0}ms.`
    case 'Reasoning':
      return `Reasoning step captured: ${truncateText(event.content ?? 'analysis', 60)}.`
    case 'WebSearchCall':
      return `Ran web search for ${truncateText(event.query ?? 'query', 40)}.`
    case 'FileChange':
      return `Updated file ${event.path ?? 'unknown'}.`
    default:
      return null
  }
}

function describeEventCommit(event: ResponseItemParsed) {
  switch (event.type) {
    case 'Message':
      return formatCommitSubject(`docs(chat): record ${event.role ?? 'message'} summary`)
    case 'LocalShellCall':
      return formatCommitSubject(`chore(shell): run ${truncateText(event.command ?? 'command', 32)}`)
    case 'FunctionCall':
      return formatCommitSubject(`feat(api): invoke ${event.name ?? 'function'}`)
    case 'FileChange':
      return formatCommitSubject(`fix(files): update ${truncateText(event.path ?? 'file', 32)}`)
    default:
      return null
  }
}

function formatCommitSubject(subject: string) {
  const trimmed = subject.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= 72) {
    return trimmed
  }
  return `${trimmed.slice(0, 69).trimEnd()}...`
}

function splitSentences(value: string) {
  return value
    .split(/[.!?\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const normalized = value.trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    output.push(normalized)
  }
  return output
}

function truncateText(value: string, max: number) {
  if (value.length <= max) {
    return value
  }
  if (max <= 3) {
    return value.slice(0, max)
  }
  return `${value.slice(0, max - 3).trimEnd()}...`
}

function capitalize(value: string) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export type ProviderId = 'openai-compatible' | 'gemini-cli' | 'codex-cli' | 'lm-studio'

export interface ChatModelDefinition {
  id: string
  label: string
  description: string
  providerId: ProviderId
  providerModel: string
  contextWindow: number
  maxOutputTokens: number
  defaultTemperature: number
  tags: string[]
  modes: ChatMode[]
}

export interface ChatModelOption {
  id: string
  label: string
  description: string
  provider: string
  contextWindow: number
  maxOutputTokens: number
  tags: string[]
  modes: ChatMode[]
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  'openai-compatible': 'OpenAI Compatible',
  'gemini-cli': 'Gemini CLI',
  'codex-cli': 'Codex CLI',
  'lm-studio': 'LM Studio',
}

const STATIC_MODEL_REGISTRY: Record<string, ChatModelDefinition> = {
  /*  'openai:gpt-4o-mini': {
    id: 'openai:gpt-4o-mini',
    label: 'GPT-4o mini',
    description: 'Balanced reasoning tuned for AGENTS remediation with 128K context.',
    providerId: 'openai-compatible',
    providerModel: 'gpt-4o-mini',
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    defaultTemperature: 0.2,
    tags: ['grounded', 'fast'],
    modes: ['session', 'general'],
  },
  'openai:gpt-4.1-mini': {
    id: 'openai:gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    description: 'Creative general-purpose assistant with structured reasoning support.',
    providerId: 'openai-compatible',
    providerModel: 'gpt-4.1-mini',
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    defaultTemperature: 0.35,
    tags: ['general', 'creative'],
    modes: ['session', 'general'],
  },*/

  'lmstudio:local-default': {
    id: 'lmstudio:local-default',
    label: 'LM Studio Local',
    description: 'Runs against a local LM Studio OpenAI-compatible server for offline workflows.',
    providerId: 'lm-studio',
    providerModel: 'internlm_januscoderv-7b',
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    defaultTemperature: 0.7,
    tags: ['local', 'open-source'],
    modes: ['session', 'general'],
  },
  'gemini:2.5-flash': {
    id: 'gemini:2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'High-token streaming model via Gemini CLI for exploratory chats.',
    providerId: 'gemini-cli',
    providerModel: 'gemini-2.5-flash',
    contextWindow: 1_000_000,
    maxOutputTokens: 16_384,
    defaultTemperature: 0.2,
    tags: ['streaming', 'exploration'],
    modes: ['session', 'general'],
  },
  'gemini:2.5-pro': {
    id: 'gemini:2.5-pro',
    label: 'Gemini 2.5 pro',
    description: 'High-token streaming model via Gemini CLI for exploratory chats.',
    providerId: 'gemini-cli',
    providerModel: 'gemini-2.5-pro',
    contextWindow: 1_000_000,
    maxOutputTokens: 16_384,
    defaultTemperature: 0.2,
    tags: ['streaming', 'exploration'],
    modes: ['session', 'general'],
  },
  'codex:gpt-5.1-codex': {
    id: 'codex:gpt-5.1-codex',
    label: 'GPT-5.1 Codex',
    description: 'Full Codex CLI agent with approvals + sandbox controls for remediation coaching.',
    providerId: 'codex-cli',
    providerModel: 'gpt-5.1-codex',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    defaultTemperature: 0.1,
    tags: ['reasoning', 'tools'],
    modes: ['session', 'general'],
  },
  'codex:gpt-5.1-codex-max': {
    id: 'codex:gpt-5.1-codex-max',
    label: 'GPT-5.1 Codex Max',
    description: 'Maximum reasoning effort via Codex CLI; best for deep remediation walkthroughs.',
    providerId: 'codex-cli',
    providerModel: 'gpt-5.1-codex-max',
    contextWindow: 200_000,
    maxOutputTokens: 16_384,
    defaultTemperature: 0.15,
    tags: ['reasoning', 'slow'],
    modes: ['session', 'general'],
  },
};

const dynamicModelRegistry = new Map<string, ChatModelDefinition>()

const FALLBACK_MODEL_IDS: Record<ChatMode, string> = {
  session: 'lmstudio:local-default',
  general: 'lmstudio:local-default',
}

function listAllModelDefinitions() {
  return [...Object.values(STATIC_MODEL_REGISTRY), ...dynamicModelRegistry.values()]
}

function getOptionalModelDefinition(modelId: string) {
  return dynamicModelRegistry.get(modelId) ?? STATIC_MODEL_REGISTRY[modelId]
}

export function registerDynamicChatModels(definitions: ChatModelDefinition[], options?: { replaceProvider?: ProviderId }) {
  if (options?.replaceProvider) {
    for (const [id, definition] of dynamicModelRegistry.entries()) {
      if (definition.providerId === options.replaceProvider) {
        dynamicModelRegistry.delete(id)
      }
    }
  }
  for (const definition of definitions) {
    dynamicModelRegistry.set(definition.id, definition)
  }
}

export function getChatModelDefinition(modelId: string): ChatModelDefinition {
  const definition = getOptionalModelDefinition(modelId)
  if (!definition) {
    throw new Error(`Unknown chat model: ${modelId}`)
  }
  return definition
}

export function getChatModelOptions(mode?: ChatMode): ChatModelOption[] {
  return listAllModelDefinitions()
    .filter((definition) => (mode ? definition.modes.includes(mode) : true))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      provider: PROVIDER_LABELS[definition.providerId],
      contextWindow: definition.contextWindow,
      maxOutputTokens: definition.maxOutputTokens,
      tags: definition.tags,
      modes: definition.modes,
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.label.localeCompare(b.label))
}

export function getDefaultModelForMode(mode: ChatMode): string {
  const configured =
    mode === 'session'
      ? readServerEnv('AI_SESSION_DEFAULT_MODEL') ?? process.env.AI_SESSION_DEFAULT_MODEL
      : readServerEnv('AI_GENERAL_DEFAULT_MODEL') ?? process.env.AI_GENERAL_DEFAULT_MODEL
  if (configured) {
    const definition = getOptionalModelDefinition(configured)
    if (definition && definition.modes.includes(mode)) {
      return configured
    }
  }
  const fallback = listAllModelDefinitions().find((definition) => definition.modes.includes(mode))?.id ?? FALLBACK_MODEL_IDS[mode]
  const fallbackDefinition = fallback ? getOptionalModelDefinition(fallback) : null
  if (!fallback || !fallbackDefinition) {
    throw new Error(`No chat model registered for mode ${mode}`)
  }
  return fallback
}

export function resolveModelForMode(mode: ChatMode, requestedId?: string): string {
  if (!requestedId) {
    return getDefaultModelForMode(mode)
  }
  const definition = getOptionalModelDefinition(requestedId)
  if (!definition) {
    throw new Error(`Unknown chat model: ${requestedId}`)
  }
  if (!definition.modes.includes(mode)) {
    throw new Error(`Model ${requestedId} is not available for ${mode} mode`)
  }
  return definition.id
}
