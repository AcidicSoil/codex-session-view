Context
- Combine the architecture assessment improvements from `docs/architecture-analysis.md` with the session observability gaps from `docs/tasks/todo/02-session-observability-gaps.md` into one actionable, end-to-end plan.
- Ensure all five "Improvement Opportunities" are explicitly captured and mapped to deliverables/steps without adding speculative scope.
- Align with existing module boundaries and constraints noted in `docs/tasks/todo/01-architecture-plan.md` and the repo rules in `AGENTS.md`.

Success criteria
- Plan explicitly lists and references all five improvement opportunities from `docs/architecture-analysis.md`.
- Session observability requirements (session state visibility, "Open Session" clarity, log/artifact handling) are incorporated as concrete steps.
- Deliverables include architecture-level changes (state, persistence, rule parsing, tooling, RPC) and observability/documentation updates.
- Scope boundaries are explicit; no feature flags, rollbacks, or future placeholders remain.
- Tests and infrastructure assumptions are fully specified with concrete commands and environments.

Deliverables
- Unified session state model and storage path shared by server and client.
- Persistent storage for uploads and session-derived data.
- Markdown AST-based rule parsing for agent rules.
- Expanded deterministic analysis tooling for AI runtime.
- Type-safe RPC migration for chatbot streaming.
- Session observability UI/API updates (state/timestamps/identifiers) and clear "Open Session" behavior.
- Log/artifact handling policy and documentation for size constraints and storage workflow.
- Updated README/ops documentation if required by new storage or tooling.

Approach
1) Restate the five improvement opportunities from `docs/architecture-analysis.md` with evidence paths and map each to explicit code areas.
2) Unify session state ownership on the server: define authoritative session entity, update persistence, and remove client-only snapshots as the source of truth.
3) Implement persistent storage for uploads/session data (choose SQLite or file-system adapter) and migrate existing in-memory collections.
4) Migrate chatbot streaming to TanStack Start server functions for type-safe RPC; update client to use server function imports.
5) Update session list API shape to include state, timestamps, identifiers; update UI to display them and clarify "Open Session" behavior.
6) Replace regex rule parsing with Markdown AST parsing (Remark/Unified) and validate against existing rule files.
7) Expand deterministic analysis tooling in `timelineTools` (or new tool module) and wire into AI runtime.
8) Document log/artifact handling workflow and size constraints; ensure session observability references these docs.

Scope (in)
- Server authoritative session state model and storage.
- Persistent storage implementation for uploads/session data.
- Type-safe RPC migration for chatbot streaming.
- Rule parsing refactor to Markdown AST.
- AI tooling expansion for deterministic analysis helpers.
- Sessions list UI/API updates and "Open Session" clarification.
- Log/artifact handling documentation and size constraints guidance.

Scope (out)
- Adding new product features beyond the five improvement opportunities and the session observability gaps.
- Changing or removing existing UI options not directly affected by the observability requirements.
- Introducing external third-party analytics or telemetry not already part of the architecture assessment.

Risks / unknowns
- Unifying state may require migration of localStorage snapshot handling and impacts viewer/chatbot flows.
- Persistent storage backend choice (SQLite vs file system) and migration details must be decided before implementation.
- Rule parsing migration may alter edge-case parsing; requires regression validation against current rule corpus.
- Session observability depends on reliable server-side timestamps and state transitions; may require background tracking/heartbeat.
- Log/artifact storage workflow may require new storage location and access control policy.

Testing & validation
- Unit tests:
  - Rule parsing AST output matches expected `AgentRule` structures.
  - Session state derivation and transitions (queued/running/succeeded/failed).
  - Analysis tool functions return deterministic outputs.
- Integration tests:
  - Upload -> persistence -> session state -> viewer/chatbot flows.
  - Chatbot stream via server function with type-safe payloads.
- UI tests:
  - Sessions list renders state/timestamps/identifiers and "Open Session" description.
- E2E tests:
  - Create multiple sessions; verify running vs completed differentiation; verify open-session navigation.
- Commands/environments:
  - `pnpm lint`
  - `pnpm build`
  - `pnpm test` (unit/integration)
  - `pnpm test:e2e` (if available) or `pnpm playwright test` (per `playwright.config.ts`)
  - Local dev environment with Node.js and pnpm; no external network dependencies assumed unless storage backend requires it.

Infrastructure assumptions
- Local-first architecture remains; persistence backend runs locally (SQLite or file system).
- No external storage integration is assumed unless explicitly chosen; if needed, document and configure before implementation.
- Log/artifact storage must be accessible to the local instance and consistent with privacy expectations (no remote upload by default).

Performance / security / privacy impact
- Performance: persistent storage adds I/O; ensure query paths are indexed and bounded. Avoid unnecessary serialization during streaming.
- Security: define access boundaries for logs/artifacts; avoid exposing sensitive session content in UI or tools.
- Privacy: storage is local-first; document retention and cleanup expectations for session data and logs.

Owner/Date
- codex / 2025-12-22

Improvement Opportunities (from Architecture Assessment)
1) Unified State Management: move authoritative session state to server/shared persistence; sync to client. Evidence: `sessionSnapshots.ts` vs `sessionUploads.server.ts`.
2) Persistent Storage: replace `localOnly` uploads with file system/SQLite persistence. Evidence: `localOnlyCollectionOptions` in `sessionUploads.server.ts`.
3) Rule Parsing Robustness: replace regex parsing with Markdown AST (Remark/Unified). Evidence: `src/lib/agents-rules/parser.ts`.
4) Tooling Expansion: add deterministic analysis tools beyond timeline getters. Evidence: `src/server/lib/tools/timelineTools.ts`.
5) Type-Safe RPC: migrate `api/chatbot/stream` to TanStack Start server functions. Evidence: `chatbot.runtime.ts` uses `fetch('/api/chatbot/stream')`.

References
- `docs/architecture-analysis.md`
- `docs/tasks/todo/01-architecture-plan.md`
- `docs/tasks/todo/02-session-observability-gaps.md`
