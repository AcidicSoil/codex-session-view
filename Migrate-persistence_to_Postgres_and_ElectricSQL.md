## Backend Work Ticket: Migrate persistence to Postgres + ElectricSQL sync (TanStack DB Electric Collection)
---------------------------------------------------------------------------------------------------------

### Summary

Replace local-only / filesystem-backed persistence for **sessions, timeline events, and chat dock (threads/messages)** with **Postgres as system-of-record** and **ElectricSQL as the real-time/local-first sync engine**, integrated via **TanStack DB Electric Collection**. [TanStack+1](https://tanstack.com/db/latest/docs/collections/electric-collection?utm_source=chatgpt.com)

### Current state (evidence)

* Chat threads/messages are stored in **TanStack DB localOnly collections** and snapshotted to disk (`process.cwd()/data/chat-threads.json`, `chat-messages.json`) via `fs.readFile`/`fs.writeFile`.

* Session uploads are stored in a **localOnly** collection and the uploaded session content is stored **in-memory** as `content: string`.

* Project guidance indicates **server-synced domain data should use TanStack DB collections backed by a sync engine (Electric/Trailbase/etc.)**, not local-only storage.

    AGENTS

### Target architecture (within existing stack)

* **Postgres**: system-of-record for sessions + timeline events + chat threads/messages.

* **ElectricSQL sync engine**: partial replication (“Shapes”) streaming Postgres changes to clients (read-path sync). [electric-sql.com+1](https://electric-sql.com/docs/llms/_intro_redux?utm_source=chatgpt.com)

* **TanStack DB Electric Collection** (`@tanstack/electric-db-collection`): client collections synced via Electric. [TanStack+2TanStack+2](https://tanstack.com/db/latest/docs/collections/electric-collection?utm_source=chatgpt.com)

* **TanStack Start server functions** (`createServerFn`) for authenticated writes and non-synced operations. [TanStack](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions?utm_source=chatgpt.com)

* * *

Scope
-----

### In scope

1. **Database modeling + migrations** for:

    * Sessions (upload metadata + storage reference strategy)

    * Timeline events (persisted derived entities for indexing/filtering/extensibility)

    * Chat threads + chat messages

2. **ElectricSQL deployment** against the Postgres instance and environment configuration.

3. **Sync shape design** for partial replication aligned to tenancy/session scoping.

4. **Migration path** from existing disk snapshots (`data/chat-*.json`) and in-memory session uploads (where applicable).

5. **Remove filesystem persistence from runtime path** for these domains.

### Out of scope (separate tickets)

* UI refactors beyond replacing data sources/wiring (unless required for parity).

* Optional: long-term object storage for large session payloads (can be phased).

* * *

Backend work items
------------------

### 1) Provision Postgres for ElectricSQL

* Ensure Postgres **v14+** and **logical replication enabled**. [electric-sql.com+1](https://electric-sql.com/docs/guides/deployment?utm_source=chatgpt.com)

* Create/validate DB role for Electric with **REPLICATION** privilege and required permissions. [electric-sql.com+1](https://electric-sql.com/docs/api/config?utm_source=chatgpt.com)

* Define operational requirements (backups, retention, encryption, access controls) for user-generated data.

### 2) Deploy ElectricSQL sync engine

* Deploy Electric sync engine as a service connected to Postgres (using documented config variables such as `DATABASE_URL`). [electric-sql.com+1](https://electric-sql.com/docs/api/config?utm_source=chatgpt.com)

* Add health checks + basic operational monitoring hooks (service health + replication health/lag signals as available).

### 3) Define Postgres schema + constraints

* Create tables (or equivalent) for:

  * `sessions`

  * `timeline_events` (normalized to support future filters/annotations/cross-session queries)

  * `chat_threads`

  * `chat_messages`

* Add indexes required for core access patterns (by `sessionId`, `threadId`, time ordering).

* Ensure stable IDs align with current app IDs where already emitted (thread/message IDs) to support migration parity.

### 4) Implement authenticated write path (TanStack Start server functions)

* Replace “write to local collection + disk snapshot” with server-function-backed writes to Postgres for:

  * Create/rename/archive/delete thread

  * Append/update/delete messages

  * Create/update session records

  * Persist timeline events derived from session content (either synchronous on upload or async job later)

* Keep API boundary consistent with TanStack Start server functions. [TanStack](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions?utm_source=chatgpt.com)

### 5) Define Electric Shapes (partial replication)

* Create shape definitions for least-privilege replication:

  * Per-user/per-tenant session scope

  * Per-session chat scope (threads/messages)

  * Timeline events for authorized sessions

* Ensure shape definitions prevent cross-tenant leakage and match expected UX (local-first behavior with only relevant subsets replicated). [electric-sql.com+1](https://electric-sql.com/docs/llms/_intro_redux?utm_source=chatgpt.com)

### 6) Switch TanStack DB collections to Electric Collection (integration point)

* Replace `localOnlyCollectionOptions(...)` for these domains with Electric collection options (TanStack DB Electric Collection). [TanStack+1](https://tanstack.com/db/latest/docs/collections/electric-collection?utm_source=chatgpt.com)

* Remove disk hydration/persist logic for chat (`fs.readFile`/`fs.writeFile` snapshotting).

### 7) Migration plan

* One-time import:

  * Read `data/chat-threads.json` and `data/chat-messages.json` into Postgres tables with integrity checks (thread/message counts, ordering).

* Define policy for existing in-memory session uploads:

  * Either non-migrated (documented cutoff) or export/import path if historical sessions must persist.

* After cutover: block or ignore legacy JSON snapshot paths in production builds.

### 8) Operational readiness

* Add deployment documentation for:

  * Postgres requirements for Electric (logical replication, roles). [electric-sql.com+1](https://electric-sql.com/docs/guides/deployment?utm_source=chatgpt.com)

  * Electric service config and environment variables. [electric-sql.com+1](https://electric-sql.com/docs/api/config?utm_source=chatgpt.com)

* Update `.env.example` only (per repo constraints) for Postgres/Electric variables.

* * *

Acceptance criteria
-------------------

* No production code path persists or hydrates chat history from `process.cwd()/data/chat-*.json`.

* Sessions, timeline events, chat threads, and chat messages are durable in Postgres and remain available after restart/redeploy.

* Multi-instance deployments return consistent results for the same session/thread (no instance-local divergence).

* Electric sync engine is deployed and functioning; TanStack DB Electric Collections receive live updates for authorized scopes. [TanStack+1](https://tanstack.com/db/latest/docs/collections/electric-collection?utm_source=chatgpt.com)

* AuthZ/tenancy enforced for all replicated subsets (Shapes) and all write operations.

### Dependencies / references

* TanStack DB Electric Collection docs. [TanStack+2TanStack+2](https://tanstack.com/db/latest/docs/collections/electric-collection?utm_source=chatgpt.com)

* ElectricSQL deployment + Postgres requirements + permissions. [electric-sql.com+3electric-sql.com+3electric-sql.com+3](https://electric-sql.com/docs/guides/deployment?utm_source=chatgpt.com)

* TanStack Start server functions. [TanStack](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions?utm_source=chatgpt.com)

---
