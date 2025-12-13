import type { ExportBuildParams } from '../types'
import { EXPORT_SCHEMA_VERSION, EXPORT_SOURCE } from '../constants'
import { sanitizeEventPayload, sanitizeSessionMeta } from '../utils'

export function buildJsonExport(params: ExportBuildParams) {
  const { scopeResult, options, filterDescription, sessionMeta, exportedAt, selectedEvent } = params
  const exportedAtIso = (exportedAt ?? new Date()).toISOString()
  const sanitizedEvents = scopeResult.events.map((event) => sanitizeEventPayload(event, options.includeMetadata))
  const payload = {
    metadata: {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: exportedAtIso,
      source: EXPORT_SOURCE,
      scope: scopeResult.scope,
      filterApplied: filterDescription,
      isPartial: scopeResult.isPartial || scopeResult.scope !== 'entire',
      range: scopeResult.rangeLabel ?? null,
      selectedEvent: selectedEvent ? selectedEvent.resolvedIndex : null,
      eventCount: sanitizedEvents.length,
    },
    session: {
      id: sessionMeta?.id ?? 'session',
      title: sessionMeta?.git?.repo ?? sessionMeta?.id ?? 'Session Export',
      meta: sanitizeSessionMeta(sessionMeta) ?? {},
      events: sanitizedEvents,
    },
  }
  return JSON.stringify(payload, null, 2)
}
