# You Asked:

how can we parse the apply_patch tool calls from the timeline list props so the look like the actual files they are attempting to patch instead of shell commands ? 

# Gemini Responded:

To address your request, we can intercept the `apply_patch` tool calls within the `TimelineList` component and transform them into `FileChange` events before they are rendered. This will cause them to be displayed using the "FileChange" styling (showing the file path and using the file accent color) instead of the generic raw JSON format of a function call.

I will also update `EventCard.tsx` to ensure that if a `diff` or `code` snippet is present in the file change event, it gets displayed along with the path.

Here are the updated files:

### 1\. `src/components/viewer/TimelineList.tsx`

I've added a `normalizeEvent` function that checks for `FunctionCall` events named `apply_patch` (or `write_file`) and converts them into `FileChange` events.

```typescript
import { memo, useMemo } from "react"
import type { ResponseItem, FunctionCallEvent, FileChangeEvent } from "~/lib/viewer-types"
import { eventKey } from "~/utils/event-key"
import { EventCard } from "./EventCard"
import { TimelineView } from "./TimelineView"

interface TimelineListProps {
    events: readonly ResponseItem[]
    height?: number
}

// Detect tool calls that are actually file operations and transform them
// into FileChange events for better visualization
function normalizeEvent(event: ResponseItem): ResponseItem {
    if (event.type === "FunctionCall") {
        const fn = event as FunctionCallEvent
        
        // Handle apply_patch or write_file calls
        if (fn.name === "apply_patch" || fn.name === "write_file") {
            const args = fn.args as Record<string, any> | undefined
            
            if (args?.path && typeof args.path === "string") {
                // Create a synthetic FileChange event
                return {
                    ...event, // Keep original ID, timestamp, etc.
                    type: "FileChange",
                    path: args.path,
                    // Store the diff or content if available to be rendered
                    diff: args.diff || args.content || args.code, 
                } as FileChangeEvent
            }
        }
    }
    return event
}

export const TimelineList = memo(function TimelineList({ events, height = 720 }: TimelineListProps) {
    // Apply normalization during the map step
    const items = useMemo(() => events.map((ev, index) => {
        const normalized = normalizeEvent(ev)
        return { 
            ev: normalized, 
            index, 
            key: eventKey(ev, index) 
        }
    }), [events])

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
    )
})
```

### 2\. `src/components/viewer/EventCard.tsx`

I've updated `renderSummary` for `FileChange` events to display the `diff` if it exists. Previously, it only returned the path.

```typescript
import { Card } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { BorderBeam } from "~/components/ui/border-beam"
import type { MessagePart, ResponseItem } from "~/lib/viewer-types"
import { cn } from "~/lib/utils"
import { formatDateTime } from "~/utils/intl"

function formatTimestamp(value?: string | number) {
    if (!value) return null
    const formatted = formatDateTime(value, { fallback: "" })
    return formatted || String(value)
}

function summarizeShellSnippet(event: Extract<ResponseItem, { type: "LocalShellCall" }>) {
    const preferred = event.stdout?.trim() || event.stderr?.trim() || event.command || ""
    const firstLine = preferred.split("\n").find((line) => line.trim().length > 0) ?? preferred
    return truncateSnippet(firstLine.trim(), 140)
}

function truncateSnippet(value: string, limit = 140) {
    if (!value) return ""
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function renderSummary(event: ResponseItem) {
    switch (event.type) {
        case "Message": {
            const text = typeof event.content === "string"
                ? event.content
                : Array.isArray(event.content)
                    ? event.content
                          .map((part: string | MessagePart) => (typeof part === "string" ? part : part.text ?? ""))
                          .join("\n")
                    : ""
            return text
        }
        case "Reasoning":
            return event.content
        case "FunctionCall":
            return JSON.stringify({ name: event.name, args: event.args }, null, 2)
        case "LocalShellCall":
            return summarizeShellSnippet(event)
        case "FileChange":
            // Updated to show diff/content if available
            if (event.diff) {
                return `${event.path}\n\n${event.diff}`
            }
            return event.path
        case "WebSearchCall":
            return event.query
        default:
            return JSON.stringify(event, null, 2)
    }
}

function typeAccent(type: ResponseItem["type"]) {
    switch (type) {
        case "Message":
            return "bg-muted text-foreground"
        case "LocalShellCall":
            return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
        case "FunctionCall":
            return "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200"
        case "FileChange":
            return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
        default:
            return "bg-secondary text-secondary-foreground"
    }
}

interface EventCardProps {
    item: ResponseItem
    index: number
}

export function EventCard({ item, index }: EventCardProps) {
    const summary = renderSummary(item)
    const at = formatTimestamp(item.at)
    return (
        <Card className="relative overflow-hidden rounded-lg border bg-card/70 px-4 py-3">
            <BorderBeam className="opacity-80" size={120} duration={8} borderWidth={1.5} />
            <div className="relative z-10 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className={cn("px-2 py-0.5 text-[11px] uppercase tracking-wide", typeAccent(item.type))}>
                        {item.type}
                    </Badge>
                    <span>#{index + 1}</span>
                    {item.type === "Message" && typeof (item as any).role === "string" ? <span>{(item as any).role}</span> : null}
                    {at ? <span>{at}</span> : null}
                </div>
                <div className="space-y-2">
                    {item.type === "Message" ? (
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-sm leading-relaxed">
                            {summary}
                        </pre>
                    ) : (
                        summary && (
                            <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                                {summary}
                            </pre>
                        )
                    )}
                    {!summary && <p className="text-sm text-muted-foreground">No additional details</p>}
                </div>
            </div>
        </Card>
    )
}
```

---

# You Asked:

can you move the search bar out of the filters and into the banners of the session explorer and timeline list viewer

# Gemini Responded:

To address your request, I will move the search bar out of the filter groupings and place it prominently in the "banner" or header area of both the **Session Explorer** (`SessionList`) and the **Timeline Viewer** (`TimelineFilters`).

In `SessionList.tsx`, I am extracting the search input from the `filterToolbar` and placing it directly into the `CardHeader`.
In `TimelineFilters.tsx`, I am moving the search input from the bottom of the component to the very top, adding a search icon for consistency.

### 1\. `src/components/viewer/TimelineFilters.tsx`

```typescript
import { useMemo, useRef } from 'react'
import { Search } from 'lucide-react'
import { Filters } from '~/components/ui/filters'
import type { Filter, FilterFieldsConfig } from '~/components/ui/filters'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type { ResponseItem } from '~/lib/viewer-types'
import { formatCount } from '~/utils/intl'

export type TimelineFilterFieldKey = 'type' | 'role'
export type TimelineFilterValue = string
export type QuickFilter = 'all' | 'messages' | 'tools' | 'files'
export type RoleQuickFilter = 'all' | 'user' | 'assistant'
export type SortOrder = 'asc' | 'desc'

interface TimelineFiltersProps {
  events: readonly ResponseItem[]
  filters: Filter<TimelineFilterValue>[]
  onFiltersChange: (next: Filter<TimelineFilterValue>[]) => void
  quickFilter: QuickFilter
  onQuickFilterChange: (next: QuickFilter) => void
  roleFilter: RoleQuickFilter
  onRoleFilterChange: (next: RoleQuickFilter) => void
  sortOrder: SortOrder
  onSortOrderChange: (next: SortOrder) => void
  filteredCount: number
  totalCount: number
  searchMatchCount: number
  searchQuery: string
  onSearchChange: (next: string) => void
  onSearchNext?: () => void
}

const defaultTypeOptions = [
  'Message',
  'Reasoning',
  'FunctionCall',
  'LocalShellCall',
  'WebSearchCall',
  'CustomToolCall',
  'FileChange',
  'Other',
]

const quickFilterOptions: { label: string; value: QuickFilter; description: string }[] = [
  { value: 'all', label: 'All', description: 'Everything' },
  { value: 'messages', label: 'Messages', description: 'Only user/assistant text' },
  { value: 'tools', label: 'Tools', description: 'Function + tool executions' },
  { value: 'files', label: 'Files', description: 'File change diff events' },
]

/**
 * Presentational filter header for the timeline. Owns no state – callers manage
 * filter/search values and pass them in.
 */
export function TimelineFilters({
  events,
  filters,
  onFiltersChange,
  quickFilter,
  onQuickFilterChange,
  roleFilter,
  onRoleFilterChange,
  sortOrder,
  onSortOrderChange,
  filteredCount,
  totalCount,
  searchMatchCount,
  searchQuery,
  onSearchChange,
  onSearchNext,
}: TimelineFiltersProps) {
  const fieldOptions = useMemo(() => buildFieldConfig(events), [events])
  const hasMessageEvents = useMemo(() => events.some((event) => event.type === 'Message'), [events])
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="rounded-xl border bg-muted/5 p-4">
      {/* Banner Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            ref={searchInputRef}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearchNext?.()
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus()
                })
              }
            }}
            placeholder="Filter by content, path, or type…"
            className="w-full rounded-md border border-border bg-background pl-9 pr-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">Filters</p>
          <p className="text-xs text-muted-foreground">
            Showing {formatCount(filteredCount)} of {formatCount(searchMatchCount)} matches
            {searchMatchCount !== totalCount ? ` (from ${formatCount(totalCount)} events)` : null}
          </p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={quickFilter}
          onValueChange={(value) => {
            if (!value) return
            onQuickFilterChange(value as QuickFilter)
          }}
          className="flex flex-wrap gap-1"
        >
          {quickFilterOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.description}
              className="flex items-center gap-1 text-[11px]"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={roleFilter}
          onValueChange={(value) => {
            if (!value) return
            onRoleFilterChange(value as RoleQuickFilter)
          }}
          disabled={!hasMessageEvents}
          className="flex flex-wrap gap-1"
        >
          <ToggleGroupItem value="all" aria-label="All roles" className="flex items-center gap-1 text-[11px]">
            All roles
          </ToggleGroupItem>
          <ToggleGroupItem value="user" aria-label="User messages" className="flex items-center gap-1 text-[11px]">
            User
          </ToggleGroupItem>
          <ToggleGroupItem value="assistant" aria-label="Assistant messages" className="flex items-center gap-1 text-[11px]">
            Assistant
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={sortOrder}
          onValueChange={(value) => {
            if (!value) return
            onSortOrderChange(value as SortOrder)
          }}
          className="flex flex-wrap gap-1"
        >
          <ToggleGroupItem value="asc" aria-label="Oldest first" className="flex items-center gap-1 text-[11px]">
            Asc
          </ToggleGroupItem>
          <ToggleGroupItem value="desc" aria-label="Newest first" className="flex items-center gap-1 text-[11px]">
            Desc
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-4">
        <Filters
          filters={filters}
          fields={fieldOptions}
          onChange={onFiltersChange}
          size="sm"
          radius="full"
          showSearchInput={false}
          addButtonText="Add condition"
          className="flex flex-wrap gap-2"
        />
      </div>
    </div>
  )
}

export function applyTimelineFilters(
  events: readonly ResponseItem[],
  state: { filters: Filter<TimelineFilterValue>[]; quickFilter: QuickFilter; roleFilter: RoleQuickFilter },
) {
  if (!events.length) return [] as ResponseItem[]
  const { filters, quickFilter, roleFilter } = state
  return events.filter(
    (event) => matchesQuickFilter(event, quickFilter) && matchesRoleQuickFilter(event, roleFilter) && matchesFilterSet(event, filters),
  )
}

function buildFieldConfig(events: readonly ResponseItem[]): FilterFieldsConfig<TimelineFilterValue> {
  const types = new Set<string>(defaultTypeOptions)
  const roles = new Set<string>(['user', 'assistant', 'system'])
  for (const event of events) {
    if (typeof event.type === 'string') {
      types.add(event.type)
    }
    if (event.type === 'Message' && typeof event.role === 'string') {
      roles.add(event.role)
    }
  }

  const fields: FilterFieldsConfig<TimelineFilterValue> = [
    {
      key: 'type',
      label: 'Event type',
      type: 'multiselect',
      options: Array.from(types).sort().map((value) => ({ value, label: value })),
      allowCustomValues: false,
      searchable: true,
    },
  ]

  if (roles.size) {
    fields.push({
      key: 'role',
      label: 'Message role',
      type: 'multiselect',
      options: Array.from(roles)
        .sort()
        .map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
      allowCustomValues: false,
      searchable: false,
    })
  }

  return fields
}

function matchesQuickFilter(event: ResponseItem, quickFilter: QuickFilter) {
  switch (quickFilter) {
    case 'messages':
      return event.type === 'Message'
    case 'tools':
      return ['FunctionCall', 'LocalShellCall', 'CustomToolCall', 'WebSearchCall'].includes(event.type)
    case 'files':
      return event.type === 'FileChange'
    default:
      return true
  }
}

function matchesFilterSet(event: ResponseItem, filters: Filter<TimelineFilterValue>[]) {
  if (!filters.length) return true
  return filters.every((filter) => matchesFilter(event, filter))
}

function matchesFilter(event: ResponseItem, filter: Filter<TimelineFilterValue>) {
  const values = (filter.values ?? []).map((value) => value.toLowerCase())
  switch (filter.field) {
    case 'type':
      return compareValue(event.type, values, filter.operator)
    case 'role':
      return compareValue(event.type === 'Message' ? event.role : undefined, values, filter.operator)
    default:
      return true
  }
}

function matchesRoleQuickFilter(event: ResponseItem, roleFilter: RoleQuickFilter) {
  if (roleFilter === 'all') return true
  const role = event.type === 'Message' ? event.role?.toLowerCase() : undefined
  if (roleFilter === 'user') {
    return event.type === 'Message' && role === 'user'
  }
  if (roleFilter === 'assistant') {
    if (event.type === 'Message') {
      return role === 'assistant'
    }
    return ['FunctionCall', 'LocalShellCall', 'CustomToolCall', 'WebSearchCall'].includes(event.type)
  }
  return true
}

function compareValue(
  rawValue: string | undefined,
  allowed: string[],
  operator: string,
) {
  const value = rawValue?.toLowerCase()
  if (operator === 'empty') return !value
  if (operator === 'not_empty') return Boolean(value)
  if (!allowed.length) return true

  switch (operator) {
    case 'is':
    case 'equals':
    case 'is_any_of':
    case 'includes':
    case 'includes_any_of':
      return value ? allowed.includes(value) : false
    case 'is_not':
    case 'not_equals':
    case 'is_not_any_of':
    case 'excludes_all':
      return value ? !allowed.includes(value) : true
    case 'includes_all':
      return value ? allowed.every((allowedValue) => allowedValue === value) : false
    default:
      return true
  }
}
```

