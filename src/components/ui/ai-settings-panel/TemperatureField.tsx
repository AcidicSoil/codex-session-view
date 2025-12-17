import { useMemo } from 'react'
import { Badge } from '~/components/ui/badge'
import { Field, FieldContent, FieldDescription, FieldLabel } from '~/components/ui/field'
import { Slider } from '~/components/ui/slider'

function getTemperatureLabel(temperature: number): string {
  if (temperature === 0) return 'Deterministic'
  if (temperature < 0.5) return 'Focused'
  if (temperature < 1.0) return 'Balanced'
  return 'Creative'
}

export interface TemperatureFieldProps {
  value: number
  onChange: (value: number) => void
}

export function TemperatureField({ value, onChange }: TemperatureFieldProps) {
  const label = useMemo(() => getTemperatureLabel(value), [value])

  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor="temperature">Temperature: {value.toFixed(1)}</FieldLabel>
        <Badge aria-label={`Temperature mode: ${label}`} className="text-xs" variant="secondary">
          {label}
        </Badge>
      </div>
      <FieldContent>
        <Slider aria-label="Temperature" id="temperature" max={2} min={0} onValueChange={(values) => onChange(values[0])} step={0.1} value={[value]} />
        <FieldDescription>
          Controls randomness. Lower values make responses more focused and deterministic.
        </FieldDescription>
      </FieldContent>
    </Field>
  )
}

export default TemperatureField
