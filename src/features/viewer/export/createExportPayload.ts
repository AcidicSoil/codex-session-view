import { buildJsonExport } from './formatters/json'
import { buildMarkdownExport } from './formatters/markdown'
import { buildCsvExport } from './formatters/csv'
import { buildTextExport } from './formatters/text'
import type { ExportBuildParams, ExportFormat } from './types'

const MIME_TYPES: Record<ExportFormat, string> = {
  json: 'application/json',
  markdown: 'text/markdown',
  csv: 'text/csv',
  text: 'text/plain',
}

export function buildExportBlob(format: ExportFormat, params: ExportBuildParams) {
  const serialized = serialize(format, params)
  return new Blob([serialized], { type: MIME_TYPES[format] })
}

function serialize(format: ExportFormat, params: ExportBuildParams) {
  switch (format) {
    case 'json':
      return buildJsonExport(params)
    case 'markdown':
      return buildMarkdownExport(params)
    case 'csv':
      return buildCsvExport(params)
    case 'text':
      return buildTextExport(params)
    default:
      return ''
  }
}
