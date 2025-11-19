import { discoverProjectAssets } from '~/lib/viewer-types/viewerDiscovery'
import { logError, logInfo } from '~/lib/logger'

export async function viewerLoader() {
  logInfo('viewer.loader', 'Discovering project assets')
  try {
    const snapshot = await discoverProjectAssets()
    logInfo('viewer.loader', 'Discovered project assets', {
      projectFiles: snapshot.projectFiles.length,
      sessionAssets: snapshot.sessionAssets.length,
    })
    return snapshot
  } catch (error) {
    logError('viewer.loader', 'Failed to discover project assets', error as Error)
    throw error
  }
}

export type ViewerSnapshot = Awaited<ReturnType<typeof viewerLoader>>
