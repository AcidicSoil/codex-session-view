import { Field, FieldContent, FieldDescription, FieldLabel } from '~/components/ui/field'
import { Slider } from '~/components/ui/slider'
import type { ChatAiSettings } from '~/lib/chatbot/aiSettings'

export interface AdvancedSettingsSectionProps {
  settings: ChatAiSettings
  onSettingChange: <K extends keyof ChatAiSettings>(key: K, value: ChatAiSettings[K]) => void
}

export function AdvancedSettingsSection({ settings, onSettingChange }: AdvancedSettingsSectionProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="top-p">Top P: {settings.topP?.toFixed(2) || '1.00'}</FieldLabel>
        </div>
        <FieldContent>
          <Slider
            aria-label="Top P"
            id="top-p"
            max={1}
            min={0}
            onValueChange={(values) => onSettingChange('topP', values[0])}
            step={0.01}
            value={[settings.topP ?? 1.0]}
          />
          <FieldDescription>Nucleus sampling: considers tokens with top-p probability mass</FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="top-k">Top K: {settings.topK ?? '40'}</FieldLabel>
        <FieldContent>
          <Slider
            aria-label="Top K"
            id="top-k"
            max={100}
            min={1}
            onValueChange={(values) => onSettingChange('topK', values[0])}
            step={1}
            value={[settings.topK ?? 40]}
          />
          <FieldDescription>Limits sampling to top K most likely tokens</FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="frequency-penalty">
            Frequency Penalty: {settings.frequencyPenalty?.toFixed(1) || '0.0'}
          </FieldLabel>
        </div>
        <FieldContent>
          <Slider
            aria-label="Frequency penalty"
            id="frequency-penalty"
            max={2}
            min={-2}
            onValueChange={(values) => onSettingChange('frequencyPenalty', values[0])}
            step={0.1}
            value={[settings.frequencyPenalty ?? 0]}
          />
          <FieldDescription>
            Reduces likelihood of repeating tokens (positive) or increases it (negative)
          </FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="presence-penalty">
            Presence Penalty: {settings.presencePenalty?.toFixed(1) || '0.0'}
          </FieldLabel>
        </div>
        <FieldContent>
          <Slider
            aria-label="Presence penalty"
            id="presence-penalty"
            max={2}
            min={-2}
            onValueChange={(values) => onSettingChange('presencePenalty', values[0])}
            step={0.1}
            value={[settings.presencePenalty ?? 0]}
          />
          <FieldDescription>
            Reduces likelihood of talking about new topics (positive) or increases it (negative)
          </FieldDescription>
        </FieldContent>
      </Field>
    </div>
  )
}

export default AdvancedSettingsSection
