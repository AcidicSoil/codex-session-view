import { Download, Loader2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Switch } from '~/components/ui/switch'
import { cn } from '~/lib/utils'
import { formatCount } from '~/utils/intl'
import type { ExportFormat, ExportScope } from './types'
import type { SessionExportController } from './useSessionExportController'

interface SessionExportButtonProps {
  controller: SessionExportController
  disabled?: boolean
}

const formatLabels: Record<ExportFormat, string> = {
  markdown: 'Markdown (.md)',
  json: 'JSON (.json)',
  csv: 'CSV (.csv)',
  text: 'Plain Text (.txt)',
}

const scopeLabels: Record<ExportScope, string> = {
  entire: 'Entire session',
  filtered: 'Current filter view',
  range: 'Selected range',
  event: 'Single event',
}

export function SessionExportButton({ controller, disabled }: SessionExportButtonProps) {
  const {
    isOpen,
    open,
    close,
    scope,
    setScope,
    format,
    setFormat,
    options,
    handleToggleOption,
    scopeResult,
    filename,
    isDownloadReady,
    isPreparing,
    download,
    totalEvents,
    filteredCount,
    rangeCount,
    selectedEvent,
  } = controller

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={open} disabled={disabled}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
      <Dialog open={isOpen} onOpenChange={(next) => (next ? open() : close())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export session data</DialogTitle>
            <DialogDescription>Choose the scope and file format for your export.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data scope</p>
              <div className="mt-3 space-y-2">
                {(['entire', 'filtered', 'range', 'event'] as ExportScope[]).map((id) => (
                  <ScopeOption
                    key={id}
                    label={scopeLabels[id]}
                    description={scopeDescription(id, { totalEvents, filteredCount, rangeCount, selectedEventLabel: selectedEvent ? `Event #${selectedEvent.displayIndex}` : null })}
                    isActive={scope === id}
                    disabled={id === 'event' && !selectedEvent}
                    onSelect={() => setScope(id)}
                  />
                ))}
              </div>
            </section>
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(Object.keys(formatLabels) as ExportFormat[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormat(id)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                      format === id ? 'border-white/60 bg-white/5 text-white' : 'border-white/10 text-white/70 hover:border-white/30',
                    )}
                  >
                    {formatLabels[id]}
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Options</p>
              <OptionToggle
                label="Include timestamps"
                description="Add ISO timestamps for each event."
                checked={options.includeTimestamps}
                onCheckedChange={(value) => handleToggleOption('includeTimestamps', value)}
              />
              <OptionToggle
                label="Include hidden metadata"
                description="Adds IDs and diagnostic fields. Sensitive instructions stay redacted."
                checked={options.includeMetadata}
                onCheckedChange={(value) => handleToggleOption('includeMetadata', value)}
              />
            </section>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
              <p className="font-semibold">Summary</p>
              <p>Scope: {scopeResult.label}</p>
              <p>Events: {formatCount(scopeResult.events.length)}</p>
              <p>Filename: <span className="font-mono text-xs">{filename}</span></p>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!isDownloadReady || isPreparing}
              onClick={() => {
                void download()
              }}
            >
              {isPreparing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing…
                </>
              ) : (
                <>Download .{extensionForFormat(format)}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ScopeOption({
  label,
  description,
  isActive,
  disabled,
  onSelect,
}: {
  label: string
  description: string
  isActive: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
        isActive ? 'border-white/60 bg-white/5 text-white' : 'border-white/10 text-white/70 hover:border-white/30',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        {isActive ? <span className="text-xs uppercase text-cyan-300">Active</span> : null}
      </div>
      <p className="text-xs text-white/60">{description}</p>
    </button>
  )
}

function scopeDescription(scope: ExportScope, data: { totalEvents: number; filteredCount: number; rangeCount: number; selectedEventLabel: string | null }) {
  switch (scope) {
    case 'entire':
      return `${formatCount(data.totalEvents)} events`
    case 'filtered':
      return `${formatCount(data.filteredCount)} events after filters`
    case 'range':
      return data.rangeCount ? `${formatCount(data.rangeCount)} events in range` : 'Select a range in the timeline'
    case 'event':
      return data.selectedEventLabel ?? 'Select an event from the timeline'
    default:
      return ''
  }
}

function extensionForFormat(format: ExportFormat) {
  switch (format) {
    case 'json':
      return 'json'
    case 'markdown':
      return 'md'
    case 'csv':
      return 'csv'
    case 'text':
      return 'txt'
    default:
      return 'txt'
  }
}

function OptionToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-white/60">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
    </div>
  )
}
