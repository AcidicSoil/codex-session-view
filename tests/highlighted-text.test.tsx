import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HighlightedText } from '~/components/ui/highlighted-text'

describe('HighlightedText', () => {
  it('renders mark elements for matches', () => {
    render(<HighlightedText text="alpha beta" query="alpha" />)
    const mark = screen.getByText('alpha')
    expect(mark.tagName.toLowerCase()).toBe('mark')
  })

  it('falls back to plain text without matches', () => {
    render(<HighlightedText text="alpha" query="" />)
    expect(screen.getByText('alpha').tagName.toLowerCase()).toBe('span')
  })
})

