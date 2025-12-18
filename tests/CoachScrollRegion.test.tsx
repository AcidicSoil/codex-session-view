import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CoachScrollProvider, CoachScrollRegion } from '~/components/chatbot/CoachScrollRegion'

describe('CoachScrollRegion', () => {
  it('announces focus changes and exposes shared instructions', () => {
    render(
      <CoachScrollProvider>
        <CoachScrollRegion label="Chat Dock" order={1}>
          <div>Chat content</div>
        </CoachScrollRegion>
        <CoachScrollRegion label="AI Analysis" order={2}>
          <div>Analysis content</div>
        </CoachScrollRegion>
      </CoachScrollProvider>,
    )

    const chatRegion = screen.getByLabelText('Chat Dock')
    fireEvent.focus(chatRegion)
    expect(chatRegion).toHaveAttribute('aria-describedby')
    expect(chatRegion).toHaveAttribute('data-coach-scroll-active', 'true')
    expect(screen.getByText('Focused scroll region: Chat Dock')).toBeInTheDocument()

    fireEvent.wheel(chatRegion, { deltaY: 200, shiftKey: true })
    expect(screen.getByText('Focused scroll region: AI Analysis')).toBeInTheDocument()
  })
})
