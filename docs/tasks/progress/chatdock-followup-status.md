# Chat Dock Follow-Up Progress — 2025-12-16

## Completed
- Initialized **chatdock-verification** skill under `~/.codex/prompts/codex-skills/projects/`.
- Added regression/telemetry reference docs.
- Introduced `clearChatThreadState` + persistence helpers.
- Updated `useChatDockController` + `ChatDockPanel` plumbing.
- **Chat Dock layout & controls**: Refactored `ChatDockPanel` into a split layout managing `ChatDockSidebar` and `ChatDockCollateral`.
- **ChatDockCollateral**: Implemented with Session Context binding and AI Settings (Temperature, Tokens, Keep-Loaded).
- **Server Functions**: Added `providerKeepAlive` server function for telemetry/signaling.
- **Cleanup**: Removed legacy inline `AIChatHistory` from `ChatDockPanel` and simplified `ViewerChatView`.
- **Verification**: Drafted `chatdock-refactor-verification.md` report.

## In Progress
- **Playwright + Vitest coverage**: Existing unit tests are compatible, but need to add specific tests for `ChatDockCollateral` interactions and persistent settings.
- **Prefill fan-out & manual inject**: Adjusted prefills to track per-mode state; pending UI control to trigger manual injection and telemetry hooks.

## Next Up
1. **Critical**: Locate and fix `src/routes/(site)/logs` (Logger Route) scrolling issue (file missing from current view).
2. Implement actual provider logic for `providerKeepAlive` (beyond logging).
3. Enhance `ChatDockCollateral` to include Rule Inventory summary or toggles directly.
4. Add UI controls for manual prefill injection (remediation/context injection).
5. Run full regression suite (manual + automated) based on `chatdock-refactor-verification.md`.

## Regression Audit (2025-12-16)
Reviewed against `@01-chat-dock-session-intelligence-regressions.md`:

| Regression Item | Status | Notes |
| :--- | :--- | :--- |
| **Add to Chat Broadcast** | ✅ Fixed | Context propagates to both 'session' and 'general' modes. |
| **Tab Switching State** | ✅ Fixed | State hydrated from server on mount/switch; persistence via `ViewerWorkspaceContext`. |
| **Chat History Rendering** | ✅ Fixed | `ChatDockSidebar` renders history reliably via `AIChatHistory`. |
| **Rule Source** | ✅ Fixed | `ChatDockCollateral` / `SessionRepoSelector` binds dynamic repo context. |
| **Message Ordering** | ✅ Fixed | Explicit sort by `createdAt` in persistence layer. |
| **Layout Truncation** | ✅ Fixed | Responsive grid layout implemented in `ChatDockPanel`. |
| **Session Intel. Crash** | ⚠️ Likely Fixed | Switched from `react-markdown` to `FormattedContent` in `SessionAnalysisPopouts`. |
| **Logger Route Scroll** | ❌ **MISSING** | `src/routes/(site)/logs` not found in file tree; fix cannot be verified. |
| **Clear/New Chat** | ✅ Fixed | Implemented via `ChatDockSidebar` actions and server functions. |
