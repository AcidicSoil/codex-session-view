Context
- Session Explorer filters currently live in a single FamilyDrawer view that still exposes deprecated facets (sources/branches/tags) and mixes every control at once, so the drawer violates product guidance in AGENTS.md about avoiding "god components" and contributes to cognitive overload noted in the conversation export.
- Product wants the Cult UI "FamilyDrawer" navigation pattern: a root view summarizing active filters and four dedicated child views (Sort Order, Recency, Size Range, Timestamp Range) with slide-in navigation, removing the deprecated categories entirely.
- Reset behavior today delegates to `onResetFilters`, but it only refreshes the flat panel; we need a global reset that immediately updates every child view summary and clears Size Range inputs to empty strings rather than `0`.
- Existing code (`SessionExplorerToolbar`, `SessionFiltersPanel`, `sessionExplorerTypes`) still models facets and range inputs in-place; the plan must respect repository constraints (no fetch-in-effects, no god modules) while reusing existing TanStack Start state management (`useSessionExplorerModel`, URL search syncing).

Success criteria / acceptance
- Root FamilyDrawer view shows exactly the four required entries with accurate subtitles reflecting current filter state, and deprecated facets never appear anywhere in the UI or state transitions.
- Selecting a root entry animates to its dedicated child view with Back navigation; edits there update the shared filter state instantly and are reflected in the root summaries without extra effects.
- Reset button in the root view clears all filter state back to defaults (sort timestamp/desc, recency all, empty size/timestamp inputs) and the UI mirrors the change instantly.
- Filters continue to round-trip through URL/search state, existing badges, and query derivations with no regression in list filtering, and all new modules satisfy the “one responsibility per file” rule.

Deliverables
- Refactored Session Explorer filter drawer composed of a root navigation view plus four child view modules, wired through FamilyDrawer view registry.
- Updated filter state utilities/types to drop deprecated facets and ensure defaults align with the new UX (including string-empty size fields).
- Revised reset+apply handlers plus any supporting hooks/utilities to coordinate state across nested views without effects.
- Documentation update (docs/tasks/overview or viewer docs) summarizing the new drawer architecture, plus changelog entry.
- Automated coverage (component/unit and Playwright or Vitest) validating navigation, reset behavior, and persisted filter state.

Approach
1. Audit current SessionExplorer filter flow: inspect `SessionExplorerToolbar`, `SessionFiltersPanel`, `sessionExplorerTypes`, URL sync helpers, and tests to catalog which props/state pieces remain after removing sources/branches/tags; document any coupled logic in sessionExplorerUtils/buildFilterModel that must be rewritten.
2. Define new filter state schema: remove deprecated facet arrays, ensure defaults + URL parsing only consider sort/recency/size/timestamp, and add helpers for generating human-readable summaries for each category to display in the root view.
3. Create feature slice modules under `src/components/viewer/session-list/filters/` (or equivalent) for `FiltersDrawerRootView` and four child views, each responsible only for its UI; use FamilyDrawer `views` registry to map navigation buttons to these components and keep SessionExplorerToolbar lean.
4. Embed the new drawer in `SessionExplorerToolbar`: root renders summary buttons, child views mutate shared state via existing `updateFilter` callbacks, reset button dispatches a single `onResetFilters` and optionally `setView('default')`, and apply closes the drawer.
5. Update badges, search syncing, and `sessionExplorerUtils` to ignore removed facets and continue computing derived models; ensure size/timestamp clearing semantics treat empty strings as “no filter.”
6. Write/refresh tests: unit tests for summary helpers and child view components, integration/component test mounting the drawer to ensure navigation + reset works, plus update e2e/Playwright specs covering filter application + reset; document the UX change and record a changelog entry.

Risks / unknowns
- Removing facet arrays affects `sessionExplorerUtils.buildFilterDimensions`, UI settings persistence, and URL parsing; any missed reference could break filtering silently.
- FamilyDrawer animation relies on `views` registry; misconfigured view keys or state resets might leave the drawer stuck between views.
- Timestamp inputs currently use `datetime-local`; ensuring UTC semantics while showing summaries may require additional formatting helpers.

Testing & validation
- Vitest or RTL component tests for the new drawer root/child views (navigation, summary text, reset propagation).
- Existing session explorer model tests updated to reflect the new filter state schema and ensure URL parse/stringify round trips.
- Playwright scenario: open drawer → adjust each child view → confirm session list updates → hit Reset → confirm state defaults.
- Manual QA on Chrome/Safari/Firefox to confirm focus management, keyboard navigation, and responsive layout.

Rollback / escape hatch
- Keep legacy `SessionFiltersPanel` implementation on a branch or feature flag until the new drawer ships; if regressions appear, revert to previous commit or toggle flag to restore the flat panel.

Owner / date
- Codex / 2025-12-14

Assumptions / open points
- Deprecated facet data (sources/branches/tags) can be dropped from both UI and filtering logic without impacting downstream analytics or APIs.
