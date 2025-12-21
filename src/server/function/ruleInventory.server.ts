import { collectRuleInventory } from '~/server/lib/ruleInventory.server'

export async function fetchRuleInventoryServer() {
  return collectRuleInventory()
}
