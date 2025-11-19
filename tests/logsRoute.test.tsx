import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserLogSnapshot } from '~/server/function/browserLogs'
import { LogsPage, Route } from 	"~/routes/(site)/logs"

const mockRouter = {
  invalidate: vi.fn(),
}

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useRouter: () => mockRouter,
  }
})

vi.mock('~/utils/intl', () => ({
  formatDateTime: (value: unknown) => `formatted:${String(value)}`,
}))

const loaderSpy = vi.spyOn(Route, 'useLoaderData')

function mockSnapshot(overrides: Partial<BrowserLogSnapshot> = {}): BrowserLogSnapshot {
  return {
    text: 'Fixture log text',
    source: 'dev.log',
    truncated: false,
    updatedAt: '2024-05-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('LogsPage', () => {
  beforeEach(() => {
    mockRouter.invalidate.mockReset()
    loaderSpy.mockReset()
  })

  it('renders the snapshot details and truncated notice', () => {
    loaderSpy.mockReturnValue({
      snapshot: mockSnapshot({ truncated: true, source: 'browser.log', text: 'alpha log entry' }),
    })

    render(<LogsPage />)

    expect(screen.getByText(/Latest file: browser\.log/i)).toBeInTheDocument()
    expect(screen.getByText(/formatted:2024-05-01T00:00:00.000Z/)).toBeInTheDocument()
    expect(screen.getByText(/Showing most recent entries/i)).toBeInTheDocument()
    expect(screen.getByText(/alpha log entry/)).toBeInTheDocument()
  })

  it('invalidates the router when refresh is clicked', async () => {
    loaderSpy.mockReturnValue({ snapshot: mockSnapshot() })
    const user = userEvent.setup()

    render(<LogsPage />)

    await user.click(screen.getByRole('button', { name: /refresh logs/i }))

    expect(mockRouter.invalidate).toHaveBeenCalledTimes(1)
  })
})
