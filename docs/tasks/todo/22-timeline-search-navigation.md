Context
- Timeline search (src/components/viewer/TimelineSearchBar.tsx + TimelineWithFilters.tsx) currently only filters the list; Enter just advances locally with no match indicator or wrap-aware navigation.
- The virtualized list (AnimatedTimelineList + TimelineView) lacks a notion of a focused match, so searches don’t auto-scroll or center results, and users must visually hunt for them.
- Search prefs live in useUiSettingsStore and aren’t reflected in the UI (no "X of Y" status, no keyboard+button controls), making search feel incomplete.

Success criteria
- Search UI shows "current of total" with zero state handling (e.g., "0 of 0" hidden until matches exist).
- Enter advances to the next match, Shift+Enter moves to the previous match, both wrap around deterministically.
- Dedicated up/down controls next to the input mirror keyboard behavior.
- Active match automatically scrolls into view (centered) within AnimatedTimelineList regardless of virtualization state.
- Search navigation state persists per session (existing store) and never desyncs from search query/filtering.

Deliverables
- Updated TimelineSearchBar with indicator + chevron controls.
- New search navigation hook/logic module (e.g., src/components/viewer/timelineSearchNavigation.hooks.ts) coordinating match indexes, wrapping, and scroll intent without extra effects.
- Modifications to TimelineWithFilters + AnimatedTimelineList + TimelineView to accept navigation state, center-scroll, and highlight current matches.
- Tests covering navigation (unit for hook, integration in TimelineWithFilters or existing Playwright upload timeline suite) plus docs/notes in viewer README if API contracts change.

Approach
1) State + contract audit: map how searchQuery + filters flow via useUiSettingsStore and TimelineWithFilters, documenting assumptions (route search params vs store). Decide whether nav state belongs in the store or component-local (likely local derived from filtered events) and add types.
2) Introduce useSearchNavigation hook: takes ordered events + searchMatchers, returns {activeIndex, totalMatches, goNext, goPrev, reset}. Ensure it recomputes deterministically with useMemo and only uses effects for imperative focus resets when dependencies shrink.
3) Enhance TimelineSearchBar: add props for totalMatches, activeIndex, onSearchPrev, show "current of total" text, and render accessible Up/Down IconButtons. Wire Enter/Shift+Enter to goNext/goPrev, keeping focus on the input.
4) Update TimelineWithFilters: replace ad-hoc activeSearchIndex state/effects with the new hook, pass active index + match count + handlers to TimelineSearchBar, and supply active index to AnimatedTimelineList. When matches change, reset index via hook without extra mount effects.
5) Center scrolling: extend AnimatedTimelineList and TimelineView to accept {scrollToIndex, scrollAlign:'center'}; adjust TimelineView to compute item midpoint and scrollTop offset so target sits mid-viewport. Ensure virtualization updates are batched via requestAnimationFrame to avoid hydration flicker per AGENTS instructions.
6) Visual focus/highlighting: ensure HighlightedText gets the active index (already receives matchers). Add subtle styling (e.g., ring) around the active card for clarity; keep components small per file-size rules.
7) Tests/docs: create hook unit tests (timelineSearchNavigation.hooks.test.ts) verifying wrapping and resets, update TimelineWithFilters test or add viewer Playwright test for Enter navigation + auto-scroll, and document keyboard shortcuts and behavior in README or viewer docs.

Risks / unknowns
- Virtualized items may not be mounted when commanded to scroll; need to rely on TimelineView measurement + maybe requestAnimationFrame loops until measurement available.
- Current search prefs live in Zustand; confirm no requirement to sync to URL search params (if needed, adjust Route.validateSearch). This assumption must be validated.
- Highlight/scroll interactions must avoid hydration-time Suspense fallbacks; guard effects with `startTransition` if they synchronously set state before hydration completes.
- Potential performance hit if search navigation recalculates on every keystroke; mitigate via memoized match arrays and stable refs.

Testing & validation
- Unit: new hook tests around wrapping, zero matches, match shrinkage.
- Component: TimelineWithFilters React Testing Library test verifying indicator text and handler calls.
- E2E/Playwright: extend tests/uploadTimelineSection.test.tsx (or create viewer timeline spec) to type a query, hit Enter/Shift+Enter, and assert match indicator + scroll position (center within threshold).
- Manual: run pnpm dev, upload fixture, exercise search + buttons, verify no console warnings.

Rollback / escape hatch
- Feature is additive; fallback is to revert to current search-only behavior by rolling back the hook + UI changes if regressions surface.

Owner/Date
- Codex (assistant) / 2025-02-14
