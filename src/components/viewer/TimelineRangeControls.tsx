import { Slider } from '~/components/ui/slider'
import { Input } from '~/components/ui/input'
import { clampEventRange, type EventRangeInput } from '~/lib/session-events/range'
import { cn } from '~/lib/utils'

interface TimelineRangeControlsProps {
  totalEvents: number
  value: EventRangeInput | null
  onChange: (next: EventRangeInput | null) => void
}

export function TimelineRangeControls({ totalEvents, value, onChange }: TimelineRangeControlsProps) {
  const range = clampEventRange(totalEvents, value)
  const startValue = typeof value?.startIndex === 'number' ? value.startIndex : ''
  const endValue = typeof value?.endIndex === 'number' ? value.endIndex : ''
  const disabled = totalEvents === 0
  const maxIndex = Math.max(totalEvents - 1, 0)
  const sliderValues: [number, number] = [range.startIndex, range.endIndex]
  const showingCount = totalEvents === 0 ? 0 : range.endIndex - range.startIndex + 1

  const handleInputChange = (field: 'startIndex' | 'endIndex', raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed.length) {
      const next = { ...value }
      if (next) delete (next as Record<string, number | undefined>)[field]
      const cleared = next && Object.keys(next).length > 0 ? next : null
      onChange(cleared)
      return
    }
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) return
    const bounded = Math.max(0, Math.min(maxIndex, parsed))
    const next: EventRangeInput = { ...(value ?? {}), [field]: bounded }
    if (typeof next.startIndex === 'number' && typeof next.endIndex === 'number') {
      if (next.startIndex > next.endIndex) {
        if (field === 'startIndex') {
          next.endIndex = bounded
        } else {
          next.startIndex = bounded
        }
      }
    }
    onChange(next)
  }

  const handleSliderChange = (nextValues: number[]) => {
    const [rawStart, rawEnd] = nextValues
    const startIndex = Math.max(0, Math.min(maxIndex, Math.min(rawStart, rawEnd)))
    const endIndex = Math.max(0, Math.min(maxIndex, Math.max(rawStart, rawEnd)))
    onChange({ ...(value ?? {}), startIndex, endIndex })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm font-semibold">Event range</p>
        <p className="text-xs text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-white/90">
            {disabled ? 0 : showingCount}
          </span>{' '}
          of {totalEvents} events
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              'flex items-center rounded-md border border-white/10 bg-black/40 text-sm',
              disabled && 'opacity-50',
            )}
          >
            <label htmlFor="timeline-range-start" className="sr-only">
              Start index
            </label>
            <Input
              id="timeline-range-start"
              inputMode="numeric"
              pattern="[0-9]*"
              value={startValue}
              disabled={disabled}
              onChange={(event) => handleInputChange('startIndex', event.target.value)}
              placeholder="0"
              className="w-20 border-0 bg-transparent text-center text-sm focus-visible:ring-0"
            />
            <span className="px-2 text-xs text-muted-foreground">–</span>
            <label htmlFor="timeline-range-end" className="sr-only">
              End index
            </label>
            <Input
              id="timeline-range-end"
              inputMode="numeric"
              pattern="[0-9]*"
              value={endValue}
              disabled={disabled}
              onChange={(event) => handleInputChange('endIndex', event.target.value)}
              placeholder={String(maxIndex)}
              className="w-20 border-0 bg-transparent text-center text-sm focus-visible:ring-0"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Slider
              min={0}
              max={maxIndex}
              value={sliderValues}
              onValueChange={handleSliderChange}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
