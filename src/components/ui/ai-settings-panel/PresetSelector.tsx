import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatAiSettingsPreset } from '~/lib/chatbot/aiSettings'
import { FieldLabel } from '~/components/ui/field'
import { PresetItem } from './PresetItem'

export interface PresetSelectorProps {
  presets: ChatAiSettingsPreset[]
  onLoadPreset: (presetId: string) => void
  onDeletePreset?: (presetId: string) => Promise<void>
}

export function PresetSelector({ presets, onLoadPreset, onDeletePreset }: PresetSelectorProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const presetRefs = useRef<(HTMLButtonElement | null)[]>([])

  const setPresetRef = useCallback(
    (index: number) => (node: HTMLButtonElement | null) => {
      presetRefs.current[index] = node
    },
    [],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return
      }

      if (presets.length === 0) return

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const nextIndex =
            focusedIndex === null ? 0 : focusedIndex < presets.length - 1 ? focusedIndex + 1 : 0
          setFocusedIndex(nextIndex)
          presetRefs.current[nextIndex]?.focus()
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const prevIndex =
            focusedIndex === null ? presets.length - 1 : focusedIndex > 0 ? focusedIndex - 1 : presets.length - 1
          setFocusedIndex(prevIndex)
          presetRefs.current[prevIndex]?.focus()
          break
        }
        case 'Home': {
          e.preventDefault()
          setFocusedIndex(0)
          presetRefs.current[0]?.focus()
          break
        }
        case 'End': {
          e.preventDefault()
          const lastIndex = presets.length - 1
          setFocusedIndex(lastIndex)
          presetRefs.current[lastIndex]?.focus()
          break
        }
        case 'Escape': {
          if (focusedIndex !== null) {
            e.preventDefault()
            setFocusedIndex(null)
            presetRefs.current[focusedIndex]?.blur()
          }
          break
        }
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [presets.length, focusedIndex])

  if (presets.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel id="presets-label">Presets</FieldLabel>
      <div aria-labelledby="presets-label" className="flex flex-wrap gap-2" role="list">
        {presets.map((preset, index) => (
          <PresetItem
            isFocused={focusedIndex === index}
            key={preset.id}
            onDelete={onDeletePreset}
            onLoad={onLoadPreset}
            preset={preset}
            presetRef={setPresetRef(index)}
          />
        ))}
      </div>
    </div>
  )
}

export default PresetSelector
