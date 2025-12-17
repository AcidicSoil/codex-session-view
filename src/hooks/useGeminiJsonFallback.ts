import { useCallback } from 'react'
import { tryParseGeminiConversationBlob } from '~/lib/session-parser'
import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser'

export interface GeminiJsonParseResult {
  meta?: SessionMetaParsed
  events: ResponseItemParsed[]
}

export function useGeminiJsonFallback() {
  const parseBlob = useCallback(async (blob: Blob): Promise<GeminiJsonParseResult | null> => {
    const result = await tryParseGeminiConversationBlob(blob)
    if (!result) return null
    return { meta: result.meta, events: result.events }
  }, [])

  return { parseBlob }
}
