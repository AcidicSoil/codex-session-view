Context
- `src/features/viewer/viewer.loader.ts` currently just proxies `runSessionDiscovery()` from `src/server/function/sessionDiscovery.ts`, so the viewer route has no notion of chat modes, persisted `ChatMessage`s, misalignment metadata, or dismissal/acknowledgement state required by the PRD’s Session Coach pipeline.
- `src/features/viewer/viewer.page.tsx` renders the placeholder `ChatDock` from `src/components/viewer/ChatDock.tsx`, which only keeps local state/effects and can’t talk to TanStack Start loaders/server functions, so there is no path to hydrate real chat history or misalignment actions.
- Server-side we only have discovery helpers; there is no `/api/chatbot/*` endpoint, no TanStack DB collection mirroring the `todosStore`/`sessionUploads` pattern, and no persistence of `{ sessionId, mode }` messages, so we must introduce chat APIs, persistence, and misalignment mutation handlers without violating AGENTS rules (no client fetches in effects, no SSR bypasses).

Success criteria
- Viewer loader returns `{ sessionId, normalized session snapshot, misalignment summary, persisted ChatMessages keyed by mode, misalignment status map }` and hydrates `ViewerPage` without client-side fetch fallbacks or hydration warnings.
- Session-mode chat posts to `POST /api/chatbot/stream`, streams assistant tokens, and persists turns through a `chat-messages` TanStack DB collection; `mode: 'general'` requests respond `{ code: 'MODE_NOT_ENABLED' }`.
- Summary/commit pop-outs call the non-streaming `POST /api/chatbot/analyze`, expose loading/error/success states, and render final markdown once the request completes.
- Misalignment UI allows acknowledgement/dismissal toggles (status transitions) sourced from loader data and saved back to the session store with no timeline/discovery regressions.
- Vitest + Playwright suites cover AI context builders, AGENTS parser, detector heuristics, API handlers, persisted message store, misalignment status mutations, and viewer happy paths.

Deliverables
- Code: new modules under `src/lib/ai/*`, `src/lib/agents-rules/*`, `src/lib/sessions/*`, `src/features/chatbot/*`, API handlers in `src/server/chatbot-api.server.ts`, loader updates in `src/features/viewer/viewer.loader.ts`, UI wiring in `src/features/viewer/viewer.page.tsx`, replacement chat UI under `src/components/chatbot/*`, and persistence helpers `src/server/persistence/chatMessages.ts` plus `src/server/persistence/misalignments.ts` sharing the existing TanStack DB instance via `createCollection(localOnlyCollectionOptions` for `ChatMessageRecord` and `MisalignmentRecord`.
- Fixtures: canonical large/violations-heavy session JSON + sample `AGENTS.md` added to `tests/fixtures/**` for regression + token budget tests.
- Tests: unit (parsers, context builder, misalignment detector, summary/commit generators, misalignment status transitions), integration (chat/analyze endpoints, loader hydration, persistence), and E2E (Playwright chat streaming, banner interactions, pop-outs, clipboard flows).
- Docs: update `docs/viewer-architecture.md` (or add README subsection) plus inline JSDoc around chat APIs, loader responsibilities, and feature-flag/config expectations.

Scope / Out of Scope
- In scope: session-mode chat inside viewer with TanStack DB persistence (shared DB, new `chat-messages` + `misalignments` collections), misalignment detection + surfacing + status toggles (`createdAt`/`updatedAt`, enum validation), persisted ChatMessages per `{ sessionId, mode }`, summary + commit pop-outs (non-streaming), AI abstraction + AGENTS parsing, fixtures/tests/docs above, and environment-level feature flag (env var default-on for dev, off for prod unless enabled) to swap between legacy and new ChatDock panels.
- Deferred/out of scope: general-mode chat enablement (response returns MODE_NOT_ENABLED), cross-session chat history management UI, per-session feature flags, multi-tenant auth/permissions, websocket live updates beyond existing viewer SSE hook, mobile-specific layouts, production LLM concurrency controls, feature-level audit logs, and long-term Postgres/pgvector retention.

