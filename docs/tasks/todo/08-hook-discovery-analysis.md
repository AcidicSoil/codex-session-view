Context
- The chatbot analysis API/UI (src/server/chatbot-api.server.ts, src/components/chatbot/SessionAnalysisPopouts.tsx) only exposes summary + commit helpers, but the .todo/hookify/gemini/hookify-alignment-events docs outline a richer “hook discovery” workflow that surfaces conversation-alignment issues.
- Hookify’s conversation analyzer already defines the system prompt + UX expectations (conversation-analyzer.md, SessionAnalysisPopouts.tsx prototype) yet nothing in the runtime, API schema, or viewer UI wires that mode up.
- We need parity with the prototype so Codex Session Viewer users can request hook-alignment insights directly from the in-app AI Analysis surface without breaking existing flows or SSR constraints.

Success criteria
- POST /api/chatbot/analyze accepts analysisType="hook-discovery" (in addition to summary/commits) and returns structured markdown when requested.
- aiRuntime.generateSessionAnalysis selects the hook-discovery system prompt + provider model and logs failures the same way as current modes.
- Frontend runtime/request types understand the new analysis type and surface server errors clearly.
- ChatDock renders a single AI Analysis popout with tabs (Summary, Commits, Hook Discovery) that match the prototype content/UX and keep previous features working, including loading/error/empty states.

Deliverables
- Updated server modules: src/server/chatbot-api.server.ts, src/server/lib/aiRuntime.ts (new prompt constant, switch logic, logging) plus any helper docs/tests.
- Updated client runtime contract: src/features/chatbot/chatbot.runtime.ts (types + fetch helper).
- Refactored viewer UI: src/components/chatbot/ChatDockHeader.tsx + src/components/chatbot/SessionAnalysisPopouts.tsx (new dialog/tab layout, toast handling, markdown rendering, clipboard helpers).
- Optional regression/unit tests covering hook-discovery branching (server) and/or storybook/docs snippet if needed.

Approach
1) **Audit backend contracts** – Update analyzeInputSchema union, ensure loadSessionSnapshot/listMisalignments path still loader-friendly, and define consistent response payload shape for summary (markdown), commits (string[]), hook-discovery (markdown). Document payload expectations.
2) **Enhance aiRuntime** – Introduce the HOOK_DISCOVERY_SYSTEM_PROMPT from conversation-analyzer.md, extend AnalysisOptions union, and branch generateSessionAnalysis to use the specialized system prompt + temperature. Confirm ProviderUnavailableError + logging coverage.
3) **Adjust response mapping** – In analyzeChatFromPayload, route hook-discovery requests to the markdown-return branch, log metadata (analysisType, duration) and return { summaryMarkdown }. Ensure commit parsing unaffected.
4) **Refactor client runtime** – Extend ChatAnalyzeRequestBody and requestChatAnalysis generics to accept the third mode; update any callsites/types to avoid string literal drift.
5) **Rebuild SessionAnalysisPopouts UI** – Replace dual Sheet triggers with one Dialog-based “AI Analysis” button mirroring the prototype: tabs for Summary/Commits/Hook Discovery, a shared loading state with toasts, Markdown rendering for summary + hooks, clipboard-friendly code blocks for commits. Ensure SSR-safe hooks usage (state only, no window access until client) and keep styling consistent with design system.
6) **Integrate & polish** – Swap ChatDockHeader’s Summary/Commit buttons for the new popout, tune aria labels, and add telemetry/timing logs if needed. Verify bundler tree-shaking + route SSR unaffected.

Risks / unknowns
- Hook-discovery responses might be large; need to ensure streaming/size limits are acceptable and maxOutputTokens handle it.
- Combining tabs into a single Dialog changes layout; ensure it still fits narrow viewports and doesn’t regress keyboard focus traps.
- Need confirmation on error messaging/feature flags (should hook discovery be gated per-env or model availability?).

Testing & validation
- Manual: call POST /api/chatbot/analyze with each analysisType via curl or Thunder Client and confirm payloads.
- Automated/Regression: run relevant unit/integration suites (e.g., `pnpm test -- chat*` if available) or add targeted tests for generateSessionAnalysis.
- UI smoke test: load viewer, toggle dialog, trigger each tab (including re-run) while monitoring browser console/logs.

Rollback / escape hatch
- Feature lives behind UI-only code paths; revert the commit or temporarily hide the AI Analysis button if server issues arise. Server logic keeps backward compatibility, so rolling back UI still leaves summary/commit endpoints intact.

Owner/Date
- Codex (assistant) / 2025-12-01
