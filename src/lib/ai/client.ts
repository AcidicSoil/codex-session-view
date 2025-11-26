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

const DEFAULT_MODEL = process.env.AI_MODEL ?? 'openai/gpt-4o-mini'
const DEFAULT_CONTEXT = Number(process.env.AI_MAX_CONTEXT ?? 32768)
const DEFAULT_OUTPUT = Number(process.env.AI_MAX_OUTPUT ?? 2048)

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
