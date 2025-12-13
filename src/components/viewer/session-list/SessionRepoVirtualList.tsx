import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { TimelineView } from '~/components/viewer/TimelineView';
import type { SearchMatcher } from '~/utils/search';
import { SessionCard } from './SessionCard';

interface SessionRepoVirtualListProps {
  sessions: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
  searchMatchers?: SearchMatcher[];
  onSelectionChange?: (path: string | null) => void;
}

interface SessionTimelineItem {
  session: DiscoveredSessionAsset;
  index: number;
}

export function SessionRepoVirtualList({
  sessions,
  snapshotTimestamp,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onAddSessionToChat,
  searchMatchers,
  onSelectionChange,
}: SessionRepoVirtualListProps) {
  const items = useMemo<SessionTimelineItem[]>(() => sessions.map((session, index) => ({ session, index })), [sessions]);
  const [gradients, setGradients] = useState({ top: 0, bottom: 0 });
  const viewportHeight = items.length ? Math.max(Math.min(items.length * 96, 520), 220) : 200;
  const scrollToIndex = useMemo(() => {
    if (!selectedSessionPath) return null;
    const targetIndex = items.findIndex((item) => item.session.path === selectedSessionPath);
    return targetIndex >= 0 ? targetIndex : null;
  }, [items, selectedSessionPath]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-background/70">
      <TimelineView
        items={items}
        height={viewportHeight}
        estimateItemHeight={104}
        overscanPx={200}
        keyForIndex={(item) => `${item.session.path}:${item.index}`}
        scrollToIndex={scrollToIndex}
        onScrollChange={({ scrollTop, totalHeight, height }) => {
          const top = Math.min(scrollTop / 80, 1);
          const bottomDistance = totalHeight - (scrollTop + height);
          const bottom = totalHeight <= height ? 0 : Math.min(bottomDistance / 80, 1);
          setGradients({ top, bottom });
        }}
        renderItem={(item) => (
          <motion.div
            className="px-3 pb-4 pt-2"
            initial={{ opacity: 0.6, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <SessionCard
              session={item.session}
              snapshotTimestamp={snapshotTimestamp}
              onSessionOpen={(session) => {
                onSelectionChange?.(session.path);
                return onSessionOpen?.(session);
              }}
              isLoading={loadingSessionPath === item.session.path}
              isSelected={selectedSessionPath === item.session.path}
              onAddToChat={onAddSessionToChat}
              searchMatchers={searchMatchers}
            />
          </motion.div>
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent"
        style={{ opacity: gradients.top }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
        style={{ opacity: gradients.bottom }}
      />
    </div>
  );
}
