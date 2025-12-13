Context
- Session Inspector currently lets users ingest/export sessions only via the file loader + `Eject session` (see `src/features/viewer/viewer.upload.section.tsx`), so there is no way to save filtered or scoped views for later analysis.
- Timeline filtering, search, command filters, and range selection already live in `TimelineWithFilters` + `useUiSettingsStore` (`src/components/viewer/TimelineWithFilters.tsx`, `src/stores/uiSettingsStore.ts`), which we can reuse to drive export scopes like “current filter view” or “selected range”.
- Product wants a long-term extensible export surface that supports entire sessions, filtered subsets, or individual events with multiple output formats (JSON/Markdown/CSV/TXT) and opt-in timestamp/metadata toggles, matching the spec in `_Product Manager_Granular Session & Data Export.md`.
- Session data is parsed client-side via `useFileLoader`/`sessionSnapshots`, so export generation should run locally but produce structured files (JSON schema versioning, CSV columns, Markdown layout) that future import/replay features can consume.

Success criteria / acceptance
- Export entry point sits beside the existing timeline controls and opens a modal/dropdown where users choose scope (entire session, current filter view, selected range, single event) and format; the dialog displays event counts for the chosen scope before download.
- Format options adhere to the spec: Markdown/TXT default to timestamps+metadata off, JSON/CSV default timestamps on/metadata off; toggles update the sample filename/CTA label (e.g. “Download .md”).
- CSV exports include the prescribed columns/order with proper escaping; Markdown exports follow the transcript template with role emojis/headings; JSON exports include `metadata.schemaVersion`, `metadata.isPartial`, `session.events`, and optional hidden metadata only when requested.
- Scope resolution reuses the same filtering/range logic that powers the visible timeline (no divergence between “current filter view” and exported rows) and supports 1k+ events without freezing the UI.
- Feature is documented (docs + QA checklist) and covered by unit tests for each formatter plus a basic integration test ensuring the modal enables downloads in the main viewer flow.

Deliverables
- `src/features/viewer/export/` module housing scope derivation helpers, format builders (JSON/Markdown/CSV/TXT), and schema typing + tests.
- Export controller hook/state (e.g. `useSessionExportController`) connected to `useViewerWorkspace` loader data + `useUiSettingsStore` to compute counts, defaults, and selected event/range metadata.
- Export modal/dropdown UI component with buttons, scope radios, format + option toggles, dynamic CTA text, integrated into `UploadTimelineSection` header next to `Eject session`.
- Automated tests covering formatter correctness and UI smoke/path tests (Vitest for pure functions, Playwright or component tests for modal logic) plus updated docs/QA notes describing formats and defaults.

Approach
1) **Map current state & data contracts:** Inventory what `useFileLoader`, `uploadController.meta`, `useUiSettingsStore.timelinePreferences`, and `TimelineWithFilters` expose; extract reusable helpers (range slicing, command filter matching, search) into a small utility so exports and the timeline share the same logic.
2) **Design export domain module:** Create typed `SessionExportRequest`/`SessionExportPayload` interfaces plus scope reducers (`entire`, `filtered`, `range`, `event`) that return arrays of `ResponseItemParsed` along with filter metadata; include helpers to compute `filterLabel`, counts, and `metadata.isPartial`.
3) **Implement format builders:** Add pure functions for JSON schema (with version constant, `source`, `filterApplied`, `isPartial`), Markdown transcript rendering (roles headings, tool blockquotes, timestamp toggles), CSV with strong escaping/column ordering, and TXT (plain text). Include options for timestamps/hidden metadata and ensure defaults are format-aware.
4) **Add export state/controller:** Build `useSessionExportController` (inside `src/features/viewer/export`) that tracks modal open state, selected scope, selected format, target event/range indices (hook into `AnimatedTimelineList` `onSelect` + `focusEventIndex`), and resolves the actual event set from loader data; expose `startDownload()` that builds a Blob + triggers download with deterministic filenames.
5) **Wire up UI:** Insert an `Export` button (likely `DropdownMenu` + `Dialog`) inside `UploadTimelineSection` header, referencing the controller for counts/defaults; implement the modal layout per ASCII mock (scope radios, format checkboxes, option toggles, CTA label updates) and keep styling consistent with existing viewer controls.
6) **Testing & docs:** Add Vitest suites for scope reducers + formatters (fixtures covering timestamps/metadata toggles and CSV escaping), extend Playwright/e2e to click Export → download stub (mock `URL.createObjectURL`), and update docs (`docs/` and CHANGELOG) with instructions + QA checklist for verifying each format.

Risks / unknowns
- Exporting thousands of events could create large strings/blobs and block the main thread; may need background `setTimeout` yielding or streaming approach if profiling shows hangs.
- Capturing a “single event” scope relies on timeline selection state, which doesn’t currently persist; we must ensure `AnimatedTimelineList` exposes the last clicked event without breaking existing UX.
- Hidden metadata structure varies across events; need a clear rule for what qualifies as “hidden metadata” to avoid leaking sensitive data or omitting necessary context.
- CSV injection/Excel security concerns require sanitizing leading `=`, `+`, `@`, etc., which isn’t currently handled elsewhere.

Testing & validation
- Vitest snapshots for Markdown/JSON/TXT builders and strict expectation tests for CSV escaping + column order.
- Unit tests for scope derivation (entire/filter/range/event) ensuring they mirror `TimelineWithFilters` results for given store states.
- Playwright/component test covering modal open, default toggles per format, and confirming that clicking download triggers a Blob with the right filename extension.
- Manual QA script documenting how to validate each format, toggle combination, and large-session performance before release.

Rollback / escape hatch
- Keep the export UI behind a feature flag/config in the viewer workspace context so we can hide the entry point and revert to the existing `Eject session`-only flow without touching parsing logic if needed.

Owner / date
- Product Engineering / 2025-12-13

Assumptions / open points
- All source events are already loaded client-side via `useFileLoader`; no additional server fetch is required for exports.
- File downloads can rely on in-browser Blob APIs; we do not need backend signed URLs for the first iteration.
