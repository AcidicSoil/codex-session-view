Context
- Search boxes in the timeline (TimelineFilters/AnimatedTimelineList) and session explorer (SessionList) only filter the dataset; they never show inline highlighting, so users must read every line to find what matched.
- Designers pointed us at MagicUI’s Highlighter component, so we need to adopt a consistent highlight treatment across both the virtualized timeline list and the session explorer cards without breaking SSR/virtualization constraints.
- Timeline and session explorer both virtualize hundreds of items; any highlighting solution has to be lightweight, resilient to streaming data, and respect Start/TanStack rules (no useEffect-derived data).

Success criteria
- Entering a query in either search box visibly highlights every matching substring (case-insensitive) inside the rendered results for that surface without affecting filtering accuracy.
- Highlight styling matches the MagicUI Highlighter spec (token background + subtle glow) and maintains AA contrast in light/dark themes.
- Virtualized lists (TimelineView + SessionRepoVirtualList) keep smooth scrolling (<5ms additional render) with highlighting enabled on 500+ items.
- Highlighted markup is accessible (screen readers skip decorative marks, focus order unchanged).

Deliverables
- Shared highlight utility/component that wraps MagicUI Highlighter tokens with our theme variables.
- Updated timeline components (TimelineFilters → AnimatedTimelineList → detail renderers) to highlight in labels, meta rows, and expanded bodies.
- Updated session explorer (SessionList + SessionCard + repo headers) to highlight repo/branch/session metadata, tags, and file paths based on the local search text.
- Tests covering the highlight utility, plus updated component tests/snapshots proving highlighting renders for sample inputs.
- Optional design note or Storybook snippet documenting how to apply the new Highlighter wrapper elsewhere.

Approach
1) Audit current search props/state: document where `searchQuery` (timeline) and `searchText` (session explorer) live, how they flow through virtualization, and which fields should highlight (labels, metadata, tags, paths). Confirm existing helper `createSearchMatcher` usage and identify gaps (timeline summary rows, session repo header text, etc.).
2) Implement a theme-friendly Highlighter wrapper: port MagicUI Highlighter styles into a reusable `HighlightedText` component that accepts `text`, `query`, optional `as` prop, and renders memoized segments without `useEffect`. Include utilities for multi-token queries and escaping regex.
3) Integrate with timeline stack: feed `searchQuery` to AnimatedTimelineList summaries/meta lines, `DetailText` (replacing bespoke mark logic), and code snippets (ensuring virtualization + code syntax highlighting stay performant). Guard large payloads by memoizing highlight splits and only re-running when query/text change.
4) Integrate with session explorer: pass `searchText` into repo rows, branch headers, and `SessionCard`. Highlight repo labels, branch names, session display names, file paths, tags, and badges. Ensure filtering still operates on normalized text while highlighting uses the same normalization logic to avoid mismatch.
5) Polish + accessibility: add theme tokens/tests, verify virtualization performance (profiling). Update documentation/Storybook, and add fallback behavior (e.g., limit highlight spans per field) to prevent DOM bloat on mega logs. Land unit/component tests plus manual QA checklist.

Risks / unknowns
- Highlighting inside virtualized rows could force re-renders that hurt scroll perf; may need memoization or virtualization cache busting.
- Complex queries (regex-like characters, multi-word) must be sanitized to avoid crashing the matcher or mismatching filter results.
- Session explorer and timeline use different search heuristics; if we don’t align normalization, highlight spans might not match the filtered set, confusing users.
- MagicUI Highlighter CSS may clash with current typography; need to confirm with design or tweak tokens.

Testing & validation
- `pnpm vitest run src/components/viewer/TimelineWithFilters.test.tsx src/components/viewer/SessionList.test.tsx` to cover highlight rendering conditions.
- Add unit tests for the highlight utility (multiple matches, unicode, diacritics, escaping, dark-mode classnames).
- Manual QA: load large timeline (>=500 events) + heavy session explorer dataset; verify highlights update live while typing, virtualization stays smooth, and light/dark themes maintain contrast.
- Optional Playwright smoke (e2e) to type queries and assert highlight markup counts.

Rollback / escape hatch
- Keep highlight wrapper opt-in and guarded by a feature flag/prop; reverting to plain text means removing the wrapper while leaving filter logic untouched.

Owner/Date
- Codex / 2025-11-24
