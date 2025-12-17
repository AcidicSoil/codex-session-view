'use client'

import React from 'react'
import { cn } from '~/lib/utils'
import { useSmartDatetimeInput } from './context'
import {
  formatDateTime,
  getDefaultPlaceholder,
  inputBaseClass,
  parseDateTime,
} from './utils'

export const NaturalLanguageInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ placeholder, disabled, ...props }, ref) => {
  const { value, onValueChange, onTimeChange, showCalendar = true, showTimePicker = true } = useSmartDatetimeInput()
  const [inputValue, setInputValue] = React.useState('')

  const resolvedPlaceholder = placeholder ?? getDefaultPlaceholder(showCalendar, showTimePicker)

  React.useEffect(() => {
    if (!value) {
      setInputValue('')
      return
    }

    const formattedValue = formatDateTime(value, showCalendar, showTimePicker)
    setInputValue(formattedValue)

    if (showTimePicker) {
      const hours = value.getHours()
      const minutes = String(value.getMinutes()).padStart(2, '0')
      const period = hours >= 12 ? 'PM' : 'AM'
      const hour12 = hours % 12 === 0 ? 12 : hours % 12
      onTimeChange(`${hour12}:${minutes} ${period}`)
    }
  }, [value, showCalendar, showTimePicker, onTimeChange])

  const handleParse = React.useCallback(
    (nextValue: string) => {
      const parsedDateTime = parseDateTime(nextValue)
      if (!parsedDateTime) return

      if (!showCalendar && showTimePicker && value) {
        parsedDateTime.setFullYear(value.getFullYear(), value.getMonth(), value.getDate())
      }
      if (showCalendar && !showTimePicker && value) {
        parsedDateTime.setHours(0, 0, 0, 0)
      }

      onValueChange(parsedDateTime)
      setInputValue(formatDateTime(parsedDateTime, showCalendar, showTimePicker))

      if (showTimePicker) {
        const period = parsedDateTime.getHours() >= 12 ? 'PM' : 'AM'
        const hour12 = parsedDateTime.getHours() % 12 || 12
        onTimeChange(`${hour12}:${String(parsedDateTime.getMinutes()).padStart(2, '0')} ${period}`)
      }
    },
    [value, onValueChange, onTimeChange, showCalendar, showTimePicker],
  )

  const handleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      handleParse(event.currentTarget.value)
    },
    [handleParse],
  )

  const handleKeydown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleParse(event.currentTarget.value)
      }
    },
    [handleParse],
  )

  return (
    <input
      ref={ref}
      type="text"
      placeholder={resolvedPlaceholder}
      value={inputValue}
      onChange={(event) => setInputValue(event.currentTarget.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeydown}
      disabled={disabled}
      className={cn('px-2 mr-0.5 dark:bg-neutral-800 bg-neutral-50 flex-1 border-none h-8 rounded-sm', inputBaseClass)}
      {...props}
    />
  )
})

NaturalLanguageInput.displayName = 'NaturalLanguageInput'