### 2\. `src/components/viewer/SessionList.tsx`

```typescript
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Copy, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { ShimmerButton } from '~/components/ui/shimmer-button';
import { Loader } from '~/components/ui/loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupText } from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import type { RepoMetadata } from '~/lib/repo-metadata';
import { cn } from '~/lib/utils';
import { formatCount, formatDateTime } from '~/utils/intl';
import { BorderBeam } from '~/components/ui/border-beam';
import { TimelineView } from '~/components/viewer/TimelineView';
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger';
import { toast } from 'sonner';
import { HighlightedText } from '~/components/ui/highlighted-text';
import { buildSearchMatchers, matchesSearchMatchers, type SearchMatcher } from '~/utils/search';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import { TracingBeam } from '~/components/aceternity/tracing-beam';
import { Separator } from '~/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';

interface BranchGroup {
  id: string;
  name: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
}

interface RepositoryGroup {
  id: string;
  label: string;
  repoName: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
  repoMeta?: RepoMetadata;
  branches: BranchGroup[];
  branchCount: number;
  hasUnknownBranch: boolean;
}

export interface SessionListProps {
  sessionAssets: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
  onFiltersRender?: (node: ReactNode | null) => void;
}

const sessionCountIntensity = {
  low: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  medium: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-50',
  high: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50',
} as const;

type SizeUnit = 'KB' | 'MB';
type SortKey = 'timestamp' | 'size';
type SortDirection = 'asc' | 'desc';

interface SessionExplorerFilterState {
  searchText: string;
  sortKey: SortKey;
  sortDir: SortDirection;
  sizeMinValue: string;
  sizeMinUnit: SizeUnit;
  sizeMaxValue: string;
  sizeMaxUnit: SizeUnit;
  timestampFrom: string;
  timestampTo: string;
}

const defaultFilterState: SessionExplorerFilterState = {
  searchText: '',
  sortKey: 'timestamp',
  sortDir: 'desc',
  sizeMinValue: '',
  sizeMinUnit: 'MB',
  sizeMaxValue: '',
  sizeMaxUnit: 'MB',
  timestampFrom: '',
  timestampTo: '',
};

type FilterBadgeKey = 'size' | 'timestamp';

const SIZE_UNITS: SizeUnit[] = ['KB', 'MB'];

type SessionPreset = 'all' | 'recent' | 'heavy';

export function SessionList({
  sessionAssets,
  snapshotTimestamp,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onSelectionChange,
  onAddSessionToChat,
  onFiltersRender,
}: SessionListProps) {
  const [filters, setFilters] = useState<SessionExplorerFilterState>(defaultFilterState);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const [sessionPreset, setSessionPreset] = useState<SessionPreset>('all');
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false);
  const searchMatchers = useMemo(() => buildSearchMatchers(filters.searchText), [filters.searchText]);
  const quickFilterOptions = useMemo(
    () => [
      {
        key: 'week',
        label: 'Updated last 7 days',
        description: 'Shows sessions refreshed this week',
        apply: () => {
          const fromIso = toLocalDateTimeInput(snapshotTimestamp - 1000 * 60 * 60 * 24 * 7);
          setFilters((prev) => ({
            ...prev,
            timestampFrom: fromIso,
            timestampTo: '',
          }));
          setSessionPreset('recent');
        },
      },
      {
        key: 'compact',
        label: 'Smaller than 5 MB',
        description: 'Useful when scanning quick traces',
        apply: () => {
          setFilters((prev) => ({
            ...prev,
            sizeMinValue: '',
            sizeMaxValue: '5',
            sizeMaxUnit: 'MB',
          }));
          setSessionPreset('all');
        },
      },
      {
        key: 'clear',
        label: 'Clear quick filters',
        description: 'Reset preset overrides',
        apply: () => {
          setFilters((prev) => ({
            ...prev,
            sizeMinValue: '',
            sizeMaxValue: '',
            timestampFrom: '',
            timestampTo: '',
          }));
          setSessionPreset('all');
        },
      },
    ],
    [snapshotTimestamp],
  );
  const filterLogRef = useRef<{ modelKey: string; count: number }>({ modelKey: '', count: sessionAssets.length });
  const viewModelLogRef = useRef<{ total: number; groups: number } | null>(null);
  const sizeMinBytes = toBytes(filters.sizeMinValue, filters.sizeMinUnit);
  const sizeMaxBytes = toBytes(filters.sizeMaxValue, filters.sizeMaxUnit);
  const timestampFromMs = toTimestampMs(filters.timestampFrom);
  const timestampToMs = toTimestampMs(filters.timestampTo);
  const { sortKey, sortDir } = filters;
  const updateFilter = useCallback(<K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);
  const applyPreset = useCallback((value: SessionPreset) => {
    setSessionPreset(value);
    if (value === 'all') {
      setFilters((prev) => ({
        ...prev,
        timestampFrom: '',
        timestampTo: '',
        sizeMinValue: '',
        sizeMaxValue: '',
      }));
      return;
    }
    if (value === 'recent') {
      const fromIso = toLocalDateTimeInput(snapshotTimestamp - 1000 * 60 * 60 * 24 * 2);
      setFilters((prev) => ({
        ...prev,
        timestampFrom: fromIso,
        timestampTo: '',
      }));
      return;
    }
    if (value === 'heavy') {
      setFilters((prev) => ({
        ...prev,
        sizeMinValue: '25',
        sizeMinUnit: 'MB',
        sizeMaxValue: '',
      }));
    }
  }, [snapshotTimestamp]);

  useEffect(() => {
    if (sizeMinBytes !== undefined && sizeMaxBytes !== undefined && sizeMinBytes > sizeMaxBytes) {
      logWarn('viewer.filters', 'Manual size range invalid', {
        sizeMinBytes,
        sizeMaxBytes,
      });
    }
  }, [sizeMinBytes, sizeMaxBytes]);

  useEffect(() => {
    if (timestampFromMs && timestampToMs && timestampFromMs > timestampToMs) {
      logWarn('viewer.filters', 'Timestamp range invalid', {
        timestampFromMs,
        timestampToMs,
      });
    }
  }, [timestampFromMs, timestampToMs]);

  const accessibleAssets = useMemo(
    () => sessionAssets.filter((asset) => typeof asset.url === 'string' && asset.url.includes('/api/uploads/')),
    [sessionAssets],
  );

  const repositoryGroups = useMemo(
    () => aggregateByRepository(accessibleAssets),
    [accessibleAssets],
  );

  useEffect(() => {
    const repoCount = new Set(repositoryGroups.map((group) => group.repoName)).size;
    const modelKey = `${accessibleAssets.length}:${repositoryGroups.length}`;
    if (viewModelLogRef.current?.total === accessibleAssets.length && viewModelLogRef.current?.groups === repositoryGroups.length) {
      return;
    }
    logInfo('viewer.explorer', 'Computed session explorer view model', {
      totalSessions: accessibleAssets.length,
      repoCount,
      groupCount: repositoryGroups.length,
    });
    viewModelLogRef.current = { total: accessibleAssets.length, groups: repositoryGroups.length };
  }, [accessibleAssets.length, repositoryGroups]);

  const { groups: filteredGroups, filteredSessionCount } = useMemo(() => {
    const min = typeof sizeMinBytes === 'number' ? sizeMinBytes : undefined;
    const max = typeof sizeMaxBytes === 'number' ? sizeMaxBytes : undefined;
    const from = typeof timestampFromMs === 'number' ? timestampFromMs : undefined;
    const to = typeof timestampToMs === 'number' ? timestampToMs : undefined;
    const groups = repositoryGroups
      .map((group) => {
        const filteredBranches = group.branches
          .map((branch) => {
            const filteredSessions = branch.sessions.filter((session) => {
              const matchesSearch = searchMatchers.length
                ? matchesSearchText(searchMatchers, group, session)
                : true;
              if (!matchesSearch) return false;
              const size = session.size ?? 0;
              const meetsMin = min === undefined || size >= min;
              const meetsMax = max === undefined || size <= max;
              if (!meetsMin || !meetsMax) return false;
              const sessionTimestamp = session.sortKey ?? 0;
              const meetsFrom = from === undefined || sessionTimestamp >= from;
              const meetsTo = to === undefined || sessionTimestamp <= to;
              return meetsFrom && meetsTo;
            });
            if (!filteredSessions.length) return null;
            const sortedSessions = sortSessions(filteredSessions, sortKey, sortDir);
            return {
              ...branch,
              sessions: sortedSessions,
              primarySortValue: getSortValue(sortedSessions[0], sortKey),
            };
          })
          .filter(Boolean) as Array<BranchGroup & { primarySortValue: number }>;

        const branchDirection = sortDir === 'asc' ? 1 : -1;
        const sortedBranches = filteredBranches.sort((a, b) => {
          const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0);
          if (diff !== 0) return branchDirection * diff;
          return a.name.localeCompare(b.name);
        });

        if (!sortedBranches.length) return null;
        const flattenedSessions = sortedBranches.flatMap((branch) => branch.sessions);
        const primarySortValue = sortedBranches[0]?.primarySortValue ?? getSortValue(flattenedSessions[0], sortKey);
        const filteredNamedBranches = sortedBranches.filter(
          (branch) => branch.name && branch.name.trim().length > 0 && branch.name.toLowerCase() !== 'unknown'
        );
        const branchCount = filteredNamedBranches.length;
        const hasUnknownBranch = sortedBranches.some((branch) => branch.name.toLowerCase() === 'unknown');
        return {
          ...group,
          sessions: flattenedSessions,
          branches: sortedBranches.map(({ primarySortValue: _p, ...rest }) => rest),
          branchCount,
          hasUnknownBranch,
          primarySortValue,
        };
      })
      .filter(Boolean) as Array<RepositoryGroup & { primarySortValue: number }>;

    const sortedGroups = groups.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1;
      const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0);
      if (diff !== 0) {
        return direction * diff;
      }
      return a.label.localeCompare(b.label);
    });

    const total = sortedGroups.reduce((count, group) => count + group.sessions.length, 0);
    return { groups: sortedGroups, filteredSessionCount: total };
  }, [repositoryGroups, searchMatchers, sizeMinBytes, sizeMaxBytes, sortKey, sortDir, timestampFromMs, timestampToMs]);

  useEffect(() => {
    const filterModel = buildFilterModel(filters, {
      sizeMinBytes,
      sizeMaxBytes,
      timestampFromMs,
      timestampToMs,
    });
    const modelKey = JSON.stringify(filterModel);
    if (filterLogRef.current.modelKey === modelKey && filterLogRef.current.count === filteredSessionCount) {
      return;
    }
    logInfo('viewer.filters', 'Session explorer filters updated', {
      filterModel,
      beforeCount: filterLogRef.current.count,
      afterCount: filteredSessionCount,
      navigation: 'local-state',
    });
    filterLogRef.current = { modelKey, count: filteredSessionCount };
  }, [filteredSessionCount, filters, sizeMaxBytes, sizeMinBytes, timestampFromMs, timestampToMs]);

  useEffect(() => {
    if (!selectedSessionPath) return;
    const stillVisible = filteredGroups.some((group) =>
      group.sessions.some((session) => session.path === selectedSessionPath),
    );
    if (!stillVisible) {
      const existsInMemory = accessibleAssets.some((session) => session.path === selectedSessionPath);
      if (existsInMemory) {
        logDebug('viewer.explorer', 'Selected session hidden by filters', {
          selectedSessionPath,
          filterModel: buildFilterModel(filters, {
            sizeMinBytes,
            sizeMaxBytes,
            timestampFromMs,
            timestampToMs,
          }),
        });
        onSelectionChange?.(null);
      }
    }
  }, [
    filteredGroups,
    sizeMaxBytes,
    sizeMinBytes,
    onSelectionChange,
    filters,
    selectedSessionPath,
    accessibleAssets,
    timestampFromMs,
    timestampToMs,
  ]);

  useEffect(() => {
    const visibleIds = new Set(filteredGroups.map((group) => group.id));
    setExpandedGroupIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredGroups]);

  useEffect(() => {
    if (accessibleAssets.length > 0 && filteredSessionCount === 0) {
      const filterModel = buildFilterModel(filters, {
        sizeMinBytes,
        sizeMaxBytes,
        timestampFromMs,
        timestampToMs,
      });
      logError('viewer.explorer', 'Filters produced zero sessions while memory still populated', {
        filterModel,
        totalSessions: accessibleAssets.length,
        groupSamples: repositoryGroups.slice(0, 5).map((group) => group.id),
      });
    }
  }, [accessibleAssets.length, filteredSessionCount, filters, repositoryGroups, sizeMaxBytes, sizeMinBytes, timestampFromMs, timestampToMs]);

  const handleRepoToggle = (group: RepositoryGroup, shouldExpand: boolean) => {
    logDebug('viewer.explorer', 'Toggled repository group', {
      groupId: group.id,
      repoName: group.repoName,
      branchCount: group.branchCount,
      previousOpenState: !shouldExpand,
      nextOpenState: shouldExpand,
    });
    if (shouldExpand) {
      setLoadingRepoId(group.id);
      const simulatedDelay = group.sessions.length > 20 ? 400 : group.sessions.length > 8 ? 260 : 160;
      setTimeout(() => {
        setLoadingRepoId((current) => (current === group.id ? null : current));
      }, simulatedDelay);
    } else {
      setLoadingRepoId((current) => (current === group.id ? null : current));
    }
  };

  const handleAccordionChange = (nextValue: string[]) => {
    setExpandedGroupIds(nextValue);
    const added = nextValue.find((id) => !expandedGroupIds.includes(id));
    if (added) {
      const target = filteredGroups.find((group) => group.id === added);
      if (target) {
        handleRepoToggle(target, true);
      }
    }
    const removed = expandedGroupIds.find((id) => !nextValue.includes(id));
    if (removed) {
      const target = filteredGroups.find((group) => group.id === removed);
      if (target) {
        handleRepoToggle(target, false);
      }
    }
  };

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilterState });
    setExpandedGroupIds([]);
    setIsFilterSheetOpen(false);
    setSessionPreset('all');
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const activeBadges = useMemo(() => buildActiveFilterBadges(filters), [filters]);
  const handleBadgeClear = useCallback((badgeKey: FilterBadgeKey) => {
    setFilters((prev) => {
      if (badgeKey === 'size') {
        return { ...prev, sizeMinValue: '', sizeMaxValue: '' };
      }
      if (badgeKey === 'timestamp') {
        return { ...prev, timestampFrom: '', timestampTo: '' };
      }
      return prev;
    });
  }, []);

  const hasResults = filteredGroups.length > 0;
  const datasetEmpty = accessibleAssets.length === 0;

  const searchBar = useMemo(() => (
    <div className="w-full">
      <InputGroup className="w-full">
        <InputGroupText>
          <Search className="size-4" />
        </InputGroupText>
        <Input
          type="search"
          aria-label="Search sessions"
          value={filters.searchText}
          onChange={(event) => updateFilter('searchText', event.target.value)}
          placeholder="Search repo, branch, file label, tag, or year"
          className="border-0 focus-visible:ring-0"
        />
      </InputGroup>
    </div>
  ), [filters.searchText, updateFilter]);

  const filterToolbar = useMemo(
    () => (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={sessionPreset} onValueChange={(value) => applyPreset(value as SessionPreset)} className="w-full lg:w-auto min-w-0 flex-1">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="heavy">Large</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filters.sortKey} onValueChange={(value: SortKey) => updateFilter('sortKey', value)}>
              <SelectTrigger aria-label="Sort by" className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="timestamp">Timestamp</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={filters.sortDir}
              onValueChange={(value) => value && updateFilter('sortDir', value as SortDirection)}
              aria-label="Sort direction"
              className="flex"
            >
              <ToggleGroupItem value="asc" aria-label="Sort ascending" className="text-xs">
                ↑ ASC
              </ToggleGroupItem>
              <ToggleGroupItem value="desc" aria-label="Sort descending" className="text-xs">
                ↓ DESC
              </ToggleGroupItem>
            </ToggleGroup>
            <Popover open={isQuickFilterOpen} onOpenChange={setIsQuickFilterOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                  <SlidersHorizontal className="size-4" />
                  Quick filters
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <Command>
                  <CommandInput placeholder="Search presets..." />
                  <CommandList>
                    <CommandEmpty>No presets available.</CommandEmpty>
                    <CommandGroup heading="Presets">
                      {quickFilterOptions.map((option) => (
                        <CommandItem
                          key={option.key}
                          value={option.key}
                          onSelect={() => {
                            option.apply();
                            setIsQuickFilterOpen(false);
                          }}
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="secondary" className="gap-2" onClick={() => setIsFilterSheetOpen(true)}>
              Advanced
            </Button>
            <Button type="button" variant="ghost" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
        {activeBadges.length ? (
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" data-testid="active-filter-badges">
            {activeBadges.map((badge) => (
              <Badge key={badge.key} variant="secondary" className="flex items-center gap-2 whitespace-nowrap">
                {badge.label}
                <button
                  type="button"
                  aria-label={`Clear ${badge.description}`}
                  onClick={() => handleBadgeClear(badge.key)}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    ),
    [
      activeBadges,
      applyPreset,
      filters,
      handleBadgeClear,
      isQuickFilterOpen,
      quickFilterOptions,
      resetFilters,
      sessionPreset,
      updateFilter,
    ],
  );

  useEffect(() => {
    if (!onFiltersRender) return;
    onFiltersRender(filterToolbar);
    return () => onFiltersRender(null);
  }, [filterToolbar, onFiltersRender]);

  return (
    <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
      <div className="w-full">
        <Card className="flex min-h-[70vh] flex-col overflow-hidden p-0">
          <CardHeader className="space-y-4 border-b border-border/80 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">Session explorer</CardTitle>
                <CardDescription>Discover JSONL session logs grouped by repository and branch.</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                {formatCount(filteredSessionCount)} / {formatCount(accessibleAssets.length)} sessions
              </Badge>
            </div>
            {/* Search Bar Moved into Banner (CardHeader) */}
            {searchBar}
            {onFiltersRender ? null : filterToolbar}
            {activeBadges.length ? (
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" data-testid="active-filter-badges">
                {activeBadges.map((badge) => (
                  <Badge key={badge.key} variant="secondary" className="flex items-center gap-2 whitespace-nowrap">
                    {badge.label}
                    <button
                      type="button"
                      aria-label={`Clear ${badge.description}`}
                      onClick={() => handleBadgeClear(badge.key)}
                      className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col overflow-hidden px-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Session repositories</p>
                <p className="text-xs text-muted-foreground">{formatCount(filteredGroups.length)} grouped results</p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Snapshot {formatDateTime(snapshotTimestamp, { fallback: 'N/A' })}
              </Badge>
            </div>
            <Separator className="mx-6 my-3" />
            <TracingBeam outerClassName="flex-1" className="px-6 pb-6">
              <div className="space-y-4 pr-2" aria-live="polite">
                {!hasResults ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
                    <p className="text-sm font-semibold">
                      {datasetEmpty ? 'No session logs discovered yet.' : 'No repositories match the selected filters.'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {datasetEmpty
                        ? 'Drop JSONL exports or point the viewer to a sessions directory to populate this view.'
                        : 'Adjust or clear filters to explore all session logs.'}
                    </p>
                  </div>
                ) : (
                  <Accordion
                    type="multiple"
                    value={expandedGroupIds}
                    onValueChange={(value) => handleAccordionChange(Array.isArray(value) ? value : [value])}
                    className="space-y-4"
                  >
                    {filteredGroups.map((repo, index) => {
                      const intentClass = getSessionChipIntent(repo.sessions.length);
                      return (
                        <div key={repo.id}>
                          <AccordionItem value={repo.id} className="border-0">
                            <AccordionTrigger
                              aria-label={`Toggle ${repo.label} repository`}
                              className={cn(
                                'rounded-2xl border border-transparent px-4 py-3 text-left transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-ring',
                                intentClass,
                                'data-[state=open]:shadow-sm',
                              )}
                            >
                              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="cursor-default text-xs font-semibold uppercase tracking-wide">
                                        <HighlightedText text={repo.label} matchers={searchMatchers} />
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <HighlightedText as="p" className="text-xs font-semibold" text={repo.label} matchers={searchMatchers} />
                                      <p className="text-xs opacity-80">
                                        Repo: <HighlightedText text={repo.repoName} matchers={searchMatchers} />
                                      </p>
                                      <p className="text-xs opacity-80">
                                        Branches:{' '}
                                        <HighlightedText
                                          text={`${describeBranches(repo.branches)} (${repo.branchCount}${repo.hasUnknownBranch ? '*' : ''})`}
                                          matchers={searchMatchers}
                                        />
                                      </p>
                                      <p className="text-xs opacity-80">Total size: {formatBytes(repo.totalSize)}</p>
                                      <p className="text-xs opacity-80">Last updated: {formatDate(repo.lastUpdated)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                                    {formatCount(repo.sessions.length)} {repo.sessions.length === 1 ? 'session' : 'sessions'}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                                    Branches {formatCount(repo.branchCount)}
                                    {repo.hasUnknownBranch ? '*' : ''}
                                  </Badge>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  <p>{formatBytes(repo.totalSize)}</p>
                                  <p>Updated {formatRelativeTime(repo.lastUpdated, snapshotTimestamp)}</p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 px-4 py-4">
                                {loadingRepoId === repo.id ? (
                                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                                    <Loader className="size-4" aria-label="Loading sessions" />
                                    Preparing session list…
                                  </div>
                                ) : (
                                  repo.branches.map((branch, branchIndex) => (
                                    <div key={branch.id} className="space-y-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide">
                                          Branch <HighlightedText text={branch.name} matchers={searchMatchers} />
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                          {formatCount(branch.sessions.length)} {branch.sessions.length === 1 ? 'session' : 'sessions'}
                                        </span>
                                      </div>
                                      <SessionRepoVirtualList
                                        sessions={branch.sessions}
                                        snapshotTimestamp={snapshotTimestamp}
                                        onSessionOpen={(session) => {
                                          onSelectionChange?.(session.path);
                                          return onSessionOpen?.(session);
                                        }}
                                        loadingSessionPath={loadingSessionPath}
                                        selectedSessionPath={selectedSessionPath}
                                        onAddSessionToChat={onAddSessionToChat}
                                        searchMatchers={searchMatchers}
                                      />
                                      {branchIndex < repo.branches.length - 1 ? <Separator className="my-1 opacity-40" /> : null}
                                    </div>
                                  ))
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          {index < filteredGroups.length - 1 ? <Separator className="my-2 opacity-50" /> : null}
                        </div>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            </TracingBeam>
          </CardContent>
        </Card>
      </div>
      <SheetContent side="right" className="w-full space-y-6 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Advanced filters</SheetTitle>
          <SheetDescription>Configure the v1 advanced filters (size range & timestamp range).</SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Size range</p>
            <p className="text-xs text-muted-foreground">Limit sessions by minimum and maximum file size.</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-size-min">
                  Minimum size
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="filter-size-min"
                    type="number"
                    min={0}
                    value={filters.sizeMinValue}
                    onChange={(event) => updateFilter('sizeMinValue', event.target.value)}
                    placeholder="e.g. 10"
                  />
                  <Select value={filters.sizeMinUnit} onValueChange={(value: SizeUnit) => updateFilter('sizeMinUnit', value)}>
                    <SelectTrigger aria-label="Minimum size unit" className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {SIZE_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-size-max">
                  Maximum size
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="filter-size-max"
                    type="number"
                    min={0}
                    value={filters.sizeMaxValue}
                    onChange={(event) => updateFilter('sizeMaxValue', event.target.value)}
                    placeholder="e.g. 100"
                  />
                  <Select value={filters.sizeMaxUnit} onValueChange={(value: SizeUnit) => updateFilter('sizeMaxUnit', value)}>
                    <SelectTrigger aria-label="Maximum size unit" className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {SIZE_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Timestamp range</p>
            <p className="text-xs text-muted-foreground">Filter sessions by when they were last updated.</p>
            <div className="grid gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-ts-from">
                  Start (UTC)
                </label>
                <Input
                  id="filter-ts-from"
                  type="datetime-local"
                  value={filters.timestampFrom}
                  onChange={(event) => updateFilter('timestampFrom', event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-ts-to">
                  End (UTC)
                </label>
                <Input
                  id="filter-ts-to"
                  type="datetime-local"
                  value={filters.timestampTo}
                  onChange={(event) => updateFilter('timestampTo', event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={resetFilters}>
            Reset all
          </Button>
          <Button variant="secondary" onClick={() => setIsFilterSheetOpen(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function aggregateByRepository(sessionAssets: DiscoveredSessionAsset[]): RepositoryGroup[] {
  type RepoAccumulator = {
    group: RepositoryGroup;
    branches: Map<string, BranchGroup>;
  };
  const map = new Map<string, RepoAccumulator>();
  for (const asset of sessionAssets) {
    const repoName = cleanRepoName(asset.repoName);
    const repoKey = repoName.toLowerCase();
    let accumulator = map.get(repoKey);
    if (!accumulator) {
      const id = slugify(repoName);
      accumulator = {
        group: {
          id,
          label: repoName,
          repoName,
          sessions: [],
          totalSize: 0,
          lastUpdated: asset.sortKey,
          repoMeta: asset.repoMeta,
          branches: [],
        },
        branches: new Map(),
      };
      map.set(repoKey, accumulator);
    }
    const repo = accumulator.group;
    repo.sessions.push(asset);
    repo.totalSize += asset.size ?? 0;
    repo.lastUpdated = Math.max(repo.lastUpdated ?? 0, asset.sortKey ?? 0) || repo.lastUpdated;
    if (!repo.repoMeta && asset.repoMeta) {
      repo.repoMeta = asset.repoMeta;
    }

    const branchName = asset.branch && asset.branch !== 'unknown' ? asset.branch : 'Unknown';
    const branchKey = branchName.toLowerCase();
    let branch = accumulator.branches.get(branchKey);
    if (!branch) {
      branch = {
        id: `${repo.id}-${slugify(branchName)}`,
        name: branchName,
        sessions: [],
        totalSize: 0,
        lastUpdated: asset.sortKey,
      };
      accumulator.branches.set(branchKey, branch);
    }
    branch.sessions.push(asset);
    branch.totalSize += asset.size ?? 0;
    branch.lastUpdated = Math.max(branch.lastUpdated ?? 0, asset.sortKey ?? 0) || branch.lastUpdated;
  }

  return Array.from(map.values()).map(({ group, branches }) => {
    const sortedBranches = Array.from(branches.values()).sort(
      (a, b) => (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0) || a.name.localeCompare(b.name)
    );
    const namedBranches = sortedBranches.filter(
      (branch) => branch.name && branch.name.trim().length > 0 && branch.name.toLowerCase() !== 'unknown'
    );
    const branchCount = namedBranches.length;
    const hasUnknownBranch = sortedBranches.some((branch) => branch.name.toLowerCase() === 'unknown');
    return {
      ...group,
      branches: sortedBranches,
      branchCount,
      hasUnknownBranch,
    };
  });
}

function matchesSearchText(matchers: SearchMatcher[], group: RepositoryGroup, session: DiscoveredSessionAsset) {
  if (!matchers.length) return true;
  const branchNames = group.branches.map((branch) => branch.name).join(' ');
  const haystack = [
    group.repoName,
    branchNames,
    session.repoLabel,
    session.repoName,
    session.branch,
    session.displayLabel,
    session.path,
    session.tags?.join(' '),
  ]
    .filter(Boolean)
    .join(' ');
  if (!haystack.trim()) return false;
  return matchesSearchMatchers(haystack, matchers);
}

function describeBranches(branches: BranchGroup[]) {
  if (!branches.length) return 'Unknown';
  const names = branches.map((branch) => branch.name);
  if (names.length <= 3) {
    return names.join(', ');
  }
  const preview = names.slice(0, 3).join(', ');
  return `${preview} +${names.length - 3}`;
}

function sortSessions(sessions: DiscoveredSessionAsset[], sortKey: SortKey, sortDir: SortDirection) {
  const direction = sortDir === 'asc' ? 1 : -1;
  return [...sessions].sort((a, b) => {
    const diff = (getSortValue(a, sortKey) ?? 0) - (getSortValue(b, sortKey) ?? 0);
    if (diff !== 0) {
      return direction * diff;
    }
    return a.path.localeCompare(b.path);
  });
}

function getSortValue(session: DiscoveredSessionAsset, sortKey: SortKey) {
  if (sortKey === 'size') {
    return session.size ?? 0;
  }
  return session.sortKey ?? 0;
}

function toBytes(value: string, unit: SizeUnit) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  const multiplier = unit === 'KB' ? 1024 : 1024 * 1024;
  return parsed * multiplier;
}

function toTimestampMs(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toLocalDateTimeInput(ms: number) {
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms);
  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function buildFilterModel(
  state: SessionExplorerFilterState,
  derived: { sizeMinBytes?: number; sizeMaxBytes?: number; timestampFromMs?: number; timestampToMs?: number },
) {
  return {
    textQuery: state.searchText.trim() || null,
    sizeMinBytes: derived.sizeMinBytes ?? null,
    sizeMaxBytes: derived.sizeMaxBytes ?? null,
    timestampFrom: derived.timestampFromMs ?? null,
    timestampTo: derived.timestampToMs ?? null,
    sortKey: state.sortKey,
    sortOrder: state.sortDir,
    repoFilter: null,
    branchFilter: null,
  };
}

function buildActiveFilterBadges(state: SessionExplorerFilterState) {
  const badges: Array<{ key: FilterBadgeKey; label: string; description: string }> = [];
  if (state.sizeMinValue.trim() || state.sizeMaxValue.trim()) {
    const minLabel = state.sizeMinValue.trim() ? `${state.sizeMinValue} ${state.sizeMinUnit}` : '0';
    const maxLabel = state.sizeMaxValue.trim() ? `${state.sizeMaxValue} ${state.sizeMaxUnit}` : '∞';
    badges.push({ key: 'size', label: `Size: ${minLabel} – ${maxLabel}`, description: 'size filter' });
  }
  if (state.timestampFrom.trim() || state.timestampTo.trim()) {
    const fromLabel = state.timestampFrom ? formatDateTime(state.timestampFrom, { fallback: 'Any' }) : 'Any';
    const toLabel = state.timestampTo ? formatDateTime(state.timestampTo, { fallback: 'Any' }) : 'Any';
    badges.push({ key: 'timestamp', label: `Updated: ${fromLabel} → ${toLabel}`, description: 'timestamp filter' });
  }
  return badges;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'session-repo';
}

function getSessionChipIntent(count: number) {
  if (count <= 2) return sessionCountIntensity.low;
  if (count <= 5) return sessionCountIntensity.medium;
  return sessionCountIntensity.high;
}

function formatBytes(value?: number) {
  if (!value) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let size = value;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatDate(value?: number) {
  if (!value) return 'Unknown date';
  return formatDateTime(value);
}

function formatRelativeTime(value: number | undefined, referenceMs: number) {
  if (!value) return 'never';
  const deltaMs = Math.max(referenceMs - value, 0);
  const minutes = Math.round(deltaMs / (1000 * 60));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 60) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

interface SessionTimelineItem {
  session: DiscoveredSessionAsset;
  index: number;
}

function SessionRepoVirtualList({
  sessions,
  snapshotTimestamp,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onAddSessionToChat,
  searchMatchers,
}: {
  sessions: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
  searchMatchers?: SearchMatcher[];
}) {
  const items = useMemo<SessionTimelineItem[]>(
    () => sessions.map((session, index) => ({ session, index })),
    [sessions],
  );
  const [gradients, setGradients] = useState({ top: 0, bottom: 0 });
  const viewportHeight = items.length ? Math.max(Math.min(items.length * 96, 520), 220) : 200;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-background/70">
      <TimelineView
        items={items}
        height={viewportHeight}
        estimateItemHeight={104}
        overscanPx={200}
        keyForIndex={(item) => `${item.session.path}:${item.index}`}
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
              onSessionOpen={onSessionOpen}
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

function SessionCard({
  session,
  snapshotTimestamp,
  onSessionOpen,
  isLoading,
  isSelected,
  onAddToChat,
  searchMatchers,
}: {
  session: DiscoveredSessionAsset;
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  isLoading?: boolean;
  isSelected?: boolean;
  onAddToChat?: (asset: DiscoveredSessionAsset) => void;
  searchMatchers?: SearchMatcher[];
}) {
  const displayName = session.displayLabel;
  const repoLabel = session.repoLabel ?? session.repoName;
  const branchName = session.repoMeta?.branch ?? session.branch;
  const repoDisplay = session.repoName && session.repoName !== 'unknown-repo' ? session.repoName : null;
  const branchDisplay = branchName && branchName !== 'unknown' ? branchName : null;
  const sessionId = extractSessionId(displayName) ?? extractSessionId(session.path);
  const branchLine = branchDisplay ? `Branch ${branchDisplay}` : '';
  const commitLine = session.repoMeta?.commit ? `Commit ${formatCommit(session.repoMeta.commit)}` : '';
  const branchMeta = [branchLine, commitLine].filter(Boolean).join(' · ');

  const handleCopySessionId = async () => {
    if (!sessionId || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success('Copied session ID', { description: sessionId });
      logInfo('viewer.explorer', 'Copied session id', { path: session.path, sessionId });
    } catch (error) {
      toast.error('Failed to copy session ID');
      logError('viewer.explorer', 'Copy session id failed', error instanceof Error ? error : new Error('unknown error'));
    }
  };
  const handleAddToChat = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onAddToChat?.(session);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background via-background/60 to-muted/40 p-4',
        isSelected && 'border-primary/60 ring-2 ring-primary/50'
      )}
    >
      <BorderBeam className="opacity-50" size={120} duration={8} borderWidth={1} />
      <div className="relative z-10 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {repoLabel ? (
              <HighlightedText
                as="p"
                className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300"
                text={repoLabel}
                matchers={searchMatchers}
              />
            ) : null}
            {repoDisplay ? (
              <HighlightedText
                as="p"
                className="truncate text-[11px] text-muted-foreground"
                text={repoDisplay}
                matchers={searchMatchers}
              />
            ) : null}
            {branchMeta ? (
              <HighlightedText
                as="p"
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                text={branchMeta}
                matchers={searchMatchers}
              />
            ) : null}
            <HighlightedText
              as="p"
              className="truncate text-sm font-semibold text-foreground"
              text={displayName}
              matchers={searchMatchers}
            />
            <HighlightedText
              as="p"
              className="truncate text-xs text-muted-foreground"
              text={session.path}
              matchers={searchMatchers}
            />
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{formatBytes(session.size)}</p>
            {session.lastModifiedIso ? (
              <p className="font-mono text-[10px] uppercase tracking-tight text-muted-foreground" aria-label="Last modified timestamp">
                {session.lastModifiedIso}
              </p>
            ) : null}
            <p>{formatRelativeTime(session.sortKey, snapshotTimestamp)}</p>
            {isSelected ? (
              <span className="mt-1 inline-flex rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                Selected
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {session.tags?.slice(0, 3).map((tag) => (
            <span key={`${session.path}-${tag}`} className="rounded-full border border-border/70 px-2 py-0.5">
              <HighlightedText text={tag} matchers={searchMatchers} />
            </span>
          ))}
          {session.tags && session.tags.length > 3 ? <span>+{session.tags.length - 3}</span> : null}
          <div className="ml-auto flex items-center gap-2">
            {sessionId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopySessionId}
              >
                <Copy className="mr-1 size-4" />
                Copy ID
              </Button>
            ) : null}
            <ShimmerButton
              type="button"
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
              onClick={handleAddToChat}
            >
              Add to chat
            </ShimmerButton>
            {onSessionOpen ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isLoading}
                onClick={() => onSessionOpen(session)}
              >
                {isLoading ? 'Loading…' : 'Load session'}
              </Button>
            ) : null}
            <a
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              href={session.url}
              target="_blank"
              rel="noreferrer"
            >
              Open file
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCommit(commit: string) {
  return commit.length > 8 ? commit.slice(0, 8) : commit;
}

function extractSessionId(label?: string | null) {
  if (!label) return null;
  const match = label.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

function cleanRepoName(name?: string | null) {
  if (!name) return 'Unknown repo';
  const normalized = name.trim();
  if (!normalized || normalized.toLowerCase() === 'src') {
    return 'Unknown repo';
  }
  if (/^\d+$/.test(normalized)) {
    return 'Unknown repo';
  }
  if (/^[0-9a-f-]{6,}$/i.test(normalized) && !normalized.includes('/')) {
    return 'Unknown repo';
  }
  return normalized;
}
```

