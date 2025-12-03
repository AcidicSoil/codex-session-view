import { createServerFn } from '@tanstack/react-start'
import { collectRuleInventory } from '~/server/lib/ruleInventory'

export const fetchRuleInventory = createServerFn({ method: 'POST' })
  .inputValidator(() => ({}))
  .handler(async () => {
    return collectRuleInventory()
  })
