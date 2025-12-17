'use client'

import React from 'react'
import { buttonVariants } from '~/components/website/ui/button'
import { ScrollArea } from '~/components/website/ui/scroll-area'
import { cn } from '~/lib/utils'
import { useSmartDatetimeInput } from './context'
import {
  TIME_INCREMENT_MINUTES,
  TOTAL_TIME_SLOTS,
  type DisplayTimeFragments,
  buildDisplayTime,
  parseDisplayTime,
} from './utils'

const getTimeFromContext = (time: string, fallback?: Date): DisplayTimeFragments => {
  const parsed = parseDisplayTime(time)
  if (parsed) return parsed

  const reference = fallback ?? new Date()
  const hour24 = reference.getHours()
  return {
    hour24,
    hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minutes: reference.getMinutes(),
    period: hour24 >= 12 ? 'PM' : 'AM',
    display: buildDisplayTime(hour24, Math.floor(reference.getMinutes() / TIME_INCREMENT_MINUTES)),
  }
}

const getCalendarHeight = () => {
  if (typeof document === 'undefined') return undefined
  return document.getElementById('calendar')?.style.height
}

export const TimePicker = () => {
  const { value, onValueChange, Time, onTimeChange } = useSmartDatetimeInput()
  const [activeIndex, setActiveIndex] = React.useState(-1)

  const formatSelectedTime = React.useCallback(
    (timeLabel: string, hour24: number, quarterIndex: number) => {
      onTimeChange(timeLabel)
      const nextValue = value ? new Date(value) : new Date()
      nextValue.setHours(hour24, quarterIndex === 0 ? 0 : TIME_INCREMENT_MINUTES * quarterIndex)
      onValueChange(nextValue)
    },
    [value, onValueChange, onTimeChange],
  )

  const moveFocus = React.useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((previous) => {
        const nextIndex = (previous + direction + TOTAL_TIME_SLOTS) % TOTAL_TIME_SLOTS
        if (typeof document !== 'undefined') {
          document.getElementById(`time-${nextIndex}`)?.focus()
        }
        return nextIndex
      })
    },
    [],
  )

  const setElement = React.useCallback(() => {
    if (typeof document === 'undefined') return
    const currentElm = document.getElementById(`time-${activeIndex}`)
    if (!currentElm) return
    const label = currentElm.textContent ?? ''
    const parsed = parseDisplayTime(label)
    if (!parsed) return
    const quarterIndex = Math.floor(parsed.minutes / TIME_INCREMENT_MINUTES)
    formatSelectedTime(label, parsed.hour24, quarterIndex)
  }, [activeIndex, formatSelectedTime])

  const handleKeydown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      event.stopPropagation()

      switch (event.key) {
        case 'ArrowUp':
          moveFocus(-1)
          break
        case 'ArrowDown':
          moveFocus(1)
          break
        case 'Escape':
          setActiveIndex(-1)
          break
        case 'Enter':
          setElement()
          break
        default:
          break
      }
    },
    [moveFocus, setElement],
  )

  const handleClick = React.useCallback(
    (hour24: number, quarterIndex: number, currentIndex: number) => {
      const label = buildDisplayTime(hour24, quarterIndex)
      formatSelectedTime(label, hour24, quarterIndex)
      setActiveIndex(currentIndex)
    },
    [formatSelectedTime],
  )

  const currentTime = React.useMemo(() => getTimeFromContext(Time, value), [Time, value])

  React.useEffect(() => {
    if (activeIndex < 0 || typeof document === 'undefined') return
    document.getElementById(`time-${activeIndex}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  React.useEffect(() => {
    const quarterIndex = Math.floor(currentTime.minutes / TIME_INCREMENT_MINUTES)
    const nextActive = currentTime.hour24 * 4 + quarterIndex
    setActiveIndex(nextActive)
  }, [currentTime.hour24, currentTime.minutes])

  const height = React.useMemo(() => getCalendarHeight(), [])

  return (
    <div className="space-y-2 pr-3 py-3">
      <h3 className="text-sm font-medium text-center">Time</h3>
      <ScrollArea
        onKeyDown={handleKeydown}
        className="h-[90%] w-full focus-visible:outline-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 py-0.5"
        style={{ height }}
      >
        <ul className={cn('flex items-center flex-col gap-1 h-full max-h-56 w-28 px-1 py-0.5')}>
          {Array.from({ length: 24 }).map((_, hour24) => {
            const period = hour24 >= 12 ? 'PM' : 'AM'
            const hour12 = hour24 === 0 || hour24 === 12 ? 12 : hour24 % 12
            return Array.from({ length: 4 }).map((_, quarterIndex) => {
              const label = buildDisplayTime(hour24, quarterIndex)
              const trueIndex = hour24 * 4 + quarterIndex
              const minutesDifference = Math.abs(quarterIndex * TIME_INCREMENT_MINUTES - currentTime.minutes)
              const matchesHour = currentTime.hour24 === hour24 || currentTime.hour12 === hour12
              const matchesMinutes =
                currentTime.minutes <= 53
                  ? minutesDifference < Math.ceil(TIME_INCREMENT_MINUTES / 2)
                  : minutesDifference < TIME_INCREMENT_MINUTES
              const isSelected = matchesHour && currentTime.period === period && matchesMinutes
              const isSuggested = !value && isSelected

              return (
                <li
                  tabIndex={isSelected ? 0 : -1}
                  id={`time-${trueIndex}`}
                  key={`time-${trueIndex}`}
                  aria-label="currentTime"
                  className={cn(
                    buttonVariants({
                      variant: isSuggested ? 'secondary' : isSelected ? 'default' : 'outline-solid',
                    }),
                    'h-8 px-3 w-full text-sm focus-visible:outline-0 outline-0 focus-visible:border-0 cursor-default ring-0',
                  )}
                  onClick={() => handleClick(hour24, quarterIndex, trueIndex)}
                  onFocus={() => isSuggested && setActiveIndex(trueIndex)}
                >
                  {label}
                </li>
              )
            })
          })}
        </ul>
      </ScrollArea>
    </div>
  )
}