---

# You Asked:

now lets do the same for the timeline search bar. move it from the filter into the banner. 

# Gemini Responded:

To align the Timeline search bar with the Session Explorer's design, I will update `TimelineFilters.tsx` to use the `InputGroup` component and position it at the top of the filter container, effectively acting as the banner.

Here is the updated file:

### `src/components/viewer/TimelineFilters.tsx`

```typescript
import { useMemo, useRef } from 'react'
import { Search } from 'lucide-react'
import { Filters } from '~/components/ui/filters'
import type { Filter, FilterFieldsConfig } from '~/components/ui/filters'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type { ResponseItem } from '~/lib/viewer-types'
import { formatCount } from '~/utils/intl'
import { Input } from '~/components/ui/input'
import { InputGroup, InputGroupText } from '~/components/ui/input-group'

export type TimelineFilterFieldKey = 'type' | 'role'
export type TimelineFilterValue = string
export type QuickFilter = 'all' | 'messages' | 'tools' | 'files'
export type RoleQuickFilter = 'all' | 'user' | 'assistant'
export type SortOrder = 'asc' | 'desc'

interface TimelineFiltersProps {
  events: readonly ResponseItem[]
  filters: Filter<TimelineFilterValue>[]
  onFiltersChange: (next: Filter<TimelineFilterValue>[]) => void
  quickFilter: QuickFilter
  onQuickFilterChange: (next: QuickFilter) => void
  roleFilter: RoleQuickFilter
  onRoleFilterChange: (next: RoleQuickFilter) => void
  sortOrder: SortOrder
  onSortOrderChange: (next: SortOrder) => void
  filteredCount: number
  totalCount: number
  searchMatchCount: number
  searchQuery: string
  onSearchChange: (next: string) => void
  onSearchNext?: () => void
}

const defaultTypeOptions = [
  'Message',
  'Reasoning',
  'FunctionCall',
  'LocalShellCall',
  'WebSearchCall',
  'CustomToolCall',
  'FileChange',
  'Other',
]

const quickFilterOptions: { label: string; value: QuickFilter; description: string }[] = [
  { value: 'all', label: 'All', description: 'Everything' },
  { value: 'messages', label: 'Messages', description: 'Only user/assistant text' },
  { value: 'tools', label: 'Tools', description: 'Function + tool executions' },
  { value: 'files', label: 'Files', description: 'File change diff events' },
]

/**
 * Presentational filter header for the timeline. Owns no state – callers manage
 * filter/search values and pass them in.
 */
export function TimelineFilters({
  events,
  filters,
  onFiltersChange,
  quickFilter,
  onQuickFilterChange,
  roleFilter,
  onRoleFilterChange,
  sortOrder,
  onSortOrderChange,
  filteredCount,
  totalCount,
  searchMatchCount,
  searchQuery,
  onSearchChange,
  onSearchNext,
}: TimelineFiltersProps) {
  const fieldOptions = useMemo(() => buildFieldConfig(events), [events])
  const hasMessageEvents = useMemo(() => events.some((event) => event.type === 'Message'), [events])
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="rounded-xl border bg-muted/5 p-4">
      {/* Banner Search Bar */}
      <div className="mb-4">
        <InputGroup className="bg-background">
          <InputGroupText>
            <Search className="size-4" />
          </InputGroupText>
          <Input
            type="search"
            value={searchQuery}
            ref={searchInputRef}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearchNext?.()
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus()
                })
              }
            }}
            placeholder="Filter by content, path, or type…"
            className="border-0 focus-visible:ring-0"
          />
        </InputGroup>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">Filters</p>
          <p className="text-xs text-muted-foreground">
            Showing {formatCount(filteredCount)} of {formatCount(searchMatchCount)} matches
            {searchMatchCount !== totalCount ? ` (from ${formatCount(totalCount)} events)` : null}
          </p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={quickFilter}
          onValueChange={(value) => {
            if (!value) return
            onQuickFilterChange(value as QuickFilter)
          }}
          className="flex flex-wrap gap-1"
        >
          {quickFilterOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.description}
              className="flex items-center gap-1 text-[11px]"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={roleFilter}
          onValueChange={(value) => {
            if (!value) return
            onRoleFilterChange(value as RoleQuickFilter)
          }}
          disabled={!hasMessageEvents}
          className="flex flex-wrap gap-1"
        >
          <ToggleGroupItem value="all" aria-label="All roles" className="flex items-center gap-1 text-[11px]">
            All roles
          </ToggleGroupItem>
          <ToggleGroupItem value="user" aria-label="User messages" className="flex items-center gap-1 text-[11px]">
            User
          </ToggleGroupItem>
          <ToggleGroupItem value="assistant" aria-label="Assistant messages" className="flex items-center gap-1 text-[11px]">
            Assistant
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={sortOrder}
          onValueChange={(value) => {
            if (!value) return
            onSortOrderChange(value as SortOrder)
          }}
          className="flex flex-wrap gap-1"
        >
          <ToggleGroupItem value="asc" aria-label="Oldest first" className="flex items-center gap-1 text-[11px]">
            Asc
          </ToggleGroupItem>
          <ToggleGroupItem value="desc" aria-label="Newest first" className="flex items-center gap-1 text-[11px]">
            Desc
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-4">
        <Filters
          filters={filters}
          fields={fieldOptions}
          onChange={onFiltersChange}
          size="sm"
          radius="full"
          showSearchInput={false}
          addButtonText="Add condition"
          className="flex flex-wrap gap-2"
        />
      </div>
    </div>
  )
}

export function applyTimelineFilters(
  events: readonly ResponseItem[],
  state: { filters: Filter<TimelineFilterValue>[]; quickFilter: QuickFilter; roleFilter: RoleQuickFilter },
) {
  if (!events.length) return [] as ResponseItem[]
  const { filters, quickFilter, roleFilter } = state
  return events.filter(
    (event) => matchesQuickFilter(event, quickFilter) && matchesRoleQuickFilter(event, roleFilter) && matchesFilterSet(event, filters),
  )
}

function buildFieldConfig(events: readonly ResponseItem[]): FilterFieldsConfig<TimelineFilterValue> {
  const types = new Set<string>(defaultTypeOptions)
  const roles = new Set<string>(['user', 'assistant', 'system'])
  for (const event of events) {
    if (typeof event.type === 'string') {
      types.add(event.type)
    }
    if (event.type === 'Message' && typeof event.role === 'string') {
      roles.add(event.role)
    }
  }

  const fields: FilterFieldsConfig<TimelineFilterValue> = [
    {
      key: 'type',
      label: 'Event type',
      type: 'multiselect',
      options: Array.from(types).sort().map((value) => ({ value, label: value })),
      allowCustomValues: false,
      searchable: true,
    },
  ]

  if (roles.size) {
    fields.push({
      key: 'role',
      label: 'Message role',
      type: 'multiselect',
      options: Array.from(roles)
        .sort()
        .map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
      allowCustomValues: false,
      searchable: false,
    })
  }

  return fields
}

function matchesQuickFilter(event: ResponseItem, quickFilter: QuickFilter) {
  switch (quickFilter) {
    case 'messages':
      return event.type === 'Message'
    case 'tools':
      return ['FunctionCall', 'LocalShellCall', 'CustomToolCall', 'WebSearchCall'].includes(event.type)
    case 'files':
      return event.type === 'FileChange'
    default:
      return true
  }
}

function matchesFilterSet(event: ResponseItem, filters: Filter<TimelineFilterValue>[]) {
  if (!filters.length) return true
  return filters.every((filter) => matchesFilter(event, filter))
}

function matchesFilter(event: ResponseItem, filter: Filter<TimelineFilterValue>) {
  const values = (filter.values ?? []).map((value) => value.toLowerCase())
  switch (filter.field) {
    case 'type':
      return compareValue(event.type, values, filter.operator)
    case 'role':
      return compareValue(event.type === 'Message' ? event.role : undefined, values, filter.operator)
    default:
      return true
  }
}

function matchesRoleQuickFilter(event: ResponseItem, roleFilter: RoleQuickFilter) {
  if (roleFilter === 'all') return true
  const role = event.type === 'Message' ? event.role?.toLowerCase() : undefined
  if (roleFilter === 'user') {
    return event.type === 'Message' && role === 'user'
  }
  if (roleFilter === 'assistant') {
    if (event.type === 'Message') {
      return role === 'assistant'
    }
    return ['FunctionCall', 'LocalShellCall', 'CustomToolCall', 'WebSearchCall'].includes(event.type)
  }
  return true
}

function compareValue(
  rawValue: string | undefined,
  allowed: string[],
  operator: string,
) {
  const value = rawValue?.toLowerCase()
  if (operator === 'empty') return !value
  if (operator === 'not_empty') return Boolean(value)
  if (!allowed.length) return true

  switch (operator) {
    case 'is':
    case 'equals':
    case 'is_any_of':
    case 'includes':
    case 'includes_any_of':
      return value ? allowed.includes(value) : false
    case 'is_not':
    case 'not_equals':
    case 'is_not_any_of':
    case 'excludes_all':
      return value ? !allowed.includes(value) : true
    case 'includes_all':
      return value ? allowed.every((allowedValue) => allowedValue === value) : false
    default:
      return true
  }
}
```

