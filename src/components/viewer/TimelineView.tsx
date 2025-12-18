import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface TimelineViewProps<T> {
  items: readonly T[];
  height?: number;
  estimateItemHeight?: number;
  overscanPx?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyForIndex?: (item: T, index: number) => React.Key;
  className?: string;
  scrollToIndex?: number | null;
  onScrollChange?: (state: { scrollTop: number; totalHeight: number; height: number }) => void;
  registerScrollContainer?: (node: HTMLDivElement | null) => void;
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

export function findLastOffsetBeforeOrEqual(prefix: ReadonlyArray<number>, target: number) {
  if (prefix.length === 0) return -1;
  let lo = 0;
  let hi = prefix.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((prefix[mid] ?? 0) <= target) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
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
  onScrollChange,
  registerScrollContainer,
}: TimelineViewProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measured, setMeasured] = useState<Map<number, number>>(new Map());
  const lastScrollSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    registerScrollContainer?.(containerRef.current);
    return () => registerScrollContainer?.(null);
  }, [registerScrollContainer]);

  const { offsets, totalHeight } = useMemo(() => {
    const n = items.length;
    const heights = Array.from({ length: n }, (_, index) => measured.get(index) ?? estimateItemHeight);
    let acc = 0;
    const offsets = heights.map((height) => {
      const value = acc;
      acc += height;
      return value;
    });
    return { offsets, totalHeight: acc };
  }, [items.length, measured, estimateItemHeight]);

  const onScroll = useRafThrottle(() => {
    const el = containerRef.current;
    if (el) {
      const nextTop = el.scrollTop;
      setScrollTop(nextTop);
      onScrollChange?.({ scrollTop: nextTop, totalHeight, height });
    }
  });

  const start = useMemo(() => {
    if (items.length === 0) return 0;
    const target = Math.max(0, scrollTop - overscanPx);
    const idx = findLastOffsetBeforeOrEqual(offsets, target);
    return Math.max(0, Math.min(idx, items.length - 1));
  }, [offsets, scrollTop, overscanPx, items.length]);

  const end = useMemo(() => {
    if (items.length === 0) return 0;
    const target = Math.min(totalHeight, scrollTop + height + overscanPx);
    const idx = findLastOffsetBeforeOrEqual(offsets, target);
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

  useEffect(() => {
    if (scrollToIndex == null) {
      lastScrollSignatureRef.current = null;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    if (scrollToIndex < 0 || scrollToIndex >= items.length) {
      return;
    }
    const baseTop = offsets[scrollToIndex] ?? 0;
    const signature = `${scrollToIndex}:${baseTop}:${totalHeight}:${height}`;
    if (lastScrollSignatureRef.current === signature) {
      return;
    }
    lastScrollSignatureRef.current = signature;
    const itemHeight = measured.get(scrollToIndex) ?? estimateItemHeight;
    const maxScrollTop = Math.max(0, totalHeight - height);
    const centeredTop = baseTop - height / 2 + itemHeight / 2;
    const clampedTop = Math.max(0, Math.min(maxScrollTop, centeredTop));
    if (Math.abs(el.scrollTop - clampedTop) > 4) {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: clampedTop, behavior: 'smooth' });
      } else {
        el.scrollTop = clampedTop;
      }
    }
  }, [estimateItemHeight, height, items.length, measured, offsets, scrollToIndex, totalHeight]);

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
