Context
- Repo relies on repo-local JSON snapshots, in-memory `localOnly` stores, and browser localStorage for user-critical data, causing data loss across restarts and multi-instance deployments.
- Need to unify persistence for sessions, chat artifacts, tool events, uploads, misalignments, hookify decisions, todos, and session↔repo bindings on Postgres with ElectricSQL sync via TanStack DB electric collections.
- LocalStorage must remain best-effort for UI-only preferences without impacting authoritative state; Electric shapes must enforce least-privilege replication per user/session.

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