---

# You Asked:

search input bar still not showing and is still  in the filters sections

# Gemini Responded:

To address the issue where the search bar appears trapped within the "filters section" or isn't showing up prominently as a banner, I will refactor the components to explicitly separate the search functionality from the filter controls.

1.  **`TimelineWithFilters.tsx`**: I will lift the search input **out** of the `TimelineFilters` component and render it directly at the top of the `TimelineWithFilters` view. This ensures it remains visible as a "banner" even if the filters are moved (portalled) elsewhere.
2.  **`TimelineFilters.tsx`**: I will remove the search input from this component so it only contains the filter toggles.
3.  **`SessionList.tsx`**: I will ensure the search bar is rendered explicitly in the `CardHeader` but visually distinct from the filter toolbar, ensuring it takes priority as the main search banner.

### 1\. `src/components/viewer/TimelineWithFilters.tsx`

I am adding the `InputGroup` based search bar directly to this component's render output, effectively creating a "Banner" area above the filters.

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { ResponseItem } from '~/lib/viewer-types'
import { AnimatedTimelineList, type TimelineEvent, type TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
import type { Filter } from '~/components/ui/filters'
import {
  TimelineFilters,
  applyTimelineFilters,
  type QuickFilter,
  type RoleQuickFilter,
  type SortOrder,
  type TimelineFilterValue,
} from '~/components/viewer/TimelineFilters'
import { dedupeTimelineEvents } from '~/components/viewer/AnimatedTimelineList'
import { buildSearchMatchers, matchesSearchMatchers, type SearchMatcher } from '~/utils/search'
import { Input } from '~/components/ui/input'
import { InputGroup, InputGroupText } from '~/components/ui/input-group'

interface TimelineWithFiltersProps {
  /**
   * Raw timeline events. This component owns all filtering/search logic so
   * callers don't need to manage derived state themselves.
   */
  events: readonly ResponseItem[]
  onAddEventToChat?: (event: TimelineEvent, index: number) => void
  timelineHeight?: number
  registerFilters?: (node: React.ReactNode | null) => void
  flaggedEvents?: Map<number, TimelineFlagMarker>
  onFlaggedEventClick?: (marker: TimelineFlagMarker) => void
}

export function TimelineWithFilters({
  events,
  onAddEventToChat,
  timelineHeight,
  registerFilters,
  flaggedEvents,
  onFlaggedEventClick,
}: TimelineWithFiltersProps) {
  const [filters, setFilters] = useState<Filter<TimelineFilterValue>[]>([])
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [roleFilter, setRoleFilter] = useState<RoleQuickFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const searchMatchers = useMemo(() => buildSearchMatchers(searchQuery), [searchQuery])

  const searchMatches = useMemo(
    () => applyTimelineSearch(events, searchMatchers),
    [events, searchMatchers],
  )
  const filteredEvents = useMemo(
    () => applyTimelineFilters(searchMatches, { filters, quickFilter, roleFilter }),
    [searchMatches, filters, quickFilter, roleFilter],
  )
  const dedupedEvents = useMemo(() => dedupeTimelineEvents(filteredEvents), [filteredEvents])
  const orderedEvents = useMemo(
    () => (sortOrder === 'asc' ? dedupedEvents : [...dedupedEvents].reverse()),
    [dedupedEvents, sortOrder],
  )
  const displayNumberMap = useMemo(() => {
    const map = new WeakMap<TimelineEvent, number>()
    events.forEach((event, index) => {
      map.set(event as TimelineEvent, index + 1)
    })
    return map
  }, [events])
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null)

  const resetSearchNavigation = useCallback(() => {
    setActiveSearchIndex(null)
  }, [])

  useEffect(() => {
    resetSearchNavigation()
  }, [searchMatchers, resetSearchNavigation])

  useEffect(() => {
    if (orderedEvents.length === 0) {
      resetSearchNavigation()
      return
    }
    setActiveSearchIndex((current) => {
      if (current == null) return current
      if (current >= orderedEvents.length) {
        return orderedEvents.length - 1
      }
      return current
    })
  }, [orderedEvents.length, resetSearchNavigation])

  const handleSearchNext = useCallback(() => {
    if (!searchMatchers.length) return
    if (!orderedEvents.length) return
    setActiveSearchIndex((current) => {
      if (current == null) return 0
      const nextIndex = (current + 1) % orderedEvents.length
      return nextIndex
    })
  }, [orderedEvents.length, searchMatchers])

  const hasSourceEvents = events.length > 0
  const hasFilteredEvents = filteredEvents.length > 0
  const noMatches = hasSourceEvents && !hasFilteredEvents

  const filtersNode = useMemo(
    () => (
      <TimelineFilters
        events={events}
        filters={filters}
        onFiltersChange={setFilters}
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        filteredCount={filteredEvents.length}
        totalCount={events.length}
        searchMatchCount={searchMatches.length}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />
    ),
    [
      events,
      filters,
      quickFilter,
      roleFilter,
      filteredEvents.length,
      searchMatches.length,
      sortOrder,
    ],
  )

  useEffect(() => {
    if (!registerFilters) return
    registerFilters(filtersNode)
    return () => registerFilters(null)
  }, [registerFilters, filtersNode])

  return (
    <div className="space-y-4">
      {/* Banner Search Input - Always rendered here */}
      <div className="bg-background">
        <InputGroup className="w-full">
          <InputGroupText>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupText>
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSearchNext()
              }
            }}
            placeholder="Filter by content, path, or type…"
            className="border-0 focus-visible:ring-0"
          />
        </InputGroup>
      </div>

      {registerFilters ? null : filtersNode}

      {!hasSourceEvents ? (
        <p className="text-sm text-muted-foreground">Load or drop a session to populate the timeline.</p>
      ) : noMatches ? (
        <p className="text-sm text-muted-foreground">No events match your current filters.</p>
      ) : (
        <AnimatedTimelineList
          events={orderedEvents}
          searchQuery={searchQuery}
          activeMatchIndex={activeSearchIndex}
          onAddEventToChat={onAddEventToChat}
          searchMatchers={searchMatchers}
          getDisplayNumber={(event) => displayNumberMap.get(event)}
          height={timelineHeight}
          flaggedEvents={flaggedEvents}
          onFlaggedEventClick={onFlaggedEventClick}
        />
      )}
    </div>
  )
}

