'use client'

import React from 'react'
import { CalendarIcon } from 'lucide-react'
import { ActiveModifiers } from 'react-day-picker'
import { Button } from '~/components/website/ui/button'
import { Calendar, type CalendarProps } from '~/components/website/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/website/ui/popover'
import { cn } from '~/lib/utils'
import { useSmartDatetimeInput } from './context'
import { inputBaseClass } from './utils'
import { TimePicker } from './TimePicker'

export type DateTimeLocalInputProps = CalendarProps

export const DateTimeLocalInput = ({ className, ...props }: DateTimeLocalInputProps) => {
  const { value, onValueChange, showCalendar = true, showTimePicker = true } = useSmartDatetimeInput()

  const formateSelectedDate = React.useCallback(
    (date: Date | undefined, selectedDate: Date, _m: ActiveModifiers, _e: React.MouseEvent) => {
      if (!selectedDate) return
      const parsedDateTime = new Date(selectedDate)

      if (!showTimePicker) {
        parsedDateTime.setHours(0, 0, 0, 0)
      } else if (value) {
        parsedDateTime.setHours(value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds())
      }

      onValueChange(parsedDateTime)
    },
    [value, showTimePicker, onValueChange],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn('size-9 flex items-center justify-center font-normal dark:bg-neutral-800 bg-neutral-200', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="size-4" />
          <span className="sr-only">calendar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 dark:bg-neutral-800 bg-neutral-50" sideOffset={8}>
        <div className="flex gap-1">
          {showCalendar && (
            <Calendar
              {...props}
              id="calendar"
              className={cn('peer flex justify-end', inputBaseClass, className)}
              mode="single"
              selected={value}
              onSelect={formateSelectedDate}
              initialFocus
            />
          )}
          {showTimePicker && <TimePicker />}
        </div>
      </PopoverContent>
    </Popover>
  )
}
