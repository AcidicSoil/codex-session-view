Context
- The viewer timeline (`TimelineWithFilters` + `TimelineFilters` in `src/components/viewer`) only supports type/role/search filters, so analysts still scroll through thousands of events; the exported conversation `_Filter Events By Index Range .md` requests a start/end index window so the frontend can “zoom” into segments and ask the backend for the same window.
- Server functions such as `fetchChatbotState`/`/api/chatbot/*` currently call `loadSessionSnapshot` with no range arguments, meaning every request streams the full `snapshot.events` array alongside misalignment metadata even when the UI only needs a slice.
- Timeline state persists via `useUiSettingsStore` rather than typed route search params, so there is no canonical way to share “show events #800-#850” across reloads or rehydrate loaders, and misalignment evidence (which already carries `SessionEventRange`) cannot drive the filters.
- Tool events (FunctionCall, LocalShellCall, etc.) lack finer filtering by command family (`sed`, `rg`, `git`, `apply_patch`, …), making it hard to isolate filesystem edits/log scraping runs that often precede bugs; the UI also hides which files/commands each event touches unless the card is fully expanded.

Success criteria / acceptance
- Every server entry point that returns session events (e.g., `fetchChatbotState`, `hookifyAddToChat`, future `/api/events`) accepts optional `startIndex`/`endIndex` integers, enforces bounds/defaults, and responds with only that slice plus `totalEventCount` metadata.
- Viewer route search params expose the same range, hydrate `uiSettingsStore.timelinePreferences`, and keep timeline numbering + misalignment badges accurate when the window changes.
- Timeline header surfaces an accessible range control (dual input or slider) that updates instantly, persists via UI settings, and visually communicates the active bounds alongside the filtered count.
- Tool-focused filters allow analysts to narrow the timeline to command families (e.g., show only `git` or `sed` shell calls, specific tool names) without breaking existing quick filters.
- Timeline event cards render badges for referenced file paths and/or command keywords so users can scan shell/file change events without expanding each card.
- Vitest coverage validates the slicing helper, tool filter parser, badge extraction, and Zod schemas; Playwright verifies the UI flows (range filtering, command filters, badges) and `pnpm lint`/`pnpm test` pass.

Deliverables
- Event range domain helper (e.g., `~/lib/session-events/range.ts`) that normalizes indexes, clamps bounds, and exposes `sliceEventsByRange` + `describeRange` utilities used by server and client.
- Server changes (`src/server/lib/chatbotData.ts`, `src/server/function/chatbotState.ts`, `src/server/chatbot-api.server.ts`, any new `/api/events` route) with updated zod schemas, validation errors, and telemetry for range queries.
- Viewer updates: typed search params in `src/routes/(site)/viewer/index.tsx`, extended `TimelinePreferencesState`/`useUiSettingsStore`, new range UI component living beside `TimelineFilters`, and integration inside `TimelineWithFilters` before other filters/searches.
- Additional timeline filter config + UI (e.g., `ToolCommandFilter`) supporting canned command families plus a free-form command input box, surfaced via the Filters control and stored in UI settings/search params.
- Visual badge componentry integrated into timeline event cards (shell/tool/file change) that displays primary file path(s) and parsed command tokens.
- Documentation snippet (e.g., `docs/agents/viewer-architecture.md` or a new `docs/tasks/log`) summarizing API params, UX behavior, command filter semantics, and how misalignment `eventRange` metadata can auto-populate the slider.

Approach
1) **Baseline + invariants** – Inspect `ResponseItem.index` usage, `SessionEventRange` definitions, fixture snapshots (`tests/fixtures/session-large.json`), and tool event payloads to confirm indexes and command metadata are consistent; add defensive helpers that fall back to array positions and parse command/file info safely.
2) **Shared slicing helper** – Implement `sliceSessionEvents(events, { startIndex, endIndex })` plus metadata (total count, derived timestamps) in a new module under `src/lib/session-events/`, with unit tests covering edge cases and misordered indices.
3) **Backend API support** – Update `loadSessionSnapshot` + consumer server functions to accept optional range params (from loader search or query string), reuse the helper to slice before serializing, emit `totalEventCount` + `rangeApplied` flags, and add input validation + logging for out-of-bounds requests.
4) **Command taxonomy + filters** – Define a shared command classification table (e.g., regex per `git`, `sed`, `rg`, `apply_patch`, etc.) in a new module (`~/lib/session-events/toolMetadata.ts`), expose both parsing utilities and filter options, and wire them into `TimelineFilters` + UI settings.
5) **Viewer route + loader wiring** – Extend the viewer route definition to validate `startIndex`/`endIndex` search params, pass them (and tool filter state) into `viewerLoader` so server-driven data matches the requested window, and hydrate `uiSettingsStore` with defaults from loader data.
6) **Timeline state + UI** – Add `eventRange` + `toolCommandFilters` to `TimelinePreferencesState`, expose setter utilities, and build dedicated components: `TimelineRangeFilter` (dual inputs/slider) and `ToolCommandFilter` (checkboxes/tag inputs). Ensure changes update route search params (via `router.navigate({ search })`) per AGENTS instructions.
7) **Event rendering enhancements** – Update `AnimatedTimelineList` (or subcomponents) to show badges for file paths/command keywords, reuse parsed metadata, and ensure numbering/flagged markers account for the range offset (`displayNumber = rangeStart + relativeIndex`). Allow misalignment badges/clicks to auto-set the range and command filters when applicable.
8) **Filtering + interactions** – Apply slicing before other filters/search logic, then layer command filters and existing quick filters in a predictable order; ensure tool badges stay in sync when filters hide events.
9) **Testing + docs** – Add Vitest specs for the helper, taxonomy parser, UI store serialization, and filter combinator; extend Playwright to cover setting a range, toggling command filters, reloading via URL, and verifying badges; document the workflow, and finish with `pnpm lint && pnpm test`.

Risks / unknowns
- Uploaded sessions parsed purely on the client still load full data; slicing only trims rendering, so extremely large files may still impact memory.
- Some events may lack the `index` field; helper must tolerate gaps to keep numbering/misalignment references aligned.
- Tight coupling between route search params and UI settings could introduce hydration churn if defaults diverge; need clear precedence rules.
- Chatbot prompts or detectors that expect the full context might need explicit opt-outs when a narrow range is requested.

Testing & validation
- New Vitest suite for `sliceSessionEvents`, `clampRange`, and store serialization; extend existing `tests/timelineFilters.test.ts` (or add a sibling) to confirm range filtering works with other filters.
- API tests (unit/integration) hitting `fetchChatbotState`/`chatbot-api` with range params to ensure the slice + metadata contract.
- Playwright scenario that sets a range via the UI, navigates through search params, reloads, and asserts the timeline + URL stay in sync.
- Full `pnpm lint` + `pnpm test` run before landing.

Rollback / escape hatch
- Keep range-handling behind a feature flag/search-param guard so disabling it reverts to full-event fetching without code removal; maintain the old loader path for a release cycle.
- Preserve helpers so reverting only requires ignoring `startIndex`/`endIndex` inputs while keeping legacy UI (type filters) untouched.

Owner / date
- Codex / 2025-12-11

Assumptions / open points
- Assume `ResponseItem.index` is either present or can be derived deterministically from array order; if upstream data omits timestamps, we fall back to sequential numbering when building ranges.
