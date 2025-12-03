import { ClientOnly, useLoaderData } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useFileLoader } from '~/hooks/useFileLoader'
import { DiscoverySection, useViewerDiscovery } from './viewer.discovery.section'
import { UploadControlsCard, UploadTimelineSection, useUploadController } from './viewer.upload.section'
import type { TimelineEvent } from '~/components/viewer/AnimatedTimelineList'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { logInfo } from '~/lib/logger'
import { WavyBackground } from '~/components/aceternity/wavy-background'
import { AnimatedTabs } from '~/components/aceternity/animated-tabs'
import { StickyScrollReveal, type StickySection } from '~/components/aceternity/sticky-scroll-reveal'
import { FloatingNavbar } from '~/components/aceternity/floating-navbar'
import { formatCount } from '~/utils/intl'
import { ViewerFilterDropdown } from '~/components/viewer/ViewerFilterDropdown'
import { Switch } from '~/components/ui/switch'
import { ChatDockPanel } from '~/components/chatbot/ChatDockPanel'
import { VIEWER_ROUTE_ID } from './route-id'
import type { ViewerSnapshot } from './viewer.loader'
import type { TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
import type { MisalignmentRecord } from '~/lib/sessions/model'
import type { CoachPrefillPayload, ChatRemediationMetadata } from '~/lib/chatbot/types'
import { MisalignmentBanner } from '~/components/chatbot/MisalignmentBanner'
import { pickHigherSeverity, selectPrimaryMisalignment } from '~/features/chatbot/severity'
import { hookifyAddToChat } from '~/server/function/hookifyAddToChat'
import { HookGateNotice } from '~/components/chatbot/HookGateNotice'
import type { HookDecisionSeverity, HookRuleSummary, HookSource } from '~/server/lib/hookifyRuntime'
import { toast } from 'sonner'
import { SessionRepoSelector } from '~/components/chatbot/SessionRepoSelector'
import { SessionRuleSheet } from '~/components/chatbot/SessionRuleSheet'
import { fetchChatbotState } from '~/server/function/chatbotState'
import { sessionRepoContext } from '~/server/function/sessionRepoContext'
import { fetchRuleInventory } from '~/server/function/ruleInventory'

interface HookGateState {
  blocked: boolean
  severity: HookDecisionSeverity
  message?: string
  annotations?: string
  rules: HookRuleSummary[]
  decisionId: string
}

export function ViewerPage() {
  return (
    <ClientOnly fallback={<ViewerSkeleton />}>
      <ViewerClient />
    </ClientOnly>
  );
}

export function ViewerClient() {
  const loaderData = useLoaderData({ from: VIEWER_ROUTE_ID }) as ViewerSnapshot | undefined
  const loader = useFileLoader();
  const initialSessionId = loaderData?.sessionId ?? 'demo-session'
  const [activeSessionId, setActiveSessionId] = useState(initialSessionId)
  const discovery = useViewerDiscovery({ loader });
  const uploadController = useUploadController({
    loader,
    onUploadsPersisted: (assets) => discovery.appendSessionAssets(assets, 'upload'),
  });
  const [navValue, setNavValue] = useState<'timeline' | 'explorer' | 'chat'>('timeline');
  const [tabValue, setTabValue] = useState<'timeline' | 'explorer'>('timeline');
  const [timelineFiltersSlot, setTimelineFiltersSlot] = useState<ReactNode | null>(null);
  const [explorerFiltersSlot, setExplorerFiltersSlot] = useState<ReactNode | null>(null);
  const [sessionCoachState, setSessionCoachState] = useState(loaderData?.sessionCoach ?? null)
  const [ruleSheetEntries, setRuleSheetEntries] = useState(loaderData?.ruleSheet ?? [])
  const [focusEventIndex, setFocusEventIndex] = useState<number | null>(null)
  const misalignments = sessionCoachState?.misalignments ?? []
  const flaggedEventMarkers = useMemo(() => {
    if (!sessionCoachState?.featureEnabled) {
      return new Map<number, TimelineFlagMarker>()
    }
    return buildFlaggedEventMap(misalignments)
  }, [misalignments, sessionCoachState?.featureEnabled])
  const [coachPrefill, setCoachPrefill] = useState<CoachPrefillPayload | null>(null)
  const [hookGate, setHookGate] = useState<HookGateState | null>(null)

  const refreshSessionCoach = useCallback(async (sessionId: string) => {
    try {
      const next = await fetchChatbotState({ data: { sessionId, mode: 'session' } })
      setSessionCoachState(next)
    } catch (error) {
      toast.error('Failed to refresh Session Coach', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [])

  const bindSessionToAsset = useCallback(
    async (sessionId: string, assetPath: string) => {
      try {
        await sessionRepoContext({
          data: {
            action: 'set',
            sessionId,
            assetPath,
          },
        })
      } catch (error) {
        toast.error('Failed to bind repo instructions', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        await refreshSessionCoach(sessionId)
        try {
          const inventory = await fetchRuleInventory({ data: {} })
          setRuleSheetEntries(inventory)
        } catch (error) {
          toast.error('Failed to refresh rule sheet', {
            description: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    },
    [refreshSessionCoach],
  )

  const selectedAsset = useMemo(() => {
    if (!discovery.selectedSessionPath) return null
    return discovery.sessionAssets.find((asset) => asset.path === discovery.selectedSessionPath) ?? null
  }, [discovery.sessionAssets, discovery.selectedSessionPath])

  const activeAssetPath = selectedAsset?.path ?? sessionCoachState?.repoContext?.assetPath ?? null

  useEffect(() => {
    if (focusEventIndex == null) return
    if (typeof window === 'undefined') return
    const timeout = window.setTimeout(() => setFocusEventIndex(null), 1200)
    return () => window.clearTimeout(timeout)
  }, [focusEventIndex])

  useEffect(() => {
    if (!selectedAsset) return
    const nextSessionId = deriveSessionId(selectedAsset.path)
    if (nextSessionId === activeSessionId) return
    setActiveSessionId(nextSessionId)
    void bindSessionToAsset(nextSessionId, selectedAsset.path)
  }, [selectedAsset, activeSessionId, bindSessionToAsset])

  const handleNavChange = useCallback(
    (nextValue: string) => {
      if (nextValue === 'timeline' || nextValue === 'explorer' || nextValue === 'chat') {
        setNavValue(nextValue);
        if (nextValue === 'timeline' || nextValue === 'explorer') {
          setTabValue(nextValue);
        }
        if (typeof document !== 'undefined') {
          const targetId = nextValue === 'chat' ? 'viewer-chat' : 'viewer-tabs';
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },
    [],
  );

  const runHookifyPrefill = useCallback(
    async (
      basePrompt: string,
      source: HookSource,
      extras?: { eventType?: string; filePath?: string },
      metadataOverride?: ChatRemediationMetadata,
    ) => {
      setHookGate(null);
      try {
        const response = await hookifyAddToChat({
          data: {
            sessionId: activeSessionId,
            source,
            content: basePrompt,
            eventType: extras?.eventType,
            filePath: extras?.filePath,
          },
        });
        setHookGate({
          blocked: response.blocked,
          severity: response.severity,
          message: response.message,
          annotations: response.annotations,
          rules: response.rules,
          decisionId: response.decisionId,
        });
        if (response.blocked || !response.prefill) {
          toast.error('Add to chat blocked', {
            description: response.message ?? 'Resolve AGENT violations before continuing.',
          });
          return;
        }
        const mergedPrefill: CoachPrefillPayload = {
          prompt: response.prefill.prompt,
          metadata: metadataOverride ?? response.prefill.metadata,
        };
        setCoachPrefill(mergedPrefill);
        handleNavChange('chat');
      } catch (error) {
        toast.error('Hookify check failed', {
          description: error instanceof Error ? error.message : 'Unable to evaluate AGENT rules.',
        });
      }
    },
    [handleNavChange, activeSessionId],
  );

  const handleAddTimelineEventToChat = (event: TimelineEvent, index: number) => {
    logInfo('viewer.chatdock', 'Timeline event add-to-chat requested', {
      eventType: event.type,
      index,
    });

    const snippet = JSON.stringify(event, null, 2);
    const prompt = `Analyze this timeline event #${index + 1} (${event.type}):\n\n\`\`\`json\n${snippet}\n\`\`\`\n\nWhat are the implications of this event?`;

    void runHookifyPrefill(prompt, 'timeline', {
      eventType: event.type,
      filePath: activeAssetPath ?? undefined,
    });
  };

  const handleAddSessionToChat = useCallback(
    (asset: DiscoveredSessionAsset) => {
      void (async () => {
        const targetSessionId = deriveSessionId(asset.path)
        let bindingPromise: Promise<void> | null = null
        if (targetSessionId !== activeSessionId) {
          setActiveSessionId(targetSessionId)
          discovery.setSelectedSessionPath(asset.path)
          bindingPromise = bindSessionToAsset(targetSessionId, asset.path)
        }

        if (bindingPromise) {
          await bindingPromise
        }

        logInfo('viewer.chatdock', 'Session add-to-chat requested', {
          path: asset.path,
          repo: asset.repoLabel ?? asset.repoName,
        })

        const prompt = `I am looking at session file: ${asset.path}\nRepo: ${asset.repoLabel ?? asset.repoName ?? 'unknown'}\n\nPlease analyze this session context.`

        await runHookifyPrefill(prompt, 'session', { filePath: asset.path })
      })()
    },
    [activeSessionId, bindSessionToAsset, discovery, runHookifyPrefill],
  )

  const navItems = useMemo(
    () => [
      {
        value: 'timeline',
        label: 'Timeline',
        description: 'Stream parsed events through the tracing beam list and jump straight into chat context.',
        eyebrow: 'Streaming',
        kpi: `${formatCount(loader.state.events.length)} events`,
      },
      {
        value: 'explorer',
        label: 'Session explorer',
        description: 'Browse cached repos, branches, and snapshot metadata discovered during startup.',
        eyebrow: 'Discovery',
        kpi: `${formatCount(discovery.sessionAssets.length)} assets`,
      },
      {
        value: 'chat',
        label: 'Chat dock',
        description: 'Annotate findings or draft follow-up prompts while the workspace stays in view.',
        eyebrow: 'Co-pilot',
        kpi: 'Live',
      },
    ],
    [discovery.sessionAssets.length, loader.state.events.length],
  );

  const handleTimelineFiltersRender = useCallback((node: ReactNode | null) => {
    setTimelineFiltersSlot(node);
  }, []);

  const handleExplorerFiltersRender = useCallback((node: ReactNode | null) => {
    setExplorerFiltersSlot(node);
  }, []);

  const handleRemediationPrefill = useCallback(
    (records: MisalignmentRecord[]) => {
      const payload = buildRemediationPrefill(records)
      if (!payload) return
      void runHookifyPrefill(
        payload.prompt,
        'manual',
        { filePath: activeAssetPath ?? undefined },
        payload.metadata,
      )
    },
    [runHookifyPrefill, activeAssetPath],
  )

  const handleFlaggedEventClick = useCallback(
    (marker: TimelineFlagMarker) => {
      handleRemediationPrefill(marker.misalignments)
    },
    [handleRemediationPrefill],
  )

  const handleHookGateJump = useCallback((index: number) => {
    setNavValue('timeline')
    setTabValue('timeline')
    setFocusEventIndex(index)
  }, [])

  const timelineSections: StickySection[] = [
    {
      id: 'timeline-events',
      eyebrow: 'Events',
      title: 'Timeline tracing beam',
      description: 'Filter, search, and send moments to chat as the tracing beam reveals activity.',
      content: (
        <UploadTimelineSection
          controller={uploadController}
          onAddTimelineEventToChat={handleAddTimelineEventToChat}
          className="border-none bg-transparent p-0 text-foreground"
          onFiltersRender={handleTimelineFiltersRender}
          flaggedEvents={flaggedEventMarkers}
          onFlaggedEventClick={handleFlaggedEventClick}
          focusEventIndex={focusEventIndex}
        />
      ),
    },
  ];

  const explorerSections: StickySection[] = [
    {
      id: 'explorer-view',
      eyebrow: 'Discovery',
      title: 'Session explorer snapshot',
      description: 'Branch badges, repo-level metadata, and cached uploads live inside the explorer tabs.',
      content: (
        <DiscoverySection
          {...discovery}
          onAddSessionToChat={handleAddSessionToChat}
          onFiltersRender={handleExplorerFiltersRender}
        />
      ),
    },
  ];

  const tabConfigs = [
    {
      value: 'timeline',
      label: 'Timeline',
      description: 'Upload & stream',
      content: <StickyScrollReveal sections={timelineSections} showSidebar={false} />,
    },
    {
      value: 'explorer',
      label: 'Session explorer',
      description: 'Snapshot browser',
      content: <StickyScrollReveal sections={explorerSections} showSidebar={false} />,
    },
  ];

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-none flex-col gap-8">
        <div className="sticky top-16 z-40 flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-black/40 p-4 shadow-lg backdrop-blur-xl">
          <FloatingNavbar items={navItems} value={navValue} onValueChange={handleNavChange} className="flex-1 min-w-[240px] bg-transparent" />
          <div className="flex items-center gap-3">
            <label htmlFor="persist-toggle" className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/70">
              Persist
              <Switch id="persist-toggle" checked={uploadController.persistEnabled} onCheckedChange={uploadController.setPersist} />
            </label>
            <ViewerFilterDropdown
              timelineFilters={timelineFiltersSlot}
              explorerFilters={explorerFiltersSlot}
              className="shrink-0"
            />
          </div>
        </div>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start">
          <WavyBackground className="p-4 sm:p-8">
            <div className="space-y-6">
              <section id="viewer-tabs" className="space-y-8">
                <AnimatedTabs tabs={tabConfigs} value={tabValue} onValueChange={(next) => {
                  setTabValue(next as 'timeline' | 'explorer');
                  setNavValue(next as 'timeline' | 'explorer');
                }} />
              </section>
            </div>
          </WavyBackground>
          <div className="flex flex-col gap-6 xl:sticky xl:top-32">
            <section>
              <UploadControlsCard controller={uploadController} className="rounded-3xl border border-white/15 bg-background/80 p-5" />
            </section>
            <section>
              <SessionRepoSelector
                sessionId={activeSessionId}
                assets={discovery.sessionAssets}
                repoContext={sessionCoachState?.repoContext}
                onRepoContextChange={async () => {
                  await refreshSessionCoach(activeSessionId)
                  try {
                    const inventory = await fetchRuleInventory({ data: {} })
                    setRuleSheetEntries(inventory)
                  } catch (error) {
                    toast.error('Failed to refresh rule sheet', {
                      description: error instanceof Error ? error.message : 'Unknown error',
                    })
                  }
                }}
              />
            </section>
            <section>
              <SessionRuleSheet entries={ruleSheetEntries} activeSessionId={activeSessionId} />
            </section>
            {sessionCoachState?.featureEnabled ? (
              <MisalignmentBanner misalignments={misalignments} onReview={handleRemediationPrefill} />
            ) : null}
            {hookGate ? (
              <HookGateNotice
                blocked={hookGate.blocked}
                severity={hookGate.severity}
                message={hookGate.message}
                annotations={hookGate.annotations}
                rules={hookGate.rules}
                onDismiss={() => setHookGate(null)}
                onJumpToEvent={handleHookGateJump}
              />
            ) : null}
            <aside
              id="viewer-chat"
              className="rounded-3xl border border-border/60 bg-background/80 p-4 shadow-inner"
            >
              <ChatDockPanel
                sessionId={activeSessionId}
                state={sessionCoachState}
                prefill={coachPrefill}
                onPrefillConsumed={() => setCoachPrefill(null)}
              />
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function ViewerSkeleton() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-96 animate-pulse rounded-3xl bg-muted" />
    </main>
  )
}

function deriveSessionId(assetPath: string) {
  const trimmed = assetPath.trim()
  if (!trimmed) return 'session-unbound'
  if (typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(trimmed)
    let hex = ''
    for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, '0')
      if (hex.length >= 40) break
    }
    if (hex) {
      return `session-${hex}`
    }
  }
  const slug = trimmed.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug ? `session-${slug}` : 'session-unbound'
}

function buildFlaggedEventMap(misalignments: MisalignmentRecord[]): Map<number, TimelineFlagMarker> {
  const map = new Map<number, TimelineFlagMarker>()
  misalignments.forEach((record) => {
    if (record.status !== 'open') return
    const range = record.eventRange
    if (!range) return
    const start = typeof range.startIndex === 'number' ? range.startIndex : 0
    const end = typeof range.endIndex === 'number' ? range.endIndex : start
    for (let index = start; index <= end; index += 1) {
      const existing = map.get(index)
      if (existing) {
        map.set(index, {
          severity: pickHigherSeverity(existing.severity, record.severity),
          misalignments: [...existing.misalignments, record],
        })
      } else {
        map.set(index, { severity: record.severity, misalignments: [record] })
      }
    }
  })
  return map
}

function buildRemediationPrefill(records: MisalignmentRecord[]): CoachPrefillPayload | null {
  if (!records.length) {
    return null
  }
  const primary = selectPrimaryMisalignment(records)
  if (!primary) {
    return null
  }
  const range = primary.eventRange
    ? `events ${primary.eventRange.startIndex}-${primary.eventRange.endIndex}`
    : 'the linked events'
  const evidence = primary.evidence?.map((entry) => entry.message).filter(Boolean).join('; ')
  const supporting = records.filter((record) => record.id !== primary.id)
  const supportingLine = supporting.length
    ? `Additional rules involved: ${supporting.map((record) => `${record.ruleId} "${record.title}"`).join(', ')}.`
    : ''
  const prompt =
    [
      `Remediate AGENT rule ${primary.ruleId} "${primary.title}" (${primary.severity}).`,
      `It was flagged around ${range}.`,
      `Summary: ${primary.summary}.`,
      evidence ? `Evidence: ${evidence}.` : null,
      supportingLine || null,
      'Outline concrete steps to resolve these violations and confirm mitigations.',
    ]
      .filter(Boolean)
      .join(' ')

  return {
    prompt,
    metadata: {
      misalignmentId: primary.id,
      ruleId: primary.ruleId,
      severity: primary.severity,
      eventRange: primary.eventRange
        ? { startIndex: primary.eventRange.startIndex, endIndex: primary.eventRange.endIndex }
        : undefined,
    },
  }
}