export function applyTimelineSearch(events: readonly ResponseItem[], matchers: SearchMatcher[]) {
  if (!matchers.length) return events

  return events.filter((event) => {
    const anyEvent = event as any
    const parts: string[] = []
    const pushValue = (value: unknown) => {
      if (value == null) return
      if (typeof value === 'string') {
        parts.push(value)
        return
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        parts.push(String(value))
        return
      }
      if (Array.isArray(value)) {
        value.forEach((entry) => pushValue(entry))
        return
      }
      if (typeof value === 'object') {
        try {
          parts.push(JSON.stringify(value))
        } catch {}
      }
    }

    if (typeof anyEvent.type === 'string') parts.push(anyEvent.type)
    if (typeof anyEvent.role === 'string') parts.push(anyEvent.role)
    if (typeof anyEvent.name === 'string') parts.push(anyEvent.name)
    if (typeof anyEvent.command === 'string') parts.push(anyEvent.command)
    if (typeof anyEvent.path === 'string') parts.push(anyEvent.path)
    if (typeof anyEvent.query === 'string') parts.push(anyEvent.query)

    const content = anyEvent.content
    if (typeof content === 'string') {
      parts.push(content)
    } else if (Array.isArray(content)) {
      parts.push(
        content
          .map((part: unknown) =>
            typeof part === 'string'
              ? part
              : typeof (part as any).text === 'string'
                ? (part as any).text
                : ''
          )
          .join(' ')
      )
    }

    pushValue(anyEvent.stdout)
    pushValue(anyEvent.stderr)
    pushValue(anyEvent.result)
    pushValue(anyEvent.args)
    pushValue(anyEvent.output)
    pushValue(anyEvent.data)
    pushValue(anyEvent.meta)
    pushValue(anyEvent.git)
    pushValue(anyEvent.payload)

    try {
      parts.push(JSON.stringify(anyEvent))
    } catch {}

    const haystack = parts.join(' ')
    if (!haystack.trim()) return false
    return matchesSearchMatchers(haystack, matchers)
  })
}
```

### 2\. `src/components/viewer/TimelineFilters.tsx`

I am removing the search input and related props from this component, converting it back to a pure filter control component.

```typescript
import { useMemo } from 'react'
import { Filters } from '~/components/ui/filters'
import type { Filter, FilterFieldsConfig } from '~/components/ui/filters'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type { ResponseItem } from '~/lib/viewer-types'
import { formatCount } from '~/utils/intl'

