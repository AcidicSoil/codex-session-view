'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'
import type { ChatAiSettings, ChatAiSettingsPreset } from '~/lib/chatbot/aiSettings'
import { DEFAULT_CHAT_AI_SETTINGS } from '~/lib/chatbot/aiSettings'
import SettingsHeader from './SettingsHeader'
import PresetSelector from './PresetSelector'
import TemperatureField from './TemperatureField'
import MaxTokensField from './MaxTokensField'
import SystemPromptField from './SystemPromptField'
import ModelSelectField from './ModelSelectField'
import AdvancedSettingsSection from './AdvancedSettingsSection'
import AdvancedSettingsToggle from './AdvancedSettingsToggle'

export interface AISettingsPanelProps {
  settings?: ChatAiSettings
  presets?: ChatAiSettingsPreset[]
  onSettingsChange?: (settings: ChatAiSettings) => void
  onSave?: (settings: ChatAiSettings) => Promise<void>
  onReset?: () => void
  onLoadPreset?: (presetId: string) => void
  onSavePreset?: (name: string, settings: ChatAiSettings) => Promise<void>
  onDeletePreset?: (presetId: string) => Promise<void>
  className?: string
  showAdvanced?: boolean
  availableModels?: string[]
}

export default function AISettingsPanel({
  settings = DEFAULT_CHAT_AI_SETTINGS,
  presets = [],
  onSettingsChange,
  onSave,
  onReset,
  onLoadPreset,
  onDeletePreset,
  className,
  showAdvanced = false,
  availableModels = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'],
}: AISettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<ChatAiSettings>(settings)
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(showAdvanced)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const updateSetting = useCallback(
    <K extends keyof ChatAiSettings>(key: K, value: ChatAiSettings[K]) => {
      const newSettings = { ...localSettings, [key]: value }
      setLocalSettings(newSettings)
      onSettingsChange?.(newSettings)
    },
    [localSettings, onSettingsChange],
  )

  const handleSave = useCallback(async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(localSettings)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }, [onSave, localSettings])

  const handleReset = useCallback(() => {
    setLocalSettings(DEFAULT_CHAT_AI_SETTINGS)
    onReset?.()
    onSettingsChange?.(DEFAULT_CHAT_AI_SETTINGS)
  }, [onReset, onSettingsChange])

  const toggleAdvancedSettings = useCallback(() => {
    setShowAdvancedSettings((prev) => !prev)
  }, [])

  const hasChanges = useMemo(
    () => JSON.stringify(localSettings) !== JSON.stringify(settings),
    [localSettings, settings],
  )

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId)
      if (preset) {
        setLocalSettings(preset.settings)
        onLoadPreset?.(presetId)
        onSettingsChange?.(preset.settings)
      }
    },
    [presets, onLoadPreset, onSettingsChange],
  )

  return (
    <Card className={cn('w-full shadow-xs', className)}>
      <SettingsHeader
        hasChanges={hasChanges}
        isSaving={isSaving}
        onReset={onReset ? handleReset : undefined}
        onSave={onSave ? handleSave : undefined}
      />
      <CardContent>
        <div className="flex flex-col gap-6">
          {presets.length > 0 && onLoadPreset ? (
            <>
              <PresetSelector onDeletePreset={onDeletePreset} onLoadPreset={handleLoadPreset} presets={presets} />
              <Separator />
            </>
          ) : null}

          <div className="flex flex-col gap-4">
            <ModelSelectField
              availableModels={availableModels}
              onChange={(value) => updateSetting('model', value)}
              value={localSettings.model ?? availableModels[0] ?? ''}
            />

            <TemperatureField onChange={(value) => updateSetting('temperature', value)} value={localSettings.temperature ?? 0.7} />

            <MaxTokensField onChange={(value) => updateSetting('maxTokens', value)} value={localSettings.maxTokens ?? 2000} />

            <SystemPromptField onChange={(value) => updateSetting('systemPrompt', value)} value={localSettings.systemPrompt ?? ''} />
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <AdvancedSettingsToggle isOpen={showAdvancedSettings} onToggle={toggleAdvancedSettings} />

            {showAdvancedSettings ? (
              <AdvancedSettingsSection onSettingChange={updateSetting} settings={localSettings} />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
