import { Agent, Runner } from '@openai/agents'
import type { ChatMessageRecord } from '~/lib/sessions/model'
import type { ChatMode } from '~/lib/sessions/model'
import { getAgentsModel } from '~/server/ai/agentsModels.server'
import type { AgentsModelId } from '~/server/ai/agentsModels.server'

export type SessionAnalysisWorkflow = 'summary' | 'commits' | 'hook-discovery'

export type AgentSessionAnalysisResult =
  | { workflow: 'summary'; summaryMarkdown: string }
  | { workflow: 'hook-discovery'; summaryMarkdown: string }
  | { workflow: 'commits'; commitMessages: string[] }

export interface RunSessionAnalysisAgentInput {
  sessionId: string
  mode: ChatMode
  workflow: SessionAnalysisWorkflow
  prompt?: string
  contextPrompt: string
  history: ChatMessageRecord[]
  modelId: AgentsModelId
  signal?: AbortSignal
}

const runner = new Runner({
  maxTurns: 4,
})

const summaryAgent = new Agent({
  name: 'Session Summary Agent',
  instructions:
    'You are a senior engineer summarizing a Codex session. Respond with markdown headings for Goals, Main changes, Issues, Follow-ups, each with bullet points. Include - None. when no data exists.',
  outputType: 'text',
})

export async function runSessionAnalysisAgent(input: RunSessionAnalysisAgentInput): Promise<AgentSessionAnalysisResult> {
  const { model } = getAgentsModel(input.modelId)
  switch (input.workflow) {
    case 'summary': {
      const result = await runner.run(summaryAgent, `Context:\n${input.contextPrompt}\n${input.prompt ?? ''}`, {
        model,
        signal: input.signal,
        maxTurns: 3,
      })
      return { workflow: 'summary', summaryMarkdown: result.finalOutput ?? '' }
    }
    default:
      throw new Error('Not implemented')
  }
}
