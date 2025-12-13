Context

* Inspector view locks the timeline column to ~60% width using a fixed `lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]`, leaving the primary content cramped even on wide screens.
* Upload dropzone + controls currently live in the Inspector sidebar although uploading is an Explorer concern; this mismatch forces users to leave Explorer when they simply need to add a session.
* Explorer already owns discovery/search/filter flows and has hooks (`onFiltersRender`, router search params) for inserting an "Upload & Stream" CTA plus automatically spotlighting newly persisted sessions.

Success criteria / acceptance

* Timeline occupies ≥75% viewport width at ≥1280 px and secondary cards stack or sit in a max-width rail without constraining the timeline.
* Upload controls no longer render on Inspector and instead appear directly beneath the Explorer "Session explorer" header/search row, matching the ASCII IA.
* Persisting new sessions from Explorer automatically adds them to the list, focuses the Sources filter on `upload`, and scrolls/retains the new selection without manual filter tweaks.
* Product note / ASCII layout doc is updated so downstream teams share the same IA baseline.

Deliverables

* Refactored `ViewerInspectorView` layout + any supporting component/style changes.
* Explorer upload panel component wrapping `UploadControlsCard`, plus `ViewerExplorerView`/`SessionList` adjustments to host it and control filter placement.
* Router/search integration that toggles the Session Explorer Sources filter to `upload` after persistence, including logging + store updates.
* Updated `_Product Manager_Inspector Tab Layout_Relocate_Upload_StreamComponent.md` (or new doc) with ASCII preview + success behaviors.

Approach

1. Audit and refactor `ViewerInspectorView` to collapse the fixed grid: make the timeline section full-width, move secondary cards into a responsive aside (stacked on md, sticky rail on xl), and ensure `UploadTimelineSection` stretches.
2. Build `ExplorerUploadPanel` (or similar) that reuses `UploadControlsCard` with Explorer-specific framing; mount it between the metrics header and `DiscoverySection` inside `ViewerExplorerView` and thread padding/spacers per ASCII mock.
3. Update `SessionList`/`DiscoverySection` so filters render via `onFiltersRender` when provided, letting Explorer place filters right below the new upload panel while keeping inline fallback for other contexts.
4. Enhance `useUploadController.persistUploads` (or adjacent hook) to, after successful persistence, navigate the router search so `sourceFilters=['upload']`, keep other filters intact, and re-select the new asset; add telemetry via `logInfo('viewer.filters', …)` and ensure `useSessionExplorerModel` picks up the change.
5. Revise `_Product Manager_Inspector Tab Layout_Relocate_Upload_StreamComponent.md` with the new ASCII layout + notes; call out success scenarios (auto-scroll, filter focus) for stakeholders.

Risks / unknowns

* Sharing `uploadController` between views must remain stable; Inspector timeline still needs it for live parsing, so confirm context wiring isn’t broken when Explorer owns the UI controls.
* URL/search rewriting for `sourceFilters` must not wipe other active filters or user-entered search text; need cautious merge logic.
* Wide timeline layout must coexist with HookGate/Misalignment banners without causing overflow on small laptops; may require breakpoints or accordions.

Testing & validation

* Manual Explorer flow: upload single + multi-file batches, verify toasts, filter auto-switch, selection, and ability to open the new session immediately.
* Manual Inspector flow: resize between 1024–1920 px to confirm timeline expansion, sticky header behavior, and banner stacking.
* Automated checks: `pnpm lint`, `pnpm test`; add/update Playwright smoke that asserts dropzone presence on Explorer and absence on Inspector if coverage lacking.

Rollback / escape hatch

* Revertible via git by restoring the previous `ViewerInspectorView` grid + removing Explorer upload panel; keep changes isolated per module for quick rollback.
* Wrap filter auto-focus in a helper that can early-return (feature flag or env check) if issues arise without touching UI layout.

Owner / date

* Codex / 2025-12-13
