import { relative } from 'node:path'
import { loadAgentRules } from '~/server/lib/chatbotData.server'
import { listSessionRepoBindings, type SessionRepoBindingRecord } from '~/server/persistence/sessionRepoBindings'
import type { RuleInventoryEntry, RuleInventoryRule } from '~/lib/ruleInventoryTypes'

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
    sourcePath: normalizeSourcePath(binding.rootDir, rule.source),
  }))
  cache.set(binding.rootDir, mapped)
  return mapped
}

function normalizeSourcePath(rootDir: string, source?: string) {
  if (!source) return null
  const normalized = relative(rootDir, source).replace(/\\/g, '/')
  return normalized.startsWith('..') ? source : normalized
}
