import { Field, FieldContent, FieldLabel } from '~/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

export interface ModelSelectFieldProps {
  value: string
  availableModels: string[]
  onChange: (value: string) => void
}

export function ModelSelectField({ value, availableModels, onChange }: ModelSelectFieldProps) {
  if (availableModels.length === 0) {
    return null
  }

  return (
    <Field>
      <FieldLabel htmlFor="model">Model</FieldLabel>
      <FieldContent>
        <div className="[&_button]:min-h-[44px] [&_button]:sm:min-h-[32px]">
          <Select onValueChange={onChange} value={value || availableModels[0] || ''}>
            <SelectTrigger id="model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FieldContent>
    </Field>
  )
}

export default ModelSelectField
