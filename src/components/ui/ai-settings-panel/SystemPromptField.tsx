import { Field, FieldContent, FieldDescription, FieldLabel } from '~/components/ui/field'
import { Textarea } from '~/components/ui/textarea'

export interface SystemPromptFieldProps {
  value: string
  onChange: (value: string) => void
}

export function SystemPromptField({ value, onChange }: SystemPromptFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor="system-prompt">System Prompt</FieldLabel>
      <FieldContent>
        <Textarea
          aria-label="System prompt"
          id="system-prompt"
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter system prompt to guide AI behavior…"
          rows={4}
          value={value}
        />
        <FieldDescription>Instructions that guide the AI&apos;s behavior and responses</FieldDescription>
      </FieldContent>
    </Field>
  )
}

export default SystemPromptField
