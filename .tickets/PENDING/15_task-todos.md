Answers keyed to Q1..Q5

Q1: Migrating existing `data/chat-*.json` and `chat-tool-events.json`

* Answer: The only authoritative, restart-surviving server data in this repo is the snapshot JSON written under `process.cwd()/data/` by:

  * `src/server/persistence/chatMessages.ts` → `data/chat-messages.json`
  * `src/server/persistence/chatThreads.ts` → `data/chat-threads.json`
  * `src/server/persistence/chatToolEvents.ts` → `data/chat-tool-events.json`
    These stores hydrate from disk and rewrite the full array on each persist. Implementation should do a one-time, idempotent import of these three files into the new Postgres tables, then remove all filesystem reads/writes for these entities (plan success criteria + AGENTS “no compatibility shims” constraint).
    Data loss is already the current behavior for other “domain-ish” state that is `localOnly` in-memory (e.g., `sessionUploads`, `sessionRepoBindings`, `uiSettingsStore`, `todosStore`), so there is nothing durable to migrate for them unless you add explicit export/import first.

Q2: Storage backend for session upload blobs + retention/compliance

* Answer: In this repo “uploads” are not binary blobs; they are stored as `content: string` in the in-memory `sessionUploadsCollection` (`src/server/persistence/sessionUploads.ts`) and served as `text/plain` via `/api/uploads/:uploadId` (`src/routes/api/uploads/$uploadId.ts`). They also include “bundled/external sessions” discovered from `.codex/sessions` and similar globs and loaded into the same in-memory store (`src/lib/viewer-types/viewerDiscovery.server.ts`).
  Implementation should store upload content in Postgres as `TEXT` (or compressed `BYTEA`) plus metadata, and avoid syncing that raw content via Electric shapes (sync parsed/normalized entities + metadata instead). Retention/compliance requirements are not present in this repo; default behavior must be “no automatic deletion” until explicit rules exist.

Q3: Authentication/authorization for ElectricSQL shapes + isolation boundaries

* Answer: This repo has no tenant/user auth layer. `sessionId` is a querystring value defaulting to `'session-default'` (`src/features/viewer/viewer.loader.ts`), and there is no `userId`/tenant concept in domain records (`src/lib/sessions/model.ts`).
  Electric access control therefore cannot be derived from existing auth; it must be introduced. Electric’s documented security model is to run the HTTP API behind an authorizing proxy (or equivalent gatekeeper) that validates the caller and constrains shape access.
  With the current domain model, the only enforceable isolation boundary is `sessionId` (and secondarily `mode`, `threadId`). Shapes should be scoped at minimum by `session_id = <caller-authorized-session>` and never allow arbitrary session selection from the client.

Q4: Realtime sync latency + failure handling SLAs

* Answer: Electric’s sync mechanism is HTTP “live mode” long-polling (and optionally SSE), where the server holds requests open until new data arrives or a timeout, then the client reconnects; the client includes retry/backoff and can fall back to long-polling if SSE is unstable.
  This repo defines no latency or offline requirements. Without explicit SLAs, schema/index design should assume “near-realtime best effort” and optimize for the dominant query patterns implied by the code:

  * fetch by `sessionId`, `mode`, `threadId`, ordered by `createdAt` / event index (`src/server/persistence/chatMessages.ts`, `src/server/persistence/chatToolEvents.ts`, `src/lib/sessions/model.ts`)
  * frequent append-only writes for chat and tool events
    Write-path semantics (online vs optimistic vs other patterns) must be selected explicitly; Electric documents multiple write patterns with different offline/consistency tradeoffs.

Q5: Zero-downtime rollout vs maintenance window

* Answer: The repo currently relies on disk snapshots for chats/tool events and in-memory stores for multiple other entities; there is no production-grade persistence layer or migration framework already in place. AGENTS indicates early development and disallows long-lived compatibility shims, which makes dual-write windows structurally undesirable here.
  Default rollout should be a maintenance cutover: migrate schema, run one-time importer, switch codepaths to Postgres/Electric-only, and keep a pre-import export as rollback material (without keeping a second persistence backend active).

