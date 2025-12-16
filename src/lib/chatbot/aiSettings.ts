export interface ChatAiSettings {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
  model?: string
}

export interface ChatAiSettingsPreset {
  id: string
  name: string
  description?: string
  settings: ChatAiSettings
}

export const DEFAULT_CHAT_AI_SETTINGS: ChatAiSettings = {
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  topK: 40,
  frequencyPenalty: 0,
  presencePenalty: 0,
  systemPrompt: '',
  model: undefined,
}
