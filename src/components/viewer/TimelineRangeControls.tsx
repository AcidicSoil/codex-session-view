import { Slider } from '~/components/ui/slider'
import { Input } from '~/components/ui/input'
import type { EventRangeInput } from '~/lib/session-events/range'

interface TimelineRangeControlsProps {
  totalEvents: number
  value: EventRangeInput | null
  onChange: (next: EventRangeInput | null) => void
}

export function TimelineRangeControls({ totalEvents, value, onChange }: TimelineRangeControlsProps) {
  const startValue = value?.startIndex ?? ''
  const endValue = value?.endIndex ?? ''
  const disabled = totalEvents === 0
  const maxIndex = Math.max(totalEvents - 1, 0)
  const sliderValues: [number, number] = [
    typeof value?.startIndex === 'number' ? value.startIndex : 0,
    typeof value?.endIndex === 'number' ? value.endIndex : maxIndex,
  ]

  const handleInputChange = (field: 'startIndex' | 'endIndex', raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed.length) {
      const next = { ...value }
      if (next) delete (next as any)[field]
      const cleared = next && Object.keys(next).length > 0 ? next : null
      onChange(cleared)
      return
    }
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) return
    const next = { ...(value ?? {}) }
    next[field] = parsed
    onChange(next)
  }

  const handleSliderChange = (nextValues: number[]) => {
    const [startIndex, endIndex] = nextValues
    onChange({ ...(value ?? {}), startIndex, endIndex })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Start index</p>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={startValue}
            disabled={disabled}
            onChange={(event) => handleInputChange('startIndex', event.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">End index</p>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={endValue}
            disabled={disabled}
            onChange={(event) => handleInputChange('endIndex', event.target.value)}
            placeholder={String(maxIndex)}
          />
        </div>
      </div>
      <Slider
        min={0}
        max={maxIndex}
        value={sliderValues}
        onValueChange={handleSliderChange}
        className="mt-2"
        disabled={disabled}
      />
    </div>
  )
}
