import { Loader2, RotateCcw, Save } from 'lucide-react'
import { CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'

export interface SettingsHeaderProps {
  hasChanges: boolean
  isSaving: boolean
  onReset?: () => void
  onSave?: () => void
}

export function SettingsHeader({ hasChanges, isSaving, onReset, onSave }: SettingsHeaderProps) {
  return (
    <CardHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <CardTitle className="wrap-break-word">AI Settings</CardTitle>
          <CardDescription className="wrap-break-word">
            Configure AI model parameters and behavior
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
          {onReset && (
            <Button
              aria-label="Reset settings to defaults"
              className="min-h-[44px] w-full min-w-[44px] sm:min-h-[32px] sm:w-auto sm:min-w-[32px]"
              onClick={onReset}
              type="button"
              variant="outline"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              <span className="whitespace-nowrap">Reset</span>
            </Button>
          )}
          {onSave && (
            <Button
              aria-busy={isSaving}
              aria-label={isSaving ? 'Saving settings' : 'Save settings'}
              className="min-h-[44px] w-full min-w-[44px] sm:min-h-[32px] sm:w-auto sm:min-w-[32px]"
              data-loading={isSaving}
              disabled={!hasChanges || isSaving}
              onClick={onSave}
              type="button"
            >
              {isSaving ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  <span className="whitespace-nowrap">Saving…</span>
                </>
              ) : (
                <>
                  <Save aria-hidden="true" className="size-4" />
                  <span className="whitespace-nowrap">Save</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </CardHeader>
  )
}

export default SettingsHeader
