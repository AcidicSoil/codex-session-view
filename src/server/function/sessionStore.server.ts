import { saveSessionUpload } from '../persistence/sessionUploads.server'
import { logError, logInfo } from '~/lib/logger'

export async function persistSessionFileServer(data: {
  filename: string
  content: string
  persist?: boolean
}) {
  logInfo('session-store', 'Persisting session file', { filename: data.filename })
  try {
    const record = await saveSessionUpload(data.filename, data.content, { persist: data.persist })
    logInfo('session-store', 'Persisted session file', { id: record.id })
    return record
  } catch (error) {
    logError('session-store', 'Failed to persist session file', error as Error)
    throw error
  }
}
