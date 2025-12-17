import { Field, FieldContent, FieldDescription, FieldLabel } from '~/components/ui/field'
import { InputGroup, InputGroupInput } from '~/components/ui/input-group'

export interface MaxTokensFieldProps {
  value: number
  onChange: (value: number) => void
}

export function MaxTokensField({ value, onChange }: MaxTokensFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor="max-tokens">Max Tokens</FieldLabel>
      <FieldContent>
        <InputGroup>
          <InputGroupInput
            aria-label="Maximum tokens"
            id="max-tokens"
            max={32_000}
            min={1}
            onChange={(e) => {
              const numValue = Number.parseInt(e.target.value) || 2000
              onChange(numValue)
            }}
            type="number"
            value={value}
          />
        </InputGroup>
        <FieldDescription>Maximum number of tokens in the response</FieldDescription>
      </FieldContent>
    </Field>
  )
}

export default MaxTokensField
