Context
- Repo relies on repo-local JSON snapshots, in-memory `localOnly` stores, and browser localStorage for user-critical data, causing data loss across restarts and multi-instance deployments.
- Need to unify persistence for sessions, chat artifacts, tool events, uploads, misalignments, hookify decisions, todos, and session↔repo bindings on Postgres with ElectricSQL sync via TanStack DB electric collections.
- LocalStorage must remain best-effort for UI-only preferences without impacting authoritative state; Electric shapes must enforce least-privilege replication per user/session.

Reference answers (source: `15_task-todos.md`)

Q1 — Migrating existing `data/chat-*.json` + `chat-tool-events.json`
- Authoritative, restart-surviving server data today lives only in the JSON snapshots under `process.cwd()/data/` written by `src/server/persistence/chatMessages.ts`, `chatThreads.ts`, and `chatToolEvents.ts`.
- These stores hydrate from disk at boot and rewrite the entire array on persist. The plan is a one-time, idempotent import of those three files into the new Postgres tables followed by removing all filesystem reads/writes for these entities (aligns with AGENTS “no compatibility shims”).
- Other `localOnly` in-memory stores (`sessionUploads`, `sessionRepoBindings`, `uiSettingsStore`, `todosStore`, etc.) already lose data on restart, so there is nothing durable to migrate for them unless explicit export/import support is added first.
Assumptions: legacy JSON snapshots contain data worth preserving; other localOnly state can be dropped.
Decisions: importer for the three JSON stores, remove filesystem persistence afterwards.

Q2 — Storage backend for session upload blobs + retention/compliance
- Uploads are text payloads stored in-memory via `sessionUploadsCollection` and exposed by `/api/uploads/:uploadId`. Bundled/external sessions from `.codex/sessions` also land in the same in-memory store.
- Implementation should move upload content into Postgres as `TEXT` (or compressed `BYTEA`) plus metadata, while avoiding replication of raw blob content via Electric shapes (sync normalized metadata/entities only).
- There are no retention/compliance rules in the repo; default must be “no automatic deletion” until policy exists.
Assumptions: upload content is text-based session logs, not binary artifacts.
Decisions: store uploads in Postgres, do not sync raw blobs via Electric, leave retention unmanaged until requirements exist.

Q3 — Authentication/authorization for ElectricSQL shapes + isolation
- No tenant/user auth layer exists. `sessionId` is a querystring defaulting to `session-default`, and domain models have no `userId`/tenant columns.
- Electric must sit behind an authorizing proxy/gatekeeper that validates callers and constrains shape access.
- Isolation boundaries should hinge on `sessionId` (and optionally `mode`, `threadId`); shapes must scope data to the caller-authorized session and forbid arbitrary session selection.
Assumptions: single-tenant behavior until explicit auth lands; sessionId is the enforceable boundary today.
Decisions: introduce proxy-enforced Electric access and scope shapes by `session_id` filters.

Q4 — Realtime sync latency + failure handling SLAs
- Electric sync uses long-polling/SSE live mode with client retry/backoff. The repo sets no latency/offline guarantees.
- Default posture is “near-realtime best effort,” optimizing schema/indexes for the dominant patterns (fetch by `sessionId`/`mode`/`threadId`, ordered by `createdAt` with append-heavy writes).
- Write-path semantics (online vs optimistic) must be chosen explicitly per Electric guidance.
Assumptions: best-effort realtime is acceptable absent SLAs.
Decisions: tune schema/indexes for primary query paths, use Electric live mode defaults.

Q5 — Zero-downtime rollout vs maintenance window
- Current persistence is JSON snapshots + in-memory stores, lacking production-grade migrations/backends. AGENTS forbids long-lived compatibility shims, making dual-write windows undesirable.
- Recommended rollout: maintenance cutover—migrate schema, run importer once, switch codepaths entirely to Postgres/Electric, and keep a pre-import export for rollback without keeping filesystem backend active.
Assumptions: downtime window acceptable, JSON export kept for rollback.
Decisions: maintenance cutover instead of dual persistence.

