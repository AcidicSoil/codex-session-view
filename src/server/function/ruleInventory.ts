import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'

const loadRuleInventoryServer = createServerOnlyFn(() => import('./ruleInventory.server'))

export const fetchRuleInventory = createServerFn({ method: 'POST' })
  .inputValidator(() => ({}))
  .handler(async () => {
    const { fetchRuleInventoryServer } = await loadRuleInventoryServer()
    return fetchRuleInventoryServer()
  })
