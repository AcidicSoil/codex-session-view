import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTimelineSearchNavigation } from '~/components/viewer/TimelineSearchNavigation.hooks'

describe('useTimelineSearchNavigation', () => {
  it('cycles through matches with wrapping navigation', () => {
    const { result, rerender } = renderHook(
      (props: { totalMatches: number; resetToken: string }) =>
        useTimelineSearchNavigation(props),
      {
        initialProps: { totalMatches: 3, resetToken: 'alpha' },
      },
    )

    expect(result.current.activeIndex).toBe(0)
    act(() => result.current.goNext())
    expect(result.current.activeIndex).toBe(1)
    act(() => result.current.goNext())
    expect(result.current.activeIndex).toBe(2)
    act(() => result.current.goNext())
    expect(result.current.activeIndex).toBe(0)
    act(() => result.current.goPrev())
    expect(result.current.activeIndex).toBe(2)

    rerender({ totalMatches: 3, resetToken: 'beta' })
    expect(result.current.activeIndex).toBe(0)
  })

  it('clamps index when matches shrink and clears when matches disappear', () => {
    const { result, rerender } = renderHook(
      (props: { totalMatches: number; resetToken: string }) =>
        useTimelineSearchNavigation(props),
      {
        initialProps: { totalMatches: 2, resetToken: 'search' },
      },
    )

    act(() => result.current.goNext())
    expect(result.current.activeIndex).toBe(1)

    rerender({ totalMatches: 1, resetToken: 'search' })
    expect(result.current.activeIndex).toBe(0)

    rerender({ totalMatches: 0, resetToken: 'search' })
    expect(result.current.activeIndex).toBeNull()
  })

  it('ignores navigation commands when there are no matches', () => {
    const { result } = renderHook(() =>
      useTimelineSearchNavigation({ totalMatches: 0, resetToken: '' }),
    )

    expect(result.current.activeIndex).toBeNull()
    act(() => {
      result.current.goNext()
      result.current.goPrev()
    })
    expect(result.current.activeIndex).toBeNull()
  })
})
