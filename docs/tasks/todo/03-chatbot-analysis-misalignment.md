Context
- Task 10 requires summary + commit generation features on top of the existing AI abstraction in `src/lib/ai/client.ts` and the viewer ChatDock UI.
- Task 9 introduces misalignment detection surfaces (DB collection, banner, timeline markers, remediation flow) backed by the same chat sessions.
- Both verticals must integrate cleanly with TanStack Start conventions (loaders/server functions, DB collections, URL state) and preserve current UX affordances.

Success criteria
- `/api/chatbot/analyze` handles `analysisType: "summary" | "commits"` without streaming, returning contracts that match the PRD (summary markdown always containing the four fixed sections with ≥1 bullet—`- None.` when empty—and commit subjects ≤72 chars) and emitting telemetry `{ mode, sessionId, analysisType, durationMs, status }`.
- Viewer pop-outs (`SummaryPopout`, `CommitPopout`) fetch via the new endpoint, show loading/empty/error states, and anchor to ChatDock without layout regressions; rendered content respects the backend contracts but can style freely.
- A `MisalignmentRecord` collection persists per-session issues with `{ eventRange: { startIndex, endIndex, startAt, endAt } }`; misalignment banner/timeline render correctly for open issues, collapsing overlaps based on highest severity and showing concise tooltips with severity + rule titles/IDs.
- Banner interactions prefill remediation prompts in ChatDock, apply optimistic status updates (`open|acknowledged|dismissed`), persist via server actions, and dismissed items stay hidden across reloads.
- Remediation prompts pass structured metadata (`{ misalignmentId, ruleId, severity, eventRange }`) alongside the visible prefill so the AI receives machine-readable context.
- All new UI (pop-outs + misalignment surfaces) toggle behind `FEATURE_SESSION_COACH_UI` without affecting legacy ChatDock when disabled.
- Every `/api/chatbot/*` call and misalignment status transition logs an unsampled event via `~/lib/logger` containing `{ mode, sessionId, analysisType?, misalignmentId?, oldStatus?, newStatus?, userId?, durationMs, success, at }`.
- Severity visuals reuse the existing shadcn semantic tokens: low → info secondary badge, medium → warning outline badge, high → destructive badge/banner CTA.
- Misalignment tooltips follow the fixed template `"{Severity} severity: {ID1} “{Title1}”, {ID2} “{Title2}”"` for deterministic UX/tests.
- Misalignment tooltips follow the fixed template `"{Severity} severity: {ID1} “{Title1}”, {ID2} “{Title2}”"` with rule titles truncated (~70 chars + ellipsis) for deterministic, bounded UI.
- Shared `truncateRuleTitle(title, max = 70)` helper keeps AGENTS rule titles consistent across timeline, banner tooltips, evidence drawers, and future surfaces.
- Shared `truncateRuleTitle(title, max = 70)` helper lives in `~/lib/agents-rules/format.ts` next to the parser/types and ships with unit tests (`format.test.ts`) covering <=70 no-op, truncate+ellipsis, and idempotence.

Deliverables
- Backend: server function + route handler for `/api/chatbot/analyze`, prompt helpers, telemetry integration, TanStack DB collection + mutation handlers/audit logging for misalignment records.
- Frontend: React components for pop-outs, banner, timeline markers (severity colors + truncated fixed tooltips), remediation flows (structured metadata on Session Coach requests + natural-language prefill), feature-flag wiring in viewer layouts, and optimistic status interactions.
- Shared guardrails utility for rule-title truncation exported for reuse across AGENTS components.
- Canonical AGENTS fixtures: sample `AGENTS.md` + session-with-misalignments fixture to drive parser, detector, tooltip, and truncation tests.
- Fixture layout: `tests/fixtures/agents/AGENTS.session-coach.md` + `.parsed.json` for rules, and `tests/fixtures/sessions/session.misalignment-basic.json` + `.misalignments.json` (and future `session.<scenario>.*`) for sessions/misalignments.
- Introduce fixtures alongside the tests that consume them so CI immediately exercises the contract; avoid landing unused fixtures early.
- Tests: unit coverage for helpers, integration/contract tests for API + DB writes, and UI/component tests (vitest/playwright) covering pop-outs, feature-flag states, severity color mapping, and misalignment UX.
- Documentation updates: README/docs sections describing the API contracts, feature flag usage, telemetry expectations, and misalignment workflow.

