import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'

const loadSessionDiscoveryServer = createServerOnlyFn(() => import('./sessionDiscovery.server'))

export const runSessionDiscovery = createServerFn({ method: 'GET' }).handler(async () => {
  const { runSessionDiscoveryServer } = await loadSessionDiscoveryServer()
  return runSessionDiscoveryServer()
})
