## Context

* Session Coach view still has usability regressions called out in 01_todo-fixes_v2.md: the Chat Dock container and AI Analysis areas do not scroll independently, repo metadata falls back to placeholders, and Hook Discovery/Summary output feels stubbed.
* In the current codebase `ChatDockPanel` renders `ChatDockSidebar` inline; PM feedback requests moving the chat history into the reusable `src/components/ui/motion-drawer.tsx` overlay so history remains accessible without shrinking the main chat pane.
* `SessionAnalysisPopouts` already shells the AI Analysis dialog but needs confirmation that scroll bounds, dynamic content, and hook discovery rendering respect the active session context from `useChatDockController`.
* The repo follows strict layering rules (route loaders for data, no god modules, TanStack Start patterns), so fixes must preserve the split between chat layout, data flow, and infrastructure while adding the drawer behavior and scroll affordances.

## Success criteria / acceptance

* Chat Dock conversation area scrolls vertically without affecting other panes; Hook Discovery and AI Analysis content each have their own scroll containers.
* Chat history lives inside a MotionDrawer that can slide in/out (desktop + mobile) without losing the existing history functionality; drawer controls are accessible and keyboard friendly.
* Repo metadata, AI Analysis Summary, and Hook Discovery outputs derive from the active session context/API responses (no `example/repo` or canned markdown) and visibly change when the session changes.
* Layout spacing for the Session Coach card matches the existing grid rhythm (no overlapping panes, no hidden controls) after the drawer integration.
* Automated tests (unit + ChatDockPanel component tests) cover the drawer toggle, scroll behavior, and that non-placeholder content renders when state provides it.

## Deliverables

* Updated `ChatDockPanel`, `ChatDockSidebar`, and supporting layout styles integrating `MotionDrawer` plus responsive fallbacks.
* Scroll-bound containers for Chat Dock messages, AI Analysis tabs (Summary/Commits/Hooks), and Hook Discovery results.
* Logic tying repo label + AI Analysis content to real session data (e.g., `activeState.repoContext`, `requestChatAnalysis` responses) with safeguards against placeholder fallbacks.
* Accessibility + keyboard controls for the drawer toggle and overlay, including focus trapping where appropriate.
* Vitest updates (e.g., `tests/ChatDockPanel.test.tsx`) verifying drawer toggles, scroll container classes, and non-placeholder content, plus any story/docs updates describing the new UX.

## Approach

1. **Audit current state:** Review `ChatDockPanel`, `ChatDockSidebar`, `SessionAnalysisPopouts`, and related store/hooks to document how repo labels, history, and AI Analysis are currently rendered; capture any existing scroll containers or placeholder text so the delta is explicit.
2. **Define responsive drawer behavior:** Decide breakpoints for when the MotionDrawer appears (e.g., always overlay on <lg screens, optionally docked/open on large screens). Extend `MotionDrawer` props if necessary (ARIA labels, initial open state) to support the chat-history use case.
3. **Integrate MotionDrawer:** Wrap `ChatDockSidebar` (and by extension `AIChatHistory`) inside the drawer component; expose toggle controls within `ChatDockPanel` (e.g., "History" button near the header) and ensure drawer state lifts to the panel so tests can manipulate it. Maintain the existing sidebar view for wide layouts by keeping a docked version rendered or by seeding the drawer as open above lg.
4. **Scroll containment fixes:** Apply `min-h-0` + `overflow-y-auto` to the Chat Dock message stack, Hook Discovery panel, AI Analysis summary scroll area, and Hook Discovery list to ensure independent scrolling per acceptance criteria. Reuse shared primitives (`ScrollArea`) where possible.
5. **Bind dynamic context:** Ensure repo metadata reads from `activeState.repoContext` (or other loader-provided data) and never defaults to placeholder strings. For AI Analysis and Hook Discovery, confirm `requestChatAnalysis` is called with the active session + mode and that responses render markdown/snippets with session-specific content; add guards to show an error/empty state if the API returns static copy.
6. **Refine spacing + accessibility:** Adjust padding/margins inside the Session Coach section to align with the rest of the Viewer layout, and add drawer focus trapping, ESC-close, aria labels, and keyboard shortcuts per accessibility best practices.
7. **Testing + documentation:** Update `tests/ChatDockPanel.test.tsx` (and any related component tests) to simulate drawer toggling, ensure scroll containers exist, and verify repo labels reflect supplied context. Run `pnpm test` to confirm regressions are caught, and add a short entry to the docs/change log summarizing the new MotionDrawer behavior.

## Risks / unknowns

* Exact spacing expectations in the PM report were not quantified; visual polish may require iterative review once the drawer lands.
* Integrating a modal-style drawer into SSR routes could surface hydration flash issues if the drawer state differs between server and client; we need to default to closed client-side-only interactivity.
* If `requestChatAnalysis` or session context APIs still return placeholder data in some environments, verifying dynamic output may depend on backend readiness.

## Testing & validation

* Unit/component tests: extend `tests/ChatDockPanel.test.tsx` to cover drawer toggling, history selection inside the drawer, and repo label rendering; add targeted tests for `SessionAnalysisPopouts` scroll containers if feasible.
* Manual QA: load long chats and long AI Analysis results to confirm independent scrolling; exercise drawer open/close with mouse, keyboard, and touch inputs across breakpoints.
* Regression suite: run `pnpm test` (Vitest) plus any existing Playwright flows touching Session Coach/Session Intelligence.

## Rollback / escape hatch

* Behind a feature flag or prop (e.g., `enableHistoryDrawer`) keep the previous inline sidebar layout available so we can revert quickly if usability or performance issues surface.
* Keep MotionDrawer integration isolated to Chat Dock components; reverting is as simple as re-rendering `ChatDockSidebar` inline and disabling the toggle while leaving other fixes intact.

## Owner / date

* Codex Assistant / 2025-12-16