Assumptions

* Existing `data/chat-messages.json`, `data/chat-threads.json`, and `data/chat-tool-events.json` contain data worth preserving; all other in-memory `localOnly` state is acceptable to drop because it is already non-durable today.
* Session upload content is text-based session logs (current API contract), not large binary artifacts.
* Single-tenant operation until an explicit user/tenant auth system is added; `sessionId` is the primary isolation key.

Decisions

* Use a one-time, idempotent importer for the three disk-backed chat JSON snapshots; no dual-write window.
* Store upload content in Postgres (`TEXT`/compressed `BYTEA`) and do not replicate raw content through Electric shapes; replicate normalized entities + metadata.
* Put Electric behind an authorizing proxy/gatekeeper and scope shapes at least by `session_id` (and related keys), since no existing auth/tenant model exists.
* Treat realtime SLAs as “best-effort near-realtime” using Electric live mode + client retry defaults unless stricter requirements are introduced.
* Use a maintenance cutover rollout with rollback via exported legacy snapshots, not a long-lived dual-backend toggle.

```codex-handoff
ready: true
questions_answered: 5
```
---


Answers keyed to Q1..Qn

Q1: Adding an auth layer later—what to lock in now so Postgres/Electric doesn’t need a redesign

* Answer:

  * Make Electric a private dependency of the server from day 1: deploy Electric behind an authorizing proxy/gatekeeper; clients never hit Electric directly. Electric’s security model is explicitly “run behind an authorizing proxy.” ([Electric SQL][1])
  * Use shape-scoped tokens: issue a short-lived token from your app after user auth; embed the permitted shape definition (or constraints) as a signed claim; the proxy authorizes by comparing the signed shape claim to the requested shape params, preventing client-side shape escalation. ([Electric SQL][2])
  * Design schema for identity now even if enforcement is deferred:

    * Add `accounts` (or `users`) table.
    * Add `session_members` (many-to-many) or at minimum `sessions.owner_account_id`.
    * Add `account_id` (or `owner_account_id`) on every replicated row class (messages, threads, tool events, uploads metadata, todos, bindings), with FKs and indexes (`(account_id, session_id, created_at)`-style composites for your dominant reads).
  * Prepare DB-level enforcement without coupling Electric to it: Postgres Row Level Security is policy-based and table-scoped; enabling it later is straightforward if you already have ownership columns and consistent query predicates. ([PostgreSQL][3])
  * Treat current `sessionId` (query param default) as an unauthenticated stand-in only; once auth lands, session discovery and shape issuance become server-authorized operations (the proxy can also dynamically constrain/modify the incoming shape request based on the authenticated principal). ([Neon][4])
  * Session/token handling rules for the eventual auth layer: implement standard session management controls (rotation, secure cookie flags if cookie-based, expiration/inactivity timeouts, server-side invalidation). ([OWASP Cheat Sheet Series][5])

Assumptions

* Auth will produce a server-verifiable principal (JWT or server session) that the proxy/gatekeeper can validate before issuing shape-scoped access.

Decisions

* Ship Electric behind a proxy/gatekeeper immediately; no direct client→Electric connectivity.
* Add identity/ownership columns and membership relations in the first Postgres schema so later auth is a policy/configuration change, not a data migration.

```codex-handoff
ready: true
questions_answered: 1
```

[1]: https://electric-sql.com/docs/guides/security?utm_source=chatgpt.com "Security - Guide"
[2]: https://electric-sql.com/docs/guides/auth?utm_source=chatgpt.com "Auth - Guide"
[3]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html?utm_source=chatgpt.com "Documentation: 18: 5.9. Row Security Policies"
[4]: https://neon.com/guides/electric-sql?utm_source=chatgpt.com "Getting started with ElectricSQL and Neon - Neon Guides"
[5]: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html?utm_source=chatgpt.com "Authentication - OWASP Cheat Sheet Series"
