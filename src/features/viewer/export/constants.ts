export const EXPORT_SCHEMA_VERSION = '1.0'
export const EXPORT_SOURCE = 'Codex Session Viewer'

export const EXPORT_FORMAT_DEFAULTS = {
  markdown: { includeTimestamps: false, includeMetadata: false },
  text: { includeTimestamps: false, includeMetadata: false },
  json: { includeTimestamps: true, includeMetadata: false },
  csv: { includeTimestamps: true, includeMetadata: false },
} as const
