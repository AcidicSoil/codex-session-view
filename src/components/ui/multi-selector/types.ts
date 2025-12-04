import type { ReactNode } from 'react'

export type MultiSelectorOptionId = string

export interface MultiSelectorGroup {
  id: string
  label: string
  description?: string
  allowMultiple?: boolean
  badge?: string
}

export interface MultiSelectorOption {
  id: MultiSelectorOptionId
  label: string
  description?: string
  groupId: string
  icon?: ReactNode
  disabled?: boolean
  count?: number
}

export type MultiSelectorValue = Record<string, MultiSelectorOptionId[]>

export interface MultiSelectorProps {
  groups: MultiSelectorGroup[]
  options: MultiSelectorOption[]
  value: MultiSelectorValue
  onChange: (value: MultiSelectorValue) => void
  triggerLabel?: string
  placeholder?: string
  maxVisibleChips?: number
  className?: string
}

export interface SelectedDescriptor {
  groupId: string
  optionId: string
  label: string
}