Approach
1) **Model + fixtures**: formalize `Session`, `Misalignment`, and `ChatMessage` types in `src/lib/sessions/model.ts` (aligning with PRD fields like `Misalignment.status`, `eventRange`, `severity`) plus status enums; parse AGENT rules in `src/lib/agents-rules/parser.ts`, and seed deterministic fixtures under `tests/fixtures/session-large.json` + `tests/fixtures/agents/sample.md` with helpers for slice-based tests and misalignment status permutations.
2) **AI + context primitives**: create `src/lib/ai/client.ts` exposing provider config (`maxContextTokens`, `maxOutputTokens`) and prompt templates; implement `src/features/chatbot/context-builder.ts` + cache plus `src/features/chatbot/misalignment-detector.ts` referencing fixtures and trimming low-value sections first when exceeding budgets.
3) **Config + persistence**: add `src/config/features.ts` (or similar) to read `SESSION_COACH_ENABLED` from env, defaulting true locally and false in prod unless explicitly set. Define `src/features/chatbot/chatModeConfig.ts`, `chatbot.runtime.ts`, and TanStack DB persistence in `src/server/persistence/chatMessages.ts` (`ChatMessageRecord` with `id`, `sessionId`, `clientMessageId?`, `mode`, `role`, `content`, `misalignmentId?`, `createdAt`, `updatedAt`) plus `src/server/persistence/misalignments.ts` (`MisalignmentRecord` with `ruleId`, `eventRange`, `severity`, `evidence`, `status`, timestamps) sharing the existing DB instance. Add helpers to append/query by `{ sessionId, mode }` and update misalignment status with server-side enum validation.
4) **Runtime + APIs**: implement `src/server/chatbot-api.server.ts` with `createServerFn` handlers for `/api/chatbot/stream` (streaming) + `/api/chatbot/analyze` (non-streaming) that persist turns, enforce mode validation (`session` only), validate misalignment status enums, and log telemetry tagged by mode/session. Ensure analyze endpoint returns markdown/string arrays per spec.
5) **Loader integration**: extend `src/features/viewer/viewer.loader.ts` to fetch discovery snapshot, aggregate misalignment metadata/status from the TanStack DB collection, load persisted ChatMessages, read feature flag state, and expose typed data via `Route.useLoaderData` without leaking module-level state; document SSR streaming implications and feature flag behavior.
6) **Viewer UI wiring**: replace `src/components/viewer/ChatDock.tsx` usage with a feature-flagged new `ChatDockPanel` fed by `useChat({ body: { mode: 'session', sessionId } })`, add misalignment banner/timeline badges with acknowledgement/dismissal controls (mutating `MisalignmentRecord` collection), wire pop-outs that call the non-streaming analyze endpoint, and ensure `ViewerPage` composes loaders + components without new effects.
7) **Validation + docs**: expand Vitest suites, write Playwright coverage for streaming/popup flows + misalignment state changes, add docs describing dual-mode responsibilities, feature flag, and telemetry expectations, and verify lint/build/test matrix before handoff.

Risks / unknowns
- Token ceilings on long sessions despite summarization may force truncation logic; need UX for partial context warnings instead of hard failures.
- Misalignment heuristics might require iterative tuning; telemetry must log status transitions while avoiding sensitive raw text.
- Streaming/hydration regressions if ChatDock triggers suspense during SSR; wrap transitions per AGENTS hydration guide.
- SSE/WebSocket interplay with new chat endpoints; ensure no double-processing of events or stale misalignment status when reloading.

Performance / Security / Privacy analysis
- Performance: context builder uses caching + provider budgets to avoid repeated provider calls; loader-level precomputation prevents runtime memoization loops; streaming responses chunked to keep TTFB low while analyze endpoint remains single-response.
- Security: server functions verify session access, validate `mode` + `sessionId`, strip repo secrets from prompts/logs, gate general mode disabled path, and log scoped metadata (`mode`, `sessionId`, latency) without raw prompts.
- Privacy: avoid persisting entire transcripts beyond ChatDock store, redact file paths in logs/fixtures, and ensure TanStack DB snapshots stay process-local per PRD guidance (no PHI/audit requirements yet).

Code smells / caveats
- Legacy `src/components/viewer/ChatDock.tsx` relies on local `useEffect` timers contravening AGENTS rules; replace fully rather than layering logic onto it.
- `viewer.loader.ts` currently stores `previousStats` module state; extending it must avoid leaking per-request ChatMessage/misalignment data during SSR.
- Need to guard against duplicate message persistence if stream restarts mid-flight; idempotent writes keyed by `{ sessionId, clientMessageId }`.
- Ensure `createServerFn` handlers stay server-only (no client bundle imports) and that TanStack DB collections are scoped process-wide but not leaked to clients.

Testing & validation
- Unit: `pnpm vitest run src/lib/agents-rules`, `src/features/chatbot/context-builder.spec.ts`, `misalignment-detector.spec.ts`, summary/commit formatter specs.
- Integration: `pnpm vitest run src/server/chatbot-api.server.spec.ts src/features/viewer/viewer.loader.spec.ts` to validate loaders/APIs/persistence with mocked AI streams.
- E2E: `pnpm playwright test viewer-chat.spec.ts` covering hydrations, streaming, banner interactions, and pop-outs; include clipboard assertions.

Rollback / escape hatch
- Feature-flag ChatDock via loader prop to render legacy `ChatDock` or hide chat-related panels; disabling `router.invalidate` calls + API handlers reverts viewer to passive mode, and git revert of new chat modules removes the stack entirely.

Owner/Date
- Codex / 2025-11-25
