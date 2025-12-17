'use client'

import React from 'react'

export interface SmartDatetimeInputProps {
  value?: Date
  onValueChange: (date: Date) => void
  showCalendar?: boolean
  showTimePicker?: boolean
}

export interface SmartDatetimeInputContextProps extends SmartDatetimeInputProps {
  Time: string
  onTimeChange: (time: string) => void
}

export const SmartDatetimeInputContext = React.createContext<SmartDatetimeInputContextProps | null>(null)

export const useSmartDatetimeInput = () => {
  const context = React.useContext(SmartDatetimeInputContext)
  if (!context) {
    throw new Error('useSmartDatetimeInput must be used within SmartDatetimeInput')
  }
  return context
}
