import { Settings } from 'lucide-react'
import { Button } from '~/components/ui/button'

export interface AdvancedSettingsToggleProps {
  isOpen: boolean
  onToggle: () => void
}

export function AdvancedSettingsToggle({ isOpen, onToggle }: AdvancedSettingsToggleProps) {
  return (
    <Button
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Hide advanced settings' : 'Show advanced settings'}
      className="min-h-[44px] w-full min-w-[44px] sm:min-h-[32px] sm:w-auto sm:min-w-[32px]"
      onClick={onToggle}
      type="button"
      variant="ghost"
    >
      <Settings aria-hidden="true" className="size-4" />
      {isOpen ? 'Hide' : 'Show'} Advanced Settings
    </Button>
  )
}

export default AdvancedSettingsToggle
