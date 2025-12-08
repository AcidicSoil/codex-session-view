import type { MisalignmentSeverity } from '~/lib/sessions/model'

export interface RuleInventoryRule {
  id: string
  heading: string
  summary: string
  severity: MisalignmentSeverity
  sourcePath?: string | null
}

export interface RuleInventoryEntry {
  sessionId: string
  assetPath: string
  repoRoot: string
  ruleCount: number
  rules: RuleInventoryRule[]
}
