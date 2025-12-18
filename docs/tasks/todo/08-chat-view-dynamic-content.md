Context

* Session Coach’s Chat view currently shows stubbed text (“Chat dock placeholder response”, static summary prompts) whenever the user switches to a different session/repo selection, indicating the UI is not bound to the newly selected session’s persisted chat history.
* The TanStack Start route loader (`viewer.loader.ts`) already returns per-session `sessionCoach` data, but the workspace state and chat dock controller are not rehydrating when `sessionId` changes, so the chat dock keeps whichever state it booted with.
* Route rules forbid useEffect data fetching; we must drive chat/misalignment data from search params + loader hydration and ensure repo bindings trigger the same path so the chat panel and summaries always reflect the active session.

Success criteria

* Selecting a different session or repo updates the Chat view to show that session’s actual messages, context sections, and misalignment summaries within one navigation (no placeholders).
* The chat dock threads list and summary pills stay in sync with the active session; no cross-session bleed or stale links when toggling back and forth.
* Loader-driven data (sessionCoach, repo binding, rule sheet) rehydrates without client-only fetch hacks; any background refreshes reuse server functions but stay keyed by the current sessionId.
* QA can verify via UI automation or manual clicks that switching sessions twice yields two distinct transcripts matching fixture data.

Deliverables

* Refined viewer workspace/session selection state management tying `sessionId` search params to loader hydration and chat controller initialization.
* Updated ChatDock panel/controller logic that resets and rehydrates messages/threads when `sessionId` changes, eliminating the hard-coded copy.
* Tests (unit or integration) covering session switching + chat state hydration, plus documentation in `docs/viewer-architecture.md` (or similar) explaining the data flow.

Approach

1. Map the current session selection + chat flow: trace how `useViewerWorkspace`, `viewer.workspace.utils`, and `ChatDockPanel` derive `activeSessionId`, and confirm how/if the router search params update when a session asset is chosen; document any gaps.
2. Update the workspace/router integration so that picking a new session pushes the `sessionId` into `Route.useSearch`/`navigate`, forcing the loader to re-run and return the correct `sessionCoach`, rule sheet, and repo binding snapshot for that session.
3. Refactor viewer workspace state (`sessionCoachState`, `activeSessionId`, repo context) so it keys cached data by sessionId and swaps to the loader-provided snapshot automatically on navigation; only fall back to `fetchChatbotState` when the loader lacks data (e.g., first load, retries).
4. Enhance `ChatDockPanel`/`useChatDockController` to watch the `sessionId` prop: when it changes, dispose of any ongoing stream, reset drafts/threads, and bootstrap with the new loader state so UI copy, summaries, and history all reflect the new session; remove/guard any placeholder text that leaks through.
5. Add automated coverage (e.g., a Vitest spec for `useChatDockController` or viewer workspace reducers) that simulates consecutive session selections and asserts that chat state resets to the new snapshot; run `pnpm test` and update relevant docs to outline the lifecycle + failure handling.

Risks / unknowns

* Loader navigation might be slower than the current optimistic selection, so we may need a lightweight pending indicator to avoid confusing blanks during the refresh.
* Session assets without prior chat history must still show meaningful empty states; confirm backend guarantees (e.g., whether `listChatMessages` can return [] but still include context sections).
* Repo binding or hook-gate side effects triggered by chat refreshes could regress if we don’t carefully coordinate invalidations (`router.invalidate`, `queryClient.invalidateQueries`).

Testing & validation

* Unit/logic tests for viewer workspace session switching + chat controller resets, plus existing suites via `pnpm test`.
* Manual verification (or future Playwright coverage) that cycling through at least two fixture sessions updates chat history, repo binding labels, and misalignment banners without cross-contamination.

Rollback / escape hatch

* Revert the workspace/chat dock changes (single revert commit) to fall back to the current static copy if the loader-driven refresh introduces regressions.

Owner/Date

* Codex (GPT-5) / 2025-12-18