export type TimelineFilterFieldKey = 'type' | 'role'
export type TimelineFilterValue = string
export type QuickFilter = 'all' | 'messages' | 'tools' | 'files'
export type RoleQuickFilter = 'all' | 'user' | 'assistant'
export type SortOrder = 'asc' | 'desc'

interface TimelineFiltersProps {
  events: readonly ResponseItem[]
  filters: Filter<TimelineFilterValue>[]
  onFiltersChange: (next: Filter<TimelineFilterValue>[]) => void
  quickFilter: QuickFilter
  onQuickFilterChange: (next: QuickFilter) => void
  roleFilter: RoleQuickFilter
  onRoleFilterChange: (next: RoleQuickFilter) => void
  sortOrder: SortOrder
  onSortOrderChange: (next: SortOrder) => void
  filteredCount: number
  totalCount: number
  searchMatchCount: number
}

const defaultTypeOptions = [
  'Message',
  'Reasoning',
  'FunctionCall',
  'LocalShellCall',
  'WebSearchCall',
  'CustomToolCall',
  'FileChange',
  'Other',
]

const quickFilterOptions: { label: string; value: QuickFilter; description: string }[] = [
  { value: 'all', label: 'All', description: 'Everything' },
  { value: 'messages', label: 'Messages', description: 'Only user/assistant text' },
  { value: 'tools', label: 'Tools', description: 'Function + tool executions' },
  { value: 'files', label: 'Files', description: 'File change diff events' },
]

/**
 * Presentational filter header for the timeline. Owns no state – callers manage
 * filter/search values and pass them in.
 */
export function TimelineFilters({
  events,
  filters,
  onFiltersChange,
  quickFilter,
  onQuickFilterChange,
  roleFilter,
  onRoleFilterChange,
  sortOrder,
  onSortOrderChange,
  filteredCount,
  totalCount,
  searchMatchCount,
}: TimelineFiltersProps) {
  const fieldOptions = useMemo(() => buildFieldConfig(events), [events])
  const hasMessageEvents = useMemo(() => events.some((event) => event.type === 'Message'), [events])

  return (
    <div className="rounded-xl border bg-muted/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">Filters</p>
          <p className="text-xs text-muted-foreground">
            Showing {formatCount(filteredCount)} of {formatCount(searchMatchCount)} matches
            {searchMatchCount !== totalCount ? ` (from ${formatCount(totalCount)} events)` : null}
          </p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={quickFilter}
          onValueChange={(value) => {
            if (!value) return
            onQuickFilterChange(value as QuickFilter)
          }}
          className="flex flex-wrap gap-1"
        >
          {quickFilterOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.description}
              className="flex items-center gap-1 text-[11px]"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={roleFilter}
          onValueChange={(value) => {
            if (!value) return
            onRoleFilterChange(value as RoleQuickFilter)
          }}
          disabled={!hasMessageEvents}
          className="flex flex-wrap gap-1"
        >
          <ToggleGroupItem value="all" aria-label="All roles" className="flex items-center gap-1 text-[11px]">
            All roles
          </ToggleGroupItem>
          <ToggleGroupItem value="user" aria-label="User messages" className="flex items-center gap-1 text-[11px]">
            User
          </ToggleGroupItem>
          <ToggleGroupItem value="assistant" aria-label="Assistant messages" className="flex items-center gap-1 text-[11px]">
            Assistant
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={sortOrder}
          onValueChange={(value) => {
            if (!value) return
            onSortOrderChange(value as SortOrder)
          }}
          className="flex flex-wrap gap-1"
        >
          <ToggleGroupItem value="asc" aria-label="Oldest first" className="flex items-center gap-1 text-[11px]">
            Asc
          </ToggleGroupItem>
          <ToggleGroupItem value="desc" aria-label="Newest first" className="flex items-center gap-1 text-[11px]">
            Desc
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-4">
        <Filters
          filters={filters}
          fields={fieldOptions}
          onChange={onFiltersChange}
          size="sm"
          radius="full"
          showSearchInput={false}
          addButtonText="Add condition"
          className="flex flex-wrap gap-2"
        />
      </div>
    </div>
  )
}

export function applyTimelineFilters(
  events: readonly ResponseItem[],
  state: { filters: Filter<TimelineFilterValue>[]; quickFilter: QuickFilter; roleFilter: RoleQuickFilter },
) {
  if (!events.length) return [] as ResponseItem[]
  const { filters, quickFilter, roleFilter } = state
  return events.filter(
    (event) => matchesQuickFilter(event, quickFilter) && matchesRoleQuickFilter(event, roleFilter) && matchesFilterSet(event, filters),
  )
}

function buildFieldConfig(events: readonly ResponseItem[]): FilterFieldsConfig<TimelineFilterValue> {
  const types = new Set<string>(defaultTypeOptions)
  const roles = new Set<string>(['user', 'assistant', 'system'])
  for (const event of events) {
    if (typeof event.type === 'string') {
      types.add(event.type)
    }
    if (event.type === 'Message' && typeof event.role === 'string') {
      roles.add(event.role)
    }
  }

  const fields: FilterFieldsConfig<TimelineFilterValue> = [
    {
      key: 'type',
      label: 'Event type',
      type: 'multiselect',
      options: Array.from(types).sort().map((value) => ({ value, label: value })),
      allowCustomValues: false,
      searchable: true,
    },
  ]

  if (roles.size) {
    fields.push({
      key: 'role',
      label: 'Message role',
      type: 'multiselect',
      options: Array.from(roles)
        .sort()
        .map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
      allowCustomValues: false,
      searchable: false,
    })
  }

  return fields
}

function matchesQuickFilter(event: ResponseItem, quickFilter: QuickFilter) {
  switch (quickFilter) {
    case 'messages':
      return event.type === 'Message'
    case 'tools':
      return ['FunctionCall', 'LocalShellCall', 'CustomToolCall', 'WebSearchCall'].includes(event.type)
    case 'files':
      return event.type === 'FileChange'
    default:
      return true
  }
}

function matchesFilterSet(event: ResponseItem, filters: Filter<TimelineFilterValue>[]) {
  if (!filters.length) return true
  return filters.every((filter) => matchesFilter(event, filter))
}

function matchesFilter(event: ResponseItem, filter: Filter<TimelineFilterValue>) {
  const values = (filter.values ?? []).map((value) => value.toLowerCase())
  switch (filter.field) {
    case 'type':
      return compareValue(event.type, values, filter.operator)
    case 'role':
      return compareValue(event.type === 'Message' ? event.role : undefined, values, filter.operator)
    default:
      return true
  }
}

function matchesRoleQuickFilter(event: ResponseItem, roleFilter: RoleQuickFilter) {
  if (roleFilter === 'all') return true
  const role = event.type === 'Message' ? event.role?.toLowerCase() : undefined
  if (roleFilter === 'user') {
    return event.type === 'Message' && role === 'user'
  }
  if (roleFilter === 'assistant') {
    if (event.type === 'Message') {
      return role === 'assistant'
    }
    return ['FunctionCall', 'LocalShellCall', 'CustomToolCall', 'WebSearchCall'].includes(event.type)
  }
  return true
}

