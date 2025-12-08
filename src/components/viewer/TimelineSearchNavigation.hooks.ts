import { useCallback, useEffect, useState } from 'react'

interface TimelineSearchNavigationOptions {
  totalMatches: number
  resetToken: string | number | null | undefined
}

export interface TimelineSearchNavigationState {
  activeIndex: number | null
  totalMatches: number
  hasMatches: boolean
  goNext: () => void
  goPrev: () => void
  reset: () => void
}

export function useTimelineSearchNavigation(
  options: TimelineSearchNavigationOptions,
): TimelineSearchNavigationState {
  const totalMatches = Math.max(0, options.totalMatches)
  const hasMatches = totalMatches > 0
  const [activeIndex, setActiveIndex] = useState<number | null>(hasMatches ? 0 : null)

  useEffect(() => {
    if (!options.resetToken) {
      if (!hasMatches) {
        setActiveIndex(null)
      }
      return
    }
    if (!hasMatches) {
      setActiveIndex(null)
      return
    }
    setActiveIndex(0)
  }, [options.resetToken, hasMatches])

  useEffect(() => {
    if (!hasMatches) {
      setActiveIndex(null)
      return
    }
    setActiveIndex((prev) => {
      if (prev == null) return 0
      if (prev >= totalMatches) {
        return totalMatches - 1
      }
      return prev
    })
  }, [hasMatches, totalMatches])

  const goNext = useCallback(() => {
    if (!hasMatches) return
    setActiveIndex((prev) => {
      if (prev == null) return 0
      return (prev + 1) % totalMatches
    })
  }, [hasMatches, totalMatches])

  const goPrev = useCallback(() => {
    if (!hasMatches) return
    setActiveIndex((prev) => {
      if (prev == null) return totalMatches - 1
      return (prev - 1 + totalMatches) % totalMatches
    })
  }, [hasMatches, totalMatches])

  const reset = useCallback(() => {
    if (!hasMatches) {
      setActiveIndex(null)
      return
    }
    setActiveIndex(0)
  }, [hasMatches])

  return {
    activeIndex,
    totalMatches,
    hasMatches,
    goNext,
    goPrev,
    reset,
  }
}
