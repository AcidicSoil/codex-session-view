import { ClientOnly, useLoaderData } from '@tanstack/react-router'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
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
import type { ChatRemediationMetadata } from '~/features/chatbot/chatbot.runtime'
import { MisalignmentBanner } from '~/components/chatbot/MisalignmentBanner'
import { pickHigherSeverity, selectPrimaryMisalignment } from '~/features/chatbot/severity'

interface SessionCoachPrefill {
  prompt: string
  metadata?: ChatRemediationMetadata
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
  const discovery = useViewerDiscovery({ loader });
  const uploadController = useUploadController({
    loader,
    onUploadsPersisted: (assets) => discovery.appendSessionAssets(assets, 'upload'),
  });
  const [navValue, setNavValue] = useState<'timeline' | 'explorer' | 'chat'>('timeline');
  const [tabValue, setTabValue] = useState<'timeline' | 'explorer'>('timeline');
  const [timelineFiltersSlot, setTimelineFiltersSlot] = useState<ReactNode | null>(null);
  const [explorerFiltersSlot, setExplorerFiltersSlot] = useState<ReactNode | null>(null);
  const sessionCoach = loaderData?.sessionCoach
  const misalignments = sessionCoach?.misalignments ?? []
  const flaggedEventMarkers = useMemo(() => {
    if (!sessionCoach?.featureEnabled) {
      return new Map<number, TimelineFlagMarker>()
    }
    return buildFlaggedEventMap(misalignments)
  }, [misalignments, sessionCoach?.featureEnabled])
  const [coachPrefill, setCoachPrefill] = useState<SessionCoachPrefill | null>(null)
  const handleAddTimelineEventToChat = (event: TimelineEvent, index: number) => {
    logInfo('viewer.chatdock', 'Timeline event add-to-chat requested', {
      eventType: event.type,
      index,
    });
  };
  const handleAddSessionToChat = (asset: DiscoveredSessionAsset) => {
    logInfo('viewer.chatdock', 'Session add-to-chat requested', {
      path: asset.path,
      repo: asset.repoLabel ?? asset.repoName,
    });
  };
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
      setCoachPrefill(payload)
      handleNavChange('chat')
    },
    [handleNavChange],
  )

  const handleFlaggedEventClick = useCallback(
    (marker: TimelineFlagMarker) => {
      handleRemediationPrefill(marker.misalignments)
    },
    [handleRemediationPrefill],
  )

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
            {sessionCoach?.featureEnabled ? (
              <MisalignmentBanner misalignments={misalignments} onReview={handleRemediationPrefill} />
            ) : null}
            <aside
              id="viewer-chat"
              className="rounded-3xl border border-border/60 bg-background/80 p-4 shadow-inner"
            >
              <ChatDockPanel
                sessionId={loaderData?.sessionId ?? 'demo-session'}
                state={sessionCoach}
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

function buildRemediationPrefill(records: MisalignmentRecord[]): SessionCoachPrefill | null {
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
