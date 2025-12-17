import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { RuleInspectorSheet } from '~/components/chatbot/RuleInspectorSheet'
import { SessionRuleSheet } from '~/components/chatbot/SessionRuleSheet'
import { Button } from '~/components/ui/button'
import { NeuralGlow } from '~/components/ui/neural-glow'
import { cn } from '~/lib/utils'
import { formatCount } from '~/utils/intl'
import {
  VIEWER_CHAT_ROUTE_PATH,
  VIEWER_INSPECTOR_ROUTE_PATH,
  VIEWER_ROUTE_PATH,
} from './route-id'
import { useViewerWorkspace } from './viewer.workspace'

export function ViewerWorkspaceChrome() {
  const routerState = useRouterState({ select: (state) => state.location })
  const pathname = routerState.pathname ?? VIEWER_ROUTE_PATH
  const {
    loader,
    discovery,
    sessionCoachState,
    ruleSheetEntries,
    hookGate,
    handleHookGateJump,
    resolveEvidenceContext,
    activeSessionId,
    sessionEvents,
  } = useViewerWorkspace()
  const [isRuleInventoryOpen, setIsRuleInventoryOpen] = useState(false)

  const toggleRuleInventory = useCallback(() => {
    setIsRuleInventoryOpen((prev) => !prev)
  }, [])

  const closeRuleInventory = useCallback(() => {
    setIsRuleInventoryOpen(false)
  }, [])

  const navItems = useMemo(
    () => [
      {
        label: 'Explorer',
        description: 'Browse cached sessions',
        href: VIEWER_ROUTE_PATH,
        metric: `${formatCount(discovery.sessionAssets.length)} assets`,
        isActive: pathname === VIEWER_ROUTE_PATH || pathname === `${VIEWER_ROUTE_PATH}/`,
      },
      {
        label: 'Inspector',
        description: 'Timeline, uploads, hook gate',
        href: VIEWER_INSPECTOR_ROUTE_PATH,
        metric: `${formatCount(loader.state.events.length)} events`,
        isActive: pathname.startsWith(VIEWER_INSPECTOR_ROUTE_PATH),
      },
      {
        label: 'Chat',
        description: 'Session coach & instructions',
        href: VIEWER_CHAT_ROUTE_PATH,
        metric: sessionCoachState?.featureEnabled ? 'Live' : 'Offline',
        isActive: pathname.startsWith(VIEWER_CHAT_ROUTE_PATH),
      },
    ],
    [discovery.sessionAssets.length, loader.state.events.length, pathname, sessionCoachState?.featureEnabled],
  )

  return (
    <NeuralGlow variant="background" className="overflow-x-hidden px-4 py-10">
      <main className="mx-auto flex w-full min-h-screen max-w-6xl flex-col gap-6">
        <nav className="flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-4 shadow-lg backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full overflow-x-auto pb-1">
            <div className="grid min-w-full gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href as typeof VIEWER_ROUTE_PATH | typeof VIEWER_INSPECTOR_ROUTE_PATH | typeof VIEWER_CHAT_ROUTE_PATH}
                  className={cn(
                    'min-w-[220px] rounded-2xl border px-4 py-3 text-left transition-colors duration-150',
                    item.isActive
                      ? 'border-white/40 bg-white/10 text-white'
                      : 'border-white/10 text-white/70 hover:border-white/25 hover:text-white',
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">{item.metric}</p>
                  <p className="text-base font-semibold">{item.label}</p>
                  <p className="text-xs text-white/70">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex w-full justify-end lg:w-auto">
            <Button
              type="button"
              size="sm"
              variant={isRuleInventoryOpen ? 'default' : 'outline'}
              className={cn(
                'w-full border-white/30 text-white lg:w-auto',
                isRuleInventoryOpen ? 'bg-cyan-500/80 text-black hover:bg-cyan-400' : 'hover:border-white',
              )}
              onClick={toggleRuleInventory}
            >
              Review rules
            </Button>
          </div>
        </nav>
        <section className="flex-1 min-w-0">
          <Outlet />
        </section>
      </main>
      <RuleInspectorSheet
        gate={hookGate}
        ruleSheetEntries={ruleSheetEntries}
        activeSessionId={activeSessionId}
        sessionEvents={sessionEvents}
        onJumpToEvent={(index) => void handleHookGateJump(index)}
        resolveEventContext={resolveEvidenceContext}
      />
      {isRuleInventoryOpen ? (
        <RuleInventoryDrawer
          entries={ruleSheetEntries}
          activeSessionId={activeSessionId}
          onClose={closeRuleInventory}
          onNavigate={(index) => {
            void handleHookGateJump(index)
            closeRuleInventory()
          }}
        />
      ) : null}
    </NeuralGlow>
  )
}

export function ViewerSkeleton() {
  return (
    <NeuralGlow variant="background" className="px-4 py-10">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6">
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-96 animate-pulse rounded-3xl bg-muted" />
      </main>
    </NeuralGlow>
  )
}

interface RuleInventoryDrawerProps {
  entries: Awaited<ReturnType<typeof import('~/server/function/ruleInventory')['fetchRuleInventory']>>
  activeSessionId: string
  onClose: () => void
  onNavigate: (index: number) => void
}

function RuleInventoryDrawer({ entries, activeSessionId, onClose, onNavigate }: RuleInventoryDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close rule inventory"
        className="absolute inset-0 cursor-default bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-full max-w-md flex-col border-l border-white/15 bg-[#04060d]/95 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Rule Inventory</p>
            <p className="text-sm text-white/80">Session: {activeSessionId || 'Unbound'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/80 transition hover:border-white/40"
          >
            Close
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SessionRuleSheet entries={entries} activeSessionId={activeSessionId} onNavigateToEvent={onNavigate} />
        </div>
      </aside>
    </div>
  )
}