Additional Q1 — Preparing auth later without redesigning Postgres/Electric
- Electric must remain a private server dependency behind a proxy/gatekeeper; clients never hit Electric directly. Use shape-scoped tokens issued post-auth that embed permitted shape constraints.
- Design schema now for identity: add `accounts/users`, `session_members`, and `account_id` (or owner) columns on replicated tables with supporting FKs/indexes.
- Plan for Postgres Row Level Security—easy to enable later when ownership columns exist.
- Treat current `sessionId` as unauthenticated placeholder; future session discovery + shape issuance becomes server-authorized. Manage app sessions/tokens per OWASP guidance (rotation, secure cookies, expiration, invalidation).
Assumptions: future auth will yield verifiable principals (JWT or server session) for the proxy.
Decisions: deploy Electric behind proxy immediately and bake identity columns/membership tables into v1 schema so later auth is policy/config change, not a migration.

Success criteria
- No production code reads or writes `data/chat-*.json` or any other filesystem/local-only stores for authoritative data.
- All in-scope domain entities persist in Postgres with migrations, transactional guarantees, and survive restarts/multi-instance scaling.
- ElectricSQL shapes deliver scoped realtime replication to clients for session/chat/timeline data without over-sharing.
- Browser/local storage is limited to non-critical UX preferences; quota failures cannot lose or corrupt domain data.

Deliverables
- Postgres schema + migrations for sessions, timeline events, chat threads/messages, chat tool events, session uploads, misalignments, hookify decisions, todos, and session↔repo bindings.
- ElectricSQL config (shapes, auth scoping) plus TanStack DB electric collection definitions feeding the UI.
- Refactored server/domain modules replacing filesystem/local-only persistence with DB-backed operations, including migration path/importers for existing JSON snapshots if feasible.
- Updated docs/CHANGELOG outlining migration steps, env/config changes, and operational expectations.
- Automated tests covering critical CRUD flows and sync semantics (unit/integration/e2e as applicable).

Approach
1) Inventory existing persistence touchpoints (filesystem JSON, `localOnlyCollectionOptions`, server functions, client localStorage usage) and map them to target DB tables and electric collections.
2) Design normalized Postgres schema + migrations (including constraints, transactional semantics, foreign keys) covering all scoped entities and relationships; capture session↔repo binding requirements and upload metadata/storage strategy.
3) Provision/configure ElectricSQL (shapes, auth boundaries, replication filters) and TanStack DB electric collection definitions to mirror server schema for client-side usage.
4) Implement server-side repositories/services that read/write Postgres via TanStack DB or Prisma/SQL client, replacing filesystem/local-only persistence; include migration scripts to import existing JSON snapshots/data.
5) Update server functions, loaders, and client hooks/components to consume the new electric collections/server APIs, ensuring no domain logic depends on localStorage; keep device-only preferences isolated.
6) Add comprehensive tests (unit for repositories, integration for mutation workflows, e2e for user flows) and update docs/CHANGELOG detailing deployment, migration, and rollback steps.

Risks / unknowns
- Data migration fidelity from JSON snapshots/local memory: need mapping rules and fallback if data is inconsistent.
- ElectricSQL auth/scoping complexity for multi-tenant/session isolation; misconfiguration could leak data or break sync.
- Session uploads may reference filesystem blobs; need strategy for blob storage (S3, Postgres large objects) beyond metadata in DB.
- Concurrency semantics for chat/timeline streams must avoid duplicate or out-of-order events; requires transactional ordering.
- Operational rollout might require downtime or dual-write period; confirm acceptable approach.

Testing & validation
- Unit tests for Postgres repositories/services ensuring transactional behavior.
- Integration tests simulating concurrent updates (e.g., chat message send, tool events, todo mutations) to verify ACID guarantees.
- ElectricSQL sync tests (maybe playwright/e2e) to ensure clients receive updates and respect auth scopes.
- Regression tests for session coach/chat dock flows verifying data survives restart; add lint/build/test automation per AGENTS rules (`pnpm lint`, `pnpm test`, `pnpm build`, relevant e2e suites).

Rollback / escape hatch
- Maintain read-only export of legacy JSON/local data before migration; provide feature flag or environment toggle to fall back to legacy persistence during staged rollout while keeping schemas ready.

Owner/Date
- Codex / 2025-12-19