Approach
1) Extend `src/lib/ai/client.ts` with `generateSummary`/`generateCommitMessages` helpers that enforce the section caps and formatting constraints via schema validation + truncation.
2) Build `/api/chatbot/analyze` (server action + endpoint) to validate payloads, dispatch to helpers, and emit telemetry/audit logs via `~/lib/logger` alongside deterministic responses and error handling.
3) Introduce the env-driven `FEATURE_SESSION_COACH_UI` config; gate viewer surfaces accordingly so legacy ChatDock renders untouched when disabled.
4) Implement `SummaryPopout` and `CommitPopout` components, fetch via loader-friendly hooks (TanStack Query) with loading/empty/error states, and mount triggers in ChatDock when the flag is on.
5) Define the `MisalignmentRecord` collection + CRUD server functions (including status mutations + audit logging) and wire writes into the existing analysis pipeline.
6) Layer viewer UI: banner consuming live misalignment query, timeline annotations derived from `eventRange`, clickable remediation entries that prefill ChatDock prompts (visible copy + request-only `metadata` payload) and apply optimistic status updates; ensure severity→color mapping (info/secondary, warning/outline, destructive), truncated fixed tooltip format, and banner copy match spec.
7) Polish UX (accessibility, toasts), add thorough docs, and extend test suite (unit/integration/e2e) plus manual smoke tests across flag states.
8) Update ops dashboards/alerts (staging + prod) to include the new unsampled logger streams (`/api/chatbot/stream`, `/api/chatbot/analyze`, misalignment status changes, Session Coach usage`), secure sign-off from the current viewer loader + `~/lib/logger` owner (platform/infra), and inherit existing static latency/error thresholds.
9) Schedule at least two business days of lead time for staging → prod dashboard rollout and approval before enabling the Session Coach feature flag in prod; document this prerequisite in the rollout plan rather than a separate ticket.

Risks / unknowns
- Enforcing bullet/length caps may require truncation logic—need to ensure helper failures surface cleanly rather than silently dropping content.
- Timeline highlighting must efficiently merge overlapping `eventRange`s; may require memoized severity calculations for large sessions.
- Potential performance impact if misalignment queries grow large; may require pagination or throttling.
- Ensuring concurrency-safe status updates to avoid race conditions when multiple viewers dismiss issues simultaneously; optimistic updates must reconcile with server truth.
- Logging every API call/status change could add overhead; need to monitor volume until sampling is acceptable.

Testing & validation
- Unit tests for prompt helpers (section caps, formatting) and DB adapters (eventRange serialization, status transitions) via vitest.
- API contract tests hitting `/api/chatbot/analyze` with mock AI client + DB (vitest/supertest) covering telemetry emission via `~/lib/logger` + failure cases.
- Component tests for pop-outs/banners (Testing Library) plus feature-flag snapshots, severity color checks/tooltips, structured-metadata assertions, and Playwright e2e covering open/dismiss workflows + telemetry logs.
- Manual smoke test in viewer with flag on/off to verify SSR hydration, pop-outs, timeline markers, remediation prompt prefill, and keyboard chat sending.
- Observability validation: ensure staging + prod dashboards/alerts display the new metrics, logger payloads flow end-to-end, and fixed latency/error thresholds trigger correctly before enabling the feature flag.

Rollback / escape hatch
- Feature flag the new endpoint + UI surfaces; if issues arise, disable via config to fall back to existing chat-only experience while keeping DB migrated schema ready.

Owner/Date
- Codex / 2025-11-26

- gemini / 2025-11-26

```md
I have analyzed the project's tasks and codebase. I will now report the progress of the
  sub-tasks.
  Here is a summary of the progress on the remaining tasks:

  Task 9: Implement Misalignment UI and Remediation Flow
  Overall Status: `pending`

   * Subtask 9.1: Implement Data Fetching for Misalignment Data (`pending`)
       * No useMisalignments hook was found.
   * Subtask 9.2: Build the `MisalignmentBanner.tsx` Component (`pending` in tasks.json,
     but file exists)
       * The file src/components/chatbot/MisalignmentBanner.tsx has been created and
         contains a component. The task status in tasks.json appears to be outdated.
   * Subtask 9.3: Build the `MisalignmentTimelineBadges.tsx` Component (`pending`)
       * The component file was not found.
   * Subtask 9.4: Implement Interactive Remediation Flow (`pending`)
       * No implementation has been found for the interactive remediation flow.

  Task 10: Implement Pop-Out Summary and Commit Message Generators
  Overall Status: `in-progress`

   * Subtask 10.1: Implement Backend `generateSummary` Function (`pending`)
       * The file src/features/chatbot/summaries.ts was not found.
   * Subtask 10.2: Implement Backend `generateCommitMessages` Function (`pending`)
       * The file src/features/chatbot/commit-messages.ts was not found.
   * Subtask 10.3: Create `POST /api/chatbot/analyze` Endpoint (`done`)
       * The file src/routes/api/chatbot/analyze.ts exists and the endpoint is set up.
   * Subtask 10.4: Build Frontend SummaryPopout and CommitPopout Components (`pending`)
       * The SummaryPopout.tsx and CommitPopout.tsx component files were not found.

  All other tasks (1 through 8) are marked as done.

```
