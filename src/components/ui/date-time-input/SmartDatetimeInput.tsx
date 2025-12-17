'use client'

import React from 'react'
import { cn } from '~/lib/utils'
import { DateTimeLocalInput } from './DateTimeLocalInput'
import { NaturalLanguageInput } from './NaturalLanguageInput'
import {
  SmartDatetimeInputContext,
  type SmartDatetimeInputProps,
} from './context'

export const SmartDatetimeInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'ref' | 'value' | 'defaultValue' | 'onBlur'> &
    SmartDatetimeInputProps
>(
  (
    {
      className,
      value,
      onValueChange,
      placeholder,
      disabled,
      showCalendar = true,
      showTimePicker = true,
    },
    ref,
  ) => {
    const [Time, setTime] = React.useState('')

    const onTimeChange = React.useCallback((time: string) => {
      setTime(time)
    }, [])

    const shouldShowBoth = showCalendar === showTimePicker

    return (
      <SmartDatetimeInputContext.Provider
        value={{
          value,
          onValueChange,
          Time,
          onTimeChange,
          showCalendar: shouldShowBoth ? true : showCalendar,
          showTimePicker: shouldShowBoth ? true : showTimePicker,
        }}
      >
        <div className="flex items-center justify-center dark:bg-neutral-950 bg-neutral-50">
          <div
            className={cn(
              'flex gap-1 w-full p-1 items-center justify-between rounded-md border-2 transition-all',
              'focus-within:outline-0 focus:outline-0 focus:ring-0',
              'placeholder:text-muted-foreground focus-visible:outline-0 ',
              className,
            )}
          >
            <DateTimeLocalInput />
            <NaturalLanguageInput placeholder={placeholder} disabled={disabled} ref={ref} />
          </div>
        </div>
      </SmartDatetimeInputContext.Provider>
    )
  },
)

SmartDatetimeInput.displayName = 'DatetimeInput'
