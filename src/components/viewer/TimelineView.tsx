import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface TimelineViewProps<T> {
  items: readonly T[];
  height?: number;
  estimateItemHeight?: number;
  overscanPx?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyForIndex?: (item: T, index: number) => React.Key;
  className?: string;
  scrollToIndex?: number | null;
}

function useRafThrottle(fn: () => void) {
  const ticking = useRef(false);
  return useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    const schedule =
      typeof window !== 'undefined'
        ? window.requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16);
    schedule(() => {
      ticking.current = false;
      fn();
    });
  }, [fn]);
}

function lowerBound(prefix: ReadonlyArray<number>, target: number) {
  let lo = 0;
  let hi = prefix.length - 1;
  let ans = prefix.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((prefix[mid] ?? 0) >= target) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return ans;
}

export function TimelineView<T>({
  items,
  height = 600,
  estimateItemHeight = 80,
  overscanPx = 400,
  renderItem,
  keyForIndex,
  className,
  scrollToIndex = null,
}: TimelineViewProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measured, setMeasured] = useState<Map<number, number>>(new Map());

  const onScroll = useRafThrottle(() => {
    const el = containerRef.current;
    if (el) setScrollTop(el.scrollTop);
  });

  const { offsets, totalHeight } = useMemo(() => {
    const n = items.length;
    const heights = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      heights[i] = measured.get(i) ?? estimateItemHeight;
    }
    const off = new Array<number>(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      off[i] = acc;
      acc += heights[i] ?? estimateItemHeight;
    }
    return { offsets: off, totalHeight: acc };
  }, [items.length, measured, estimateItemHeight]);

  const start = useMemo(() => {
    const target = Math.max(0, scrollTop - overscanPx);
    const idx = lowerBound(offsets, target);
    return Math.max(0, Math.min(idx, items.length - 1));
  }, [offsets, scrollTop, overscanPx, items.length]);

  const end = useMemo(() => {
    const target = Math.min(totalHeight, scrollTop + height + overscanPx);
    const idx = lowerBound(offsets, target);
    return Math.max(start, Math.min(items.length - 1, idx));
  }, [offsets, totalHeight, scrollTop, height, overscanPx, items.length, start]);

  const handleMeasured = useCallback(
    (index: number, h: number) => {
      const prev = measured.get(index) ?? 0;
      if (Math.abs(prev - h) > 1) {
        setMeasured((map) => {
          const next = new Map(map);
          next.set(index, h);
          return next;
        });
      }
    },
    [measured]
  );

  const visible: number[] = [];
  for (let i = start; i <= end; i++) visible.push(i);

  if (scrollToIndex != null) {
    const el = containerRef.current;
    if (el && scrollToIndex >= 0 && scrollToIndex < items.length) {
      const top = offsets[scrollToIndex] ?? 0;
      if (Math.abs(el.scrollTop - top) > 4) {
        el.scrollTop = top;
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height, overflowY: 'auto', position: 'relative' }}
      className={className}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visible.map((index) => {
          const item = items[index];
          if (item === undefined) return null;
          const top = offsets[index] ?? 0;
          const key = keyForIndex ? keyForIndex(item, index) : index;
          return (
            <Row key={key} top={top} onMeasured={(h) => handleMeasured(index, h)}>
              {renderItem(item, index)}
            </Row>
          );
        })}
      </div>
    </div>
  );
}

function Row({
  top,
  onMeasured,
  children,
}: {
  top: number;
  onMeasured: (h: number) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    onMeasured(el.getBoundingClientRect().height);
  });
  return (
    <div ref={ref} style={{ position: 'absolute', top, left: 0, right: 0 }}>
      {children}
    </div>
  );
}
