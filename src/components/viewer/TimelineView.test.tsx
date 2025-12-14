import { describe, expect, it, vi } from 'vitest'
import { render, act } from '@testing-library/react'

import { TimelineView, findLastOffsetBeforeOrEqual } from './TimelineView'

describe('findLastOffsetBeforeOrEqual', () => {
  it('keeps the current row visible when the target is inside a tall item', () => {
    const offsets = [0, 800, 1200]
    expect(findLastOffsetBeforeOrEqual(offsets, 0)).toBe(0)
    expect(findLastOffsetBeforeOrEqual(offsets, 200)).toBe(0)
    expect(findLastOffsetBeforeOrEqual(offsets, 799)).toBe(0)
  })

  it('advances once the target moves past the tall item bottom', () => {
    const offsets = [0, 800, 1200]
    expect(findLastOffsetBeforeOrEqual(offsets, 800)).toBe(1)
    expect(findLastOffsetBeforeOrEqual(offsets, 1000)).toBe(1)
    expect(findLastOffsetBeforeOrEqual(offsets, 1600)).toBe(2)
  })

  it('handles empty offset arrays', () => {
    expect(findLastOffsetBeforeOrEqual([], 100)).toBe(-1)
  })
})

describe('TimelineView scrollToIndex behavior', () => {
  it('does not continuously force scroll repositioning', () => {
    const items = Array.from({ length: 6 }, (_, index) => index)
    const originalScrollTo = window.HTMLElement.prototype.scrollTo
    window.HTMLElement.prototype.scrollTo = function scrollTo(options?: number | ScrollToOptions) {
      if (!options) return
      if (typeof options === 'number') {
        this.scrollTop = options
        return
      }
      this.scrollTop = options.top ?? 0
    }
    const scrollSpy = vi.spyOn(window.HTMLElement.prototype, 'scrollTo')

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })

    const { container, rerender } = render(
      <TimelineView
        className="test-scroll"
        items={items}
        height={200}
        estimateItemHeight={100}
        scrollToIndex={2}
        renderItem={(item) => <div>Item {item}</div>}
      />,
    )

    expect(scrollSpy).toHaveBeenCalledTimes(1)

    const scrollNode = container.querySelector('.test-scroll') as HTMLDivElement
    expect(scrollNode).toBeTruthy()

    act(() => {
      scrollNode.dispatchEvent(new Event('scroll'))
    })

    rerender(
      <TimelineView
        className="test-scroll"
        items={items}
        height={200}
        estimateItemHeight={100}
        scrollToIndex={2}
        renderItem={(item) => <div>Item {item}</div>}
      />,
    )

    expect(scrollSpy).toHaveBeenCalledTimes(1)

    rafSpy.mockRestore()
    scrollSpy.mockRestore()
    if (originalScrollTo) {
      window.HTMLElement.prototype.scrollTo = originalScrollTo
    } else {
      // cleanup for jsdom versions without scrollTo defined
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore delete supports this at runtime
      delete window.HTMLElement.prototype.scrollTo
    }
  })
})
