import type { BrowserLogPayload } from './logger.types'

export async function forwardBrowserLog(payload: BrowserLogPayload) {
  const { captureBrowserLog } = await import('~/server/function/browserLogs')
  await captureBrowserLog({ data: payload })
}