function compareValue(
  rawValue: string | undefined,
  allowed: string[],
  operator: string,
) {
  const value = rawValue?.toLowerCase()
  if (operator === 'empty') return !value
  if (operator === 'not_empty') return Boolean(value)
  if (!allowed.length) return true

  switch (operator) {
    case 'is':
    case 'equals':
    case 'is_any_of':
    case 'includes':
    case 'includes_any_of':
      return value ? allowed.includes(value) : false
    case 'is_not':
    case 'not_equals':
    case 'is_not_any_of':
    case 'excludes_all':
      return value ? !allowed.includes(value) : true
    case 'includes_all':
      return value ? allowed.every((allowedValue) => allowedValue === value) : false
    default:
      return true
  }
}
```

### 3\. `src/components/viewer/SessionList.tsx`

I am re-asserting the position of the search bar directly in the `CardHeader` and double-checking that it isn't nested inside any logic that might hide it.

```typescript
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Copy, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { ShimmerButton } from '~/components/ui/shimmer-button';
import { Loader } from '~/components/ui/loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupText } from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import type { RepoMetadata } from '~/lib/repo-metadata';
import { cn } from '~/lib/utils';
import { formatCount, formatDateTime } from '~/utils/intl';
import { BorderBeam } from '~/components/ui/border-beam';
import { TimelineView } from '~/components/viewer/TimelineView';
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger';
import { toast } from 'sonner';
import { HighlightedText } from '~/components/ui/highlighted-text';
import { buildSearchMatchers, matchesSearchMatchers, type SearchMatcher } from '~/utils/search';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import { TracingBeam } from '~/components/aceternity/tracing-beam';
import { Separator } from '~/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';

interface BranchGroup {
  id: string;
  name: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
}

interface RepositoryGroup {
  id: string;
  label: string;
  repoName: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
  repoMeta?: RepoMetadata;
  branches: BranchGroup[];
  branchCount: number;
  hasUnknownBranch: boolean;
}

export interface SessionListProps {
  sessionAssets: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
  onFiltersRender?: (node: ReactNode | null) => void;
}

const sessionCountIntensity = {
  low: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  medium: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-50',
  high: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50',
} as const;

type SizeUnit = 'KB' | 'MB';
type SortKey = 'timestamp' | 'size';
type SortDirection = 'asc' | 'desc';

interface SessionExplorerFilterState {
  searchText: string;
  sortKey: SortKey;
  sortDir: SortDirection;
  sizeMinValue: string;
  sizeMinUnit: SizeUnit;
  sizeMaxValue: string;
  sizeMaxUnit: SizeUnit;
  timestampFrom: string;
  timestampTo: string;
}

const defaultFilterState: SessionExplorerFilterState = {
  searchText: '',
  sortKey: 'timestamp',
  sortDir: 'desc',
  sizeMinValue: '',
  sizeMinUnit: 'MB',
  sizeMaxValue: '',
  sizeMaxUnit: 'MB',
  timestampFrom: '',
  timestampTo: '',
};

type FilterBadgeKey = 'size' | 'timestamp';

const SIZE_UNITS: SizeUnit[] = ['KB', 'MB'];

type SessionPreset = 'all' | 'recent' | 'heavy';

