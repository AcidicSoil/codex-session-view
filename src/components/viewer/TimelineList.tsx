import { memo, useMemo } from 'react';
import type { ResponseItem, FunctionCallEvent, FileChangeEvent } from '~/lib/viewer-types';
import { eventKey } from '~/utils/event-key';
import { EventCard } from './EventCard';
import { TimelineView } from './TimelineView';

interface TimelineListProps {
  events: readonly ResponseItem[];
  height?: number;
}

// Detect tool calls that are actually file operations and transform them
// into FileChange events for better visualization
function normalizeEvent(event: ResponseItem): ResponseItem {
  if (event.type === 'FunctionCall') {
    const fn = event as FunctionCallEvent;

    // Handle apply_patch or write_file calls
    if (fn.name === 'apply_patch' || fn.name === 'write_file') {
      const args = fn.args as Record<string, any> | undefined;

      if (args?.path && typeof args.path === 'string') {
        // Create a synthetic FileChange event
        return {
          ...event, // Keep original ID, timestamp, etc.
          type: 'FileChange',
          path: args.path,
          // Store the diff or content if available to be rendered
          diff: args.diff || args.content || args.code,
        } as FileChangeEvent;
      }
    }
  }
  return event;
}

export const TimelineList = memo(function TimelineList({
  events,
  height = 720,
}: TimelineListProps) {
  // Apply normalization during the map step
  const items = useMemo(
    () =>
      events.map((ev, index) => {
        const normalized = normalizeEvent(ev);
        return {
          ev: normalized,
          index,
          key: eventKey(ev, index),
        };
      }),
    [events]
  );

  return (
    <TimelineView
      items={items}
      height={height}
      estimateItemHeight={140}
      keyForIndex={(item) => item.key}
      renderItem={(item) => (
        <div className="px-1 pb-4">
          <EventCard item={item.ev} index={item.index} />
        </div>
      )}
    />
  );
});
