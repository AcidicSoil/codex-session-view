import { UploadControlsCard, type UploadController } from '../viewer.upload.section'
import { cn } from '~/lib/utils'

interface ExplorerUploadPanelProps {
  controller: UploadController
  className?: string
}

export function ExplorerUploadPanel({ controller, className }: ExplorerUploadPanelProps) {
  return (
    <section className={cn('rounded-3xl border border-white/10 bg-background/80 p-6 shadow-inner', className)}>
      <div className="space-y-5">
        <header className="space-y-1">
          <p className="text-sm font-semibold text-white">Upload &amp; Stream sessions</p>
          <p className="text-xs text-white/70">Drop .jsonl exports or select a folder to cache them into the Explorer.</p>
        </header>
        <UploadControlsCard controller={controller} className="rounded-2xl border border-white/15 bg-black/40 p-4" />
      </div>
    </section>
  )
}
