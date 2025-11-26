import { featureFlags } from '~/config/features'
import type { ChatMode } from '~/lib/sessions/model'

export interface ChatModeDefinition {
  mode: ChatMode
  label: string
  streaming: boolean
  enabled: boolean
  description: string
  errorCode?: string
}

const CHAT_MODE_DEFINITIONS: Record<ChatMode, Omit<ChatModeDefinition, 'enabled'>> = {
  session: {
    mode: 'session',
    label: 'Session coach',
    streaming: true,
    description: 'Grounded responses sourced from the active session snapshot and AGENTS instructions.',
  },
  general: {
    mode: 'general',
    label: 'General chat',
    streaming: false,
    description: 'Unbounded creative chat. Disabled until the PRD expands general-purpose guardrails.',
    errorCode: 'MODE_NOT_ENABLED',
  },
}

export function getChatModeDefinition(mode: ChatMode): ChatModeDefinition {
  const def = CHAT_MODE_DEFINITIONS[mode]
  if (!def) {
    throw new Error(`Unsupported chat mode ${mode}`)
  }
  const enabled = mode === 'session' ? featureFlags.sessionCoach.enabled() : false
  return { ...def, enabled }
}

export function assertChatModeEnabled(mode: ChatMode) {
  const definition = getChatModeDefinition(mode)
  if (!definition.enabled) {
    const error = new Error(`Chat mode ${mode} is not enabled`)
    ;(error as Error & { code?: string }).code = definition.errorCode ?? 'MODE_NOT_ENABLED'
    throw error
  }
}
