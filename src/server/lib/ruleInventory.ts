import type { MisalignmentSeverity } from '~/lib/sessions/model'
import { loadAgentRules } from '~/server/lib/chatbotData'
import { listSessionRepoBindings, type SessionRepoBindingRecord } from '~/server/persistence/sessionRepoBindings'

export interface RuleInventoryRule {
  id: string
  heading: string
  summary: string
  severity: MisalignmentSeverity
}

export interface RuleInventoryEntry {
  sessionId: string
  assetPath: string
  repoRoot: string
  ruleCount: number
  rules: RuleInventoryRule[]
}

export async function collectRuleInventory(): Promise<RuleInventoryEntry[]> {
  const bindings = listSessionRepoBindings()
  const rulesByRoot = new Map<string, RuleInventoryRule[]>()
  const entries: RuleInventoryEntry[] = []

  for (const binding of bindings) {
    const rules = await loadRulesForRoot(binding, rulesByRoot)
    entries.push({
      sessionId: binding.sessionId,
      assetPath: binding.assetPath,
      repoRoot: binding.rootDir,
      ruleCount: rules.length,
      rules,
    })
  }

  return entries
}

async function loadRulesForRoot(binding: SessionRepoBindingRecord, cache: Map<string, RuleInventoryRule[]>) {
  const cached = cache.get(binding.rootDir)
  if (cached) {
    return cached
  }
  const rules = await loadAgentRules(binding.rootDir)
  const mapped: RuleInventoryRule[] = rules.map((rule) => ({
    id: rule.id,
    heading: rule.heading,
    summary: rule.summary,
    severity: rule.severity,
  }))
  cache.set(binding.rootDir, mapped)
  return mapped
}
