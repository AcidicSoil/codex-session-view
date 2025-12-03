import type { AgentRule } from '~/lib/agents-rules/parser'
import type { MisalignmentEvidence, MisalignmentRecord, MisalignmentSeverity, SessionEventRange, SessionSnapshot } from '~/lib/sessions/model'
import type { ChatRemediationMetadata, CoachPrefillPayload } from '~/lib/chatbot/types'
import { detectMisalignments } from '~/features/chatbot/misalignment-detector'
import { selectPrimaryMisalignment } from '~/features/chatbot/severity'

export type HookSource = 'timeline' | 'session' | 'manual'
export type HookDecisionSeverity = MisalignmentSeverity | 'none'

export interface HookRuleSummary {
  id: string
  title: string
  summary: string
  severity: MisalignmentSeverity
  eventRange?: SessionEventRange
  evidence: MisalignmentEvidence[]
}

interface EvaluateHookInput {
  sessionId: string
  source: HookSource
  content: string
  agentRules: AgentRule[]
  sessionSnapshot?: SessionSnapshot | null
}

export interface HookEvaluationResult {
  blocked: boolean
  severity: HookDecisionSeverity
  rules: HookRuleSummary[]
  annotations?: string
  metadata?: ChatRemediationMetadata
  message?: string
  prefill?: CoachPrefillPayload
}

const BLOCKING_SEVERITIES: MisalignmentSeverity[] = ['high', 'critical']

export function evaluateAddToChatContent(input: EvaluateHookInput): HookEvaluationResult {
  const baseResult: HookEvaluationResult = {
    blocked: false,
    severity: 'none',
    rules: [],
    prefill: {
      prompt: input.content,
    },
  }

  if (!input.agentRules || input.agentRules.length === 0) {
    return baseResult
  }

  const snapshot = input.sessionSnapshot
    ? { ...input.sessionSnapshot }
    : {
        sessionId: input.sessionId,
        text: decorateContentForDetection(input.content, input.source),
      }

  const detection = detectMisalignments({ snapshot, agentRules: input.agentRules })
  if (!detection.misalignments.length) {
    return baseResult
  }

  const primary = selectPrimaryMisalignment(detection.misalignments)
  if (!primary) {
    return baseResult
  }

  const rules = detection.misalignments.slice(0, 5).map(mapRecordToSummary)
  const severity = primary.severity
  const blocked = BLOCKING_SEVERITIES.includes(severity)

  const annotations = formatAnnotationMarkdown(detection.misalignments, input.source)
  const metadata: ChatRemediationMetadata = {
    misalignmentId: primary.id,
    ruleId: primary.ruleId,
    severity: primary.severity,
    eventRange: primary.eventRange
      ? {
          startIndex: primary.eventRange.startIndex,
          endIndex: primary.eventRange.endIndex,
        }
      : undefined,
  }

  return {
    blocked,
    severity,
    rules,
    annotations,
    metadata,
    message: buildGateMessage(primary, blocked),
    prefill: blocked
      ? undefined
      : {
          prompt: `${annotations}\n\n${input.content}`,
          metadata,
        },
  }
}

function decorateContentForDetection(content: string, source: HookSource) {
  return [`[Source:${source}]`, content].join('\n\n')
}

function mapRecordToSummary(record: MisalignmentRecord): HookRuleSummary {
  return {
    id: record.ruleId,
    title: record.title,
    summary: record.summary,
    severity: record.severity,
    eventRange: record.eventRange,
    evidence: record.evidence ?? [],
  }
}

function formatAnnotationMarkdown(records: MisalignmentRecord[], source: HookSource) {
  const header = `## Hookify Alignment Notes (source: ${source})`
  const intro = `Detected ${records.length} rule${records.length === 1 ? '' : 's'} that apply to this prompt.`
  const bullets = records
    .slice(0, 5)
    .map((record, index) =>
      `${index + 1}. [${record.severity.toUpperCase()}] ${record.title}: ${record.summary || 'Address this rule before proceeding.'}`,
    )
  return [header, intro, ...bullets].join('\n\n')
}

function buildGateMessage(record: MisalignmentRecord, blocked: boolean) {
  if (blocked) {
    return `Rule ${record.ruleId} (${record.title}) blocks this action until remediation is documented.`
  }
  return `Rule ${record.ruleId} (${record.title}) must guide this chat prompt.`
}
