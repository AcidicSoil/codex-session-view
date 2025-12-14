Context

* Product flagged that the “Eject session” button inside the Upload Timeline must surface within Session Explorer surfaces so analysts can quickly clear a loaded session without diving into the upload panel.
* Session Explorer currently only receives `uploadDrawerContent` and chat callbacks, so there is no prop conduit for ejecting/clearing the active session or exposing eject status across discovery vs. upload views.
* Need to realign Session Explorer props/state so eject behavior is centralized, testable, and consistent with AGENTS rules (route-driven data, no effect-based fetching, no god modules).

Success criteria

* Session Explorer renders an eject affordance (button within the toolbar or session header) whenever a session is loaded, invoking the existing `controller.ejectSession` flow.
* Upload Timeline section, Session Explorer, and any other consumer share a single source of truth for eject state (pending/disabled).
* Tests cover the new prop contracts and confirm the button calls eject + resets state without regressions to scrolling or filters.

Deliverables

* Updated TypeScript components/props for Session Explorer (DiscoverySection, SessionList, toolbar) exposing eject status + handler.
* UI addition for the eject button aligned with Cult UI guidelines (Placement within toolbar or badge row, responsive behavior).
* Tests (unit/component) for eject button visibility and behavior, plus doc entry or changelog snippet describing the new prop contract.

Approach

1. Audit current eject logic in `useUploadController` / UploadTimelineSection to identify what state (isEjecting, hasEvents) must be lifted to ViewerExplorerView.
2. Extend the discovery context (`useViewerWorkspace`, `DiscoverySection`, `SessionList`, `SessionExplorerToolbar`) with `onSessionEject` + `isSessionEjecting` props. Keep transport/application boundaries intact.
3. Implement the toolbar/button UI using existing button styles, ensuring it only renders when a session is selected. Wire click to the eject handler and reflect pending state.
4. Update tests (SessionList, DiscoveryPanel, UploadTimelineSection if needed) to cover the new props and interactions. Refresh any mocks (router, controller) to include eject hooks.
5. Document prop changes in docs/changelog and rerun `pnpm test`.

Risks / unknowns

* Session Explorer currently doesn’t know about upload controller state; need to ensure the eject handler is safe to call when the controller isn’t mounted (e.g., viewer snapshot w/out upload section).
* Potential race conditions if eject is clicked while a new session is loading; need to define disabled states.
* UI placement could conflict with existing toolbar layout; may need design input for responsive behavior.

Testing & validation

* Unit/component tests: `tests/SessionList.test.tsx`, `tests/DiscoveryPanel.test.tsx`, Upload controller tests for eject path.
* Manual smoke in the Session Explorer view: load session, trigger eject, confirm session list re-enables scrolling and timeline clears.

Rollback / escape hatch

* Feature-gate the new eject button behind a prop; if regressions occur, revert to previous prop interface while keeping controller API intact.

Owner/Date

* Codex / 2025-12-14
