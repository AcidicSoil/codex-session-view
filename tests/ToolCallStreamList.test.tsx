import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolCallStreamList } from '~/components/chatbot/ToolCallStreamList'
import type { StreamingToolCall } from '~/lib/chatbot/chatStreamTypes'

const baseCall: StreamingToolCall = {
  toolCallId: 'tool-1',
  toolName: 'get_timeline_event',
  input: { eventNumber: 15 },
  status: 'succeeded',
  providerExecuted: true,
  dynamic: false,
  output: undefined,
}

describe('ToolCallStreamList', () => {
  it('renders a timeline card when tool output includes events', () => {
    const call: StreamingToolCall = {
      ...baseCall,
      output: {
        events: [
          {
            eventNumber: 15,
            heading: 'Deploy API change',
            summary: 'Updated handler',
            eventType: 'tool',
            context: {
              eventIndex: 12,
              displayIndex: 15,
              eventId: 'evt-15',
              eventType: 'tool',
              summary: 'Deploy API change',
            },
          },
        ],
      },
    }
    render(<ToolCallStreamList toolCalls={[call]} />)
    expect(screen.getByText('#15')).toBeInTheDocument()
    expect(screen.getByText('Deploy API change')).toBeInTheDocument()
  })

  it('falls back to JSON rendering for non-timeline tools', () => {
    const call: StreamingToolCall = {
      ...baseCall,
      toolCallId: 'tool-2',
      toolName: 'diagnose_repo',
      output: { stats: 3 },
    }
    render(<ToolCallStreamList toolCalls={[call]} />)
    expect(screen.getByText('diagnose_repo')).toBeInTheDocument()
    expect(screen.getByText(/"stats": 3/)).toBeInTheDocument()
  })
})