export function SessionList({
  sessionAssets,
  snapshotTimestamp,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onSelectionChange,
  onAddSessionToChat,
  onFiltersRender,
}: SessionListProps) {
  const [filters, setFilters] = useState<SessionExplorerFilterState>(defaultFilterState);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const [sessionPreset, setSessionPreset] = useState<SessionPreset>('all');
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false);
  const searchMatchers = useMemo(() => buildSearchMatchers(filters.searchText), [filters.searchText]);
  const quickFilterOptions = useMemo(
    () => [
      {
        key: 'week',
        label: 'Updated last 7 days',
        description: 'Shows sessions refreshed this week',
        apply: () => {
          const fromIso = toLocalDateTimeInput(snapshotTimestamp - 1000 * 60 * 60 * 24 * 7);
          setFilters((prev) => ({
            ...prev,
            timestampFrom: fromIso,
            timestampTo: '',
          }));
          setSessionPreset('recent');
        },
      },
      {
        key: 'compact',
        label: 'Smaller than 5 MB',
        description: 'Useful when scanning quick traces',
        apply: () => {
          setFilters((prev) => ({
            ...prev,
            sizeMinValue: '',
            sizeMaxValue: '5',
            sizeMaxUnit: 'MB',
          }));
          setSessionPreset('all');
        },
      },
      {
        key: 'clear',
        label: 'Clear quick filters',
        description: 'Reset preset overrides',
        apply: () => {
          setFilters((prev) => ({
            ...prev,
            sizeMinValue: '',
            sizeMaxValue: '',
            timestampFrom: '',
            timestampTo: '',
          }));
          setSessionPreset('all');
        },
      },
    ],
    [snapshotTimestamp],
  );
  const filterLogRef = useRef<{ modelKey: string; count: number }>({ modelKey: '', count: sessionAssets.length });
  const viewModelLogRef = useRef<{ total: number; groups: number } | null>(null);
  const sizeMinBytes = toBytes(filters.sizeMinValue, filters.sizeMinUnit);
  const sizeMaxBytes = toBytes(filters.sizeMaxValue, filters.sizeMaxUnit);
  const timestampFromMs = toTimestampMs(filters.timestampFrom);
  const timestampToMs = toTimestampMs(filters.timestampTo);
  const { sortKey, sortDir } = filters;
  const updateFilter = useCallback(<K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);
  const applyPreset = useCallback((value: SessionPreset) => {
    setSessionPreset(value);
    if (value === 'all') {
      setFilters((prev) => ({
        ...prev,
        timestampFrom: '',
        timestampTo: '',
        sizeMinValue: '',
        sizeMaxValue: '',
      }));
      return;
    }
    if (value === 'recent') {
      const fromIso = toLocalDateTimeInput(snapshotTimestamp - 1000 * 60 * 60 * 24 * 2);
      setFilters((prev) => ({
        ...prev,
        timestampFrom: fromIso,
        timestampTo: '',
      }));
      return;
    }
    if (value === 'heavy') {
      setFilters((prev) => ({
        ...prev,
        sizeMinValue: '25',
        sizeMinUnit: 'MB',
        sizeMaxValue: '',
      }));
    }
  }, [snapshotTimestamp]);

  useEffect(() => {
    if (sizeMinBytes !== undefined && sizeMaxBytes !== undefined && sizeMinBytes > sizeMaxBytes) {
      logWarn('viewer.filters', 'Manual size range invalid', {
        sizeMinBytes,
        sizeMaxBytes,
      });
    }
  }, [sizeMinBytes, sizeMaxBytes]);

  useEffect(() => {
    if (timestampFromMs && timestampToMs && timestampFromMs > timestampToMs) {
      logWarn('viewer.filters', 'Timestamp range invalid', {
        timestampFromMs,
        timestampToMs,
      });
    }
  }, [timestampFromMs, timestampToMs]);

  const accessibleAssets = useMemo(
    () => sessionAssets.filter((asset) => typeof asset.url === 'string' && asset.url.includes('/api/uploads/')),
    [sessionAssets],
  );

  const repositoryGroups = useMemo(
    () => aggregateByRepository(accessibleAssets),
    [accessibleAssets],
  );

  useEffect(() => {
    const repoCount = new Set(repositoryGroups.map((group) => group.repoName)).size;
    const modelKey = `${accessibleAssets.length}:${repositoryGroups.length}`;
    if (viewModelLogRef.current?.total === accessibleAssets.length && viewModelLogRef.current?.groups === repositoryGroups.length) {
      return;
    }
    logInfo('viewer.explorer', 'Computed session explorer view model', {
      totalSessions: accessibleAssets.length,
      repoCount,
      groupCount: repositoryGroups.length,
    });
    viewModelLogRef.current = { total: accessibleAssets.length, groups: repositoryGroups.length };
  }, [accessibleAssets.length, repositoryGroups]);

  const { groups: filteredGroups, filteredSessionCount } = useMemo(() => {
    const min = typeof sizeMinBytes === 'number' ? sizeMinBytes : undefined;
    const max = typeof sizeMaxBytes === 'number' ? sizeMaxBytes : undefined;
    const from = typeof timestampFromMs === 'number' ? timestampFromMs : undefined;
    const to = typeof timestampToMs === 'number' ? timestampToMs : undefined;
    const groups = repositoryGroups
      .map((group) => {
        const filteredBranches = group.branches
          .map((branch) => {
            const filteredSessions = branch.sessions.filter((session) => {
              const matchesSearch = searchMatchers.length
                ? matchesSearchText(searchMatchers, group, session)
                : true;
              if (!matchesSearch) return false;
              const size = session.size ?? 0;
              const meetsMin = min === undefined || size >= min;
              const meetsMax = max === undefined || size <= max;
              if (!meetsMin || !meetsMax) return false;
              const sessionTimestamp = session.sortKey ?? 0;
              const meetsFrom = from === undefined || sessionTimestamp >= from;
              const meetsTo = to === undefined || sessionTimestamp <= to;
              return meetsFrom && meetsTo;
            });
            if (!filteredSessions.length) return null;
            const sortedSessions = sortSessions(filteredSessions, sortKey, sortDir);
            return {
              ...branch,
              sessions: sortedSessions,
              primarySortValue: getSortValue(sortedSessions[0], sortKey),
            };
          })
          .filter(Boolean) as Array<BranchGroup & { primarySortValue: number }>;

        const branchDirection = sortDir === 'asc' ? 1 : -1;
        const sortedBranches = filteredBranches.sort((a, b) => {
          const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0);
          if (diff !== 0) return branchDirection * diff;
          return a.name.localeCompare(b.name);
        });

        if (!sortedBranches.length) return null;
        const flattenedSessions = sortedBranches.flatMap((branch) => branch.sessions);
        const primarySortValue = sortedBranches[0]?.primarySortValue ?? getSortValue(flattenedSessions[0], sortKey);
        const filteredNamedBranches = sortedBranches.filter(
          (branch) => branch.name && branch.name.trim().length > 0 && branch.name.toLowerCase() !== 'unknown'
        );
        const branchCount = filteredNamedBranches.length;
        const hasUnknownBranch = sortedBranches.some((branch) => branch.name.toLowerCase() === 'unknown');
        return {
          ...group,
          sessions: flattenedSessions,
          branches: sortedBranches.map(({ primarySortValue: _p, ...rest }) => rest),
          branchCount,
          hasUnknownBranch,
          primarySortValue,
        };
      })
      .filter(Boolean) as Array<RepositoryGroup & { primarySortValue: number }>;

    const sortedGroups = groups.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1;
      const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0);
      if (diff !== 0) {
        return direction * diff;
      }
      return a.label.localeCompare(b.label);
    });

    const total = sortedGroups.reduce((count, group) => count + group.sessions.length, 0);
    return { groups: sortedGroups, filteredSessionCount: total };
  }, [repositoryGroups, searchMatchers, sizeMinBytes, sizeMaxBytes, sortKey, sortDir, timestampFromMs, timestampToMs]);

  useEffect(() => {
    const filterModel = buildFilterModel(filters, {
      sizeMinBytes,
      sizeMaxBytes,
      timestampFromMs,
      timestampToMs,
    });
    const modelKey = JSON.stringify(filterModel);
    if (filterLogRef.current.modelKey === modelKey && filterLogRef.current.count === filteredSessionCount) {
      return;
    }
    logInfo('viewer.filters', 'Session explorer filters updated', {
      filterModel,
      beforeCount: filterLogRef.current.count,
      afterCount: filteredSessionCount,
      navigation: 'local-state',
    });
    filterLogRef.current = { modelKey, count: filteredSessionCount };
  }, [filteredSessionCount, filters, sizeMaxBytes, sizeMinBytes, timestampFromMs, timestampToMs]);

  useEffect(() => {
    if (!selectedSessionPath) return;
    const stillVisible = filteredGroups.some((group) =>
      group.sessions.some((session) => session.path === selectedSessionPath),
    );
    if (!stillVisible) {
      const existsInMemory = accessibleAssets.some((session) => session.path === selectedSessionPath);
      if (existsInMemory) {
        logDebug('viewer.explorer', 'Selected session hidden by filters', {
          selectedSessionPath,
          filterModel: buildFilterModel(filters, {
            sizeMinBytes,
            sizeMaxBytes,
            timestampFromMs,
            timestampToMs,
          }),
        });
        onSelectionChange?.(null);
      }
    }
  }, [
    filteredGroups,
    sizeMaxBytes,
    sizeMinBytes,
    onSelectionChange,
    filters,
    selectedSessionPath,
    accessibleAssets,
    timestampFromMs,
    timestampToMs,
  ]);

  useEffect(() => {
    const visibleIds = new Set(filteredGroups.map((group) => group.id));
    setExpandedGroupIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredGroups]);

  useEffect(() => {
    if (accessibleAssets.length > 0 && filteredSessionCount === 0) {
      const filterModel = buildFilterModel(filters, {
        sizeMinBytes,
        sizeMaxBytes,
        timestampFromMs,
        timestampToMs,
      });
      logError('viewer.explorer', 'Filters produced zero sessions while memory still populated', {
        filterModel,
        totalSessions: accessibleAssets.length,
        groupSamples: repositoryGroups.slice(0, 5).map((group) => group.id),
      });
    }
  }, [accessibleAssets.length, filteredSessionCount, filters, repositoryGroups, sizeMaxBytes, sizeMinBytes, timestampFromMs, timestampToMs]);

  const handleRepoToggle = (group: RepositoryGroup, shouldExpand: boolean) => {
    logDebug('viewer.explorer', 'Toggled repository group', {
      groupId: group.id,
      repoName: group.repoName,
      branchCount: group.branchCount,
      previousOpenState: !shouldExpand,
      nextOpenState: shouldExpand,
    });
    if (shouldExpand) {
      setLoadingRepoId(group.id);
      const simulatedDelay = group.sessions.length > 20 ? 400 : group.sessions.length > 8 ? 260 : 160;
      setTimeout(() => {
        setLoadingRepoId((current) => (current === group.id ? null : current));
      }, simulatedDelay);
    } else {
      setLoadingRepoId((current) => (current === group.id ? null : current));
    }
  };

  const handleAccordionChange = (nextValue: string[]) => {
    setExpandedGroupIds(nextValue);
    const added = nextValue.find((id) => !expandedGroupIds.includes(id));
    if (added) {
      const target = filteredGroups.find((group) => group.id === added);
      if (target) {
        handleRepoToggle(target, true);
      }
    }
    const removed = expandedGroupIds.find((id) => !nextValue.includes(id));
    if (removed) {
      const target = filteredGroups.find((group) => group.id === removed);
      if (target) {
        handleRepoToggle(target, false);
      }
    }
  };

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilterState });
    setExpandedGroupIds([]);
    setIsFilterSheetOpen(false);
    setSessionPreset('all');
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const activeBadges = useMemo(() => buildActiveFilterBadges(filters), [filters]);
  const handleBadgeClear = useCallback((badgeKey: FilterBadgeKey) => {
    setFilters((prev) => {
      if (badgeKey === 'size') {
        return { ...prev, sizeMinValue: '', sizeMaxValue: '' };
      }
      if (badgeKey === 'timestamp') {
        return { ...prev, timestampFrom: '', timestampTo: '' };
      }
      return prev;
    });
  }, []);

  const hasResults = filteredGroups.length > 0;
  const datasetEmpty = accessibleAssets.length === 0;

  const searchBar = useMemo(() => (
    <div className="w-full">
      <InputGroup className="w-full">
        <InputGroupText>
          <Search className="size-4 text-muted-foreground" />
        </InputGroupText>
        <Input
          type="search"
          aria-label="Search sessions"
          value={filters.searchText}
          onChange={(event) => updateFilter('searchText', event.target.value)}
          placeholder="Search repo, branch, file label, tag, or year"
          className="border-0 focus-visible:ring-0"
        />
      </InputGroup>
    </div>
  ), [filters.searchText, updateFilter]);

  const filterToolbar = useMemo(
    () => (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={sessionPreset} onValueChange={(value) => applyPreset(value as SessionPreset)} className="w-full lg:w-auto min-w-0 flex-1">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="heavy">Large</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filters.sortKey} onValueChange={(value: SortKey) => updateFilter('sortKey', value)}>
              <SelectTrigger aria-label="Sort by" className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="timestamp">Timestamp</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={filters.sortDir}
              onValueChange={(value) => value && updateFilter('sortDir', value as SortDirection)}
              aria-label="Sort direction"
              className="flex"
            >
              <ToggleGroupItem value="asc" aria-label="Sort ascending" className="text-xs">
                ↑ ASC
              </ToggleGroupItem>
              <ToggleGroupItem value="desc" aria-label="Sort descending" className="text-xs">
                ↓ DESC
              </ToggleGroupItem>
            </ToggleGroup>
            <Popover open={isQuickFilterOpen} onOpenChange={setIsQuickFilterOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                  <SlidersHorizontal className="size-4" />
                  Quick filters
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <Command>
                  <CommandInput placeholder="Search presets..." />
                  <CommandList>
                    <CommandEmpty>No presets available.</CommandEmpty>
                    <CommandGroup heading="Presets">
                      {quickFilterOptions.map((option) => (
                        <CommandItem
                          key={option.key}
                          value={option.key}
                          onSelect={() => {
                            option.apply();
                            setIsQuickFilterOpen(false);
                          }}
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="secondary" className="gap-2" onClick={() => setIsFilterSheetOpen(true)}>
              Advanced
            </Button>
            <Button type="button" variant="ghost" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
        {activeBadges.length ? (
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" data-testid="active-filter-badges">
            {activeBadges.map((badge) => (
              <Badge key={badge.key} variant="secondary" className="flex items-center gap-2 whitespace-nowrap">
                {badge.label}
                <button
                  type="button"
                  aria-label={`Clear ${badge.description}`}
                  onClick={() => handleBadgeClear(badge.key)}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    ),
    [
      activeBadges,
      applyPreset,
      filters,
      handleBadgeClear,
      isQuickFilterOpen,
      quickFilterOptions,
      resetFilters,
      sessionPreset,
      updateFilter,
    ],
  );

  useEffect(() => {
    if (!onFiltersRender) return;
    onFiltersRender(filterToolbar);
    return () => onFiltersRender(null);
  }, [filterToolbar, onFiltersRender]);

  return (
    <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
      <div className="w-full">
        <Card className="flex min-h-[70vh] flex-col overflow-hidden p-0">
          <CardHeader className="space-y-4 border-b border-border/80 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">Session explorer</CardTitle>
                <CardDescription>Discover JSONL session logs grouped by repository and branch.</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                {formatCount(filteredSessionCount)} / {formatCount(accessibleAssets.length)} sessions
              </Badge>
            </div>
            
            {/* Search Bar - Explicitly placed here in CardHeader */}
            {searchBar}
            
            {onFiltersRender ? null : filterToolbar}
            
            {activeBadges.length ? (
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" data-testid="active-filter-badges">
                {activeBadges.map((badge) => (
                  <Badge key={badge.key} variant="secondary" className="flex items-center gap-2 whitespace-nowrap">
                    {badge.label}
                    <button
                      type="button"
                      aria-label={`Clear ${badge.description}`}
                      onClick={() => handleBadgeClear(badge.key)}
                      className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col overflow-hidden px-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Session repositories</p>
                <p className="text-xs text-muted-foreground">{formatCount(filteredGroups.length)} grouped results</p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Snapshot {formatDateTime(snapshotTimestamp, { fallback: 'N/A' })}
              </Badge>
            </div>
            <Separator className="mx-6 my-3" />
            <TracingBeam outerClassName="flex-1" className="px-6 pb-6">
              <div className="space-y-4 pr-2" aria-live="polite">
                {!hasResults ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
                    <p className="text-sm font-semibold">
                      {datasetEmpty ? 'No session logs discovered yet.' : 'No repositories match the selected filters.'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {datasetEmpty
                        ? 'Drop JSONL exports or point the viewer to a sessions directory to populate this view.'
                        : 'Adjust or clear filters to explore all session logs.'}
                    </p>
                  </div>
                ) : (
                  <Accordion
                    type="multiple"
                    value={expandedGroupIds}
                    onValueChange={(value) => handleAccordionChange(Array.isArray(value) ? value : [value])}
                    className="space-y-4"
                  >
                    {filteredGroups.map((repo, index) => {
                      const intentClass = getSessionChipIntent(repo.sessions.length);
                      return (
                        <div key={repo.id}>
                          <AccordionItem value={repo.id} className="border-0">
                            <AccordionTrigger
                              aria-label={`Toggle ${repo.label} repository`}
                              className={cn(
                                'rounded-2xl border border-transparent px-4 py-3 text-left transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-ring',
                                intentClass,
                                'data-[state=open]:shadow-sm',
                              )}
                            >
                              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="cursor-default text-xs font-semibold uppercase tracking-wide">
                                        <HighlightedText text={repo.label} matchers={searchMatchers} />
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <HighlightedText as="p" className="text-xs font-semibold" text={repo.label} matchers={searchMatchers} />
                                      <p className="text-xs opacity-80">
                                        Repo: <HighlightedText text={repo.repoName} matchers={searchMatchers} />
                                      </p>
                                      <p className="text-xs opacity-80">
                                        Branches:{' '}
                                        <HighlightedText
                                          text={`${describeBranches(repo.branches)} (${repo.branchCount}${repo.hasUnknownBranch ? '*' : ''})`}
                                          matchers={searchMatchers}
                                        />
                                      </p>
                                      <p className="text-xs opacity-80">Total size: {formatBytes(repo.totalSize)}</p>
                                      <p className="text-xs opacity-80">Last updated: {formatDate(repo.lastUpdated)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                                    {formatCount(repo.sessions.length)} {repo.sessions.length === 1 ? 'session' : 'sessions'}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                                    Branches {formatCount(repo.branchCount)}
                                    {repo.hasUnknownBranch ? '*' : ''}
                                  </Badge>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  <p>{formatBytes(repo.totalSize)}</p>
                                  <p>Updated {formatRelativeTime(repo.lastUpdated, snapshotTimestamp)}</p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 px-4 py-4">
                                {loadingRepoId === repo.id ? (
                                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                                    <Loader className="size-4" aria-label="Loading sessions" />
                                    Preparing session list…
                                  </div>
                                ) : (
                                  repo.branches.map((branch, branchIndex) => (
                                    <div key={branch.id} className="space-y-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide">
                                          Branch <HighlightedText text={branch.name} matchers={searchMatchers} />
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                          {formatCount(branch.sessions.length)} {branch.sessions.length === 1 ? 'session' : 'sessions'}
                                        </span>
                                      </div>
                                      <SessionRepoVirtualList
                                        sessions={branch.sessions}
                                        snapshotTimestamp={snapshotTimestamp}
                                        onSessionOpen={(session) => {
                                          onSelectionChange?.(session.path);
                                          return onSessionOpen?.(session);
                                        }}
                                        loadingSessionPath={loadingSessionPath}
                                        selectedSessionPath={selectedSessionPath}
                                        onAddSessionToChat={onAddSessionToChat}
                                        searchMatchers={searchMatchers}
                                      />
                                      {branchIndex < repo.branches.length - 1 ? <Separator className="my-1 opacity-40" /> : null}
                                    </div>
                                  ))
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          {index < filteredGroups.length - 1 ? <Separator className="my-2 opacity-50" /> : null}
                        </div>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            </TracingBeam>
          </CardContent>
        </Card>
      </div>
      <SheetContent side="right" className="w-full space-y-6 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Advanced filters</SheetTitle>
          <SheetDescription>Configure the v1 advanced filters (size range & timestamp range).</SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Size range</p>
            <p className="text-xs text-muted-foreground">Limit sessions by minimum and maximum file size.</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-size-min">
                  Minimum size
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="filter-size-min"
                    type="number"
                    min={0}
                    value={filters.sizeMinValue}
                    onChange={(event) => updateFilter('sizeMinValue', event.target.value)}
                    placeholder="e.g. 10"
                  />
                  <Select value={filters.sizeMinUnit} onValueChange={(value: SizeUnit) => updateFilter('sizeMinUnit', value)}>
                    <SelectTrigger aria-label="Minimum size unit" className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {SIZE_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-size-max">
                  Maximum size
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="filter-size-max"
                    type="number"
                    min={0}
                    value={filters.sizeMaxValue}
                    onChange={(event) => updateFilter('sizeMaxValue', event.target.value)}
                    placeholder="e.g. 100"
                  />
                  <Select value={filters.sizeMaxUnit} onValueChange={(value: SizeUnit) => updateFilter('sizeMaxUnit', value)}>
                    <SelectTrigger aria-label="Maximum size unit" className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {SIZE_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Timestamp range</p>
            <p className="text-xs text-muted-foreground">Filter sessions by when they were last updated.</p>
            <div className="grid gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-ts-from">
                  Start (UTC)
                </label>
                <Input
                  id="filter-ts-from"
                  type="datetime-local"
                  value={filters.timestampFrom}
                  onChange={(event) => updateFilter('timestampFrom', event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-ts-to">
                  End (UTC)
                </label>
                <Input
                  id="filter-ts-to"
                  type="datetime-local"
                  value={filters.timestampTo}
                  onChange={(event) => updateFilter('timestampTo', event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={resetFilters}>
            Reset all
          </Button>
          <Button variant="secondary" onClick={() => setIsFilterSheetOpen(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

---

