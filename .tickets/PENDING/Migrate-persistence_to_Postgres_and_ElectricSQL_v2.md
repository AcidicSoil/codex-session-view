## Backend Work Ticket: Complete Postgres persistence for domains not covered by “Migrate-persistence_to_Postgres_and_ElectricSQL.md”

### Summary

Extend the Postgres-backed persistence effort to cover remaining app domains that are currently either:

* persisted to repo-local JSON files under `process.cwd()/data`, or
* stored in server memory via TanStack DB `localOnly` collections (lost on restart and divergent across instances).

This ticket is explicitly the “everything else” not included in the existing migration scope (which is limited to **sessions, timeline events, chat threads/messages**).

---

## Background / Current State (evidence)

### Disk-backed JSON persistence (server runtime writes to filesystem)

* **Chat tool events** are persisted to `data/chat-tool-events.json` via `fs.readFile/fs.writeFile` and hydrated at runtime.

### Server in-memory “localOnly” domain stores (non-durable)

* **Todos** stored in a `localOnly` collection (`todos-store`).
* **Misalignments** stored in a `localOnly` collection (`misalignments-store`) and used in session-mode chat context building.
* **Hookify decisions** stored in a `localOnly` collection (`hookify-decisions-store`) with fields like `sessionId`, `contentHash`, `severity`, `blocked`, rule list, message/annotations.
* **Session↔repo bindings** stored in a `localOnly` collection (`session-repo-bindings`) and used by server functions to set/clear session repo context.
* **Profile UI settings (server-side)** stored in a `localOnly` collection (`ui-settings-store`) even though the client attempts to persist for logged-in profiles via a server function; this is not durable today.

### Client localStorage persistence (device-local; quota-limited)

* Guest UI settings are written to `localStorage` with quota exceptions ignored, so persistence can silently fail.  ([MDN Web Docs][1])

---

## In Scope (this ticket)

Implement database-backed persistence for these domains, aligning with the existing “Postgres as system-of-record + ElectricSQL for replication where needed” direction.  ([TanStack][2])

1. **Chat tool events**

* Persist all tool event records and status transitions (e.g., `sessionId`, `threadId`, `toolCallId`, `toolName`, `status`, timestamps, result/error fields).
* Remove runtime dependency on `data/chat-tool-events.json`.

2. **Hookify decisions**

* Persist decisions for auditability and consistent behavior across restarts/instances (records include `sessionId`, `contentHash`, `severity`, `blocked`, rules, message/annotations).

3. **Misalignments**

* Persist misalignment records and status transitions per session so session-mode chat context does not depend on instance-local memory.

4. **Todos**

* Persist todo records as durable domain data (create/toggle/delete) instead of instance-local storage.

5. **Session repo bindings**

* Persist session-to-repo bindings so repo context does not drop unexpectedly on refresh/restart and remains consistent across instances.

6. **UI settings (profile-scoped server persistence)**

* Persist profile settings in the database (logged-in profiles) instead of server `localOnly` state.
* Keep guest settings device-local unless/until product requirements mandate guest-to-account migration; prevent silent “saved but not actually saved” behavior where feasible given browser quota constraints. ([MDN Web Docs][1])

---

## Out of Scope (for this ticket)

* The domains already covered by the existing migration ticket: **sessions, timeline events, chat threads/messages**.
* UI refactors beyond required wiring changes (consistent with the existing ticket’s out-of-scope).

---

## Requirements / Expected Behavior

* **Durability:** Data remains available after server restart/redeploy.
* **Multi-instance consistency:** Same user/session yields consistent results independent of which instance serves the request.
* **Correctness under concurrent writes:** Avoid lost updates; use database transactions/isolation to ensure reliable state transitions (especially tool events and misalignment status changes). ([postgresql.org][3])
* **Access patterns preserved:** Existing product flows that read these domains (e.g., session-mode chat context using misalignments; session repo context set/clear) behave identically from the user perspective.

---

## Migration / Cutover Expectations

* **Import legacy tool events** from `data/chat-tool-events.json` where present (same parity approach as chat threads/messages migration).
* For purely in-memory stores (todos, misalignments, hookify decisions, session repo bindings, server ui settings), treat existing in-memory state as non-authoritative unless there is a documented need to backfill.

---

## Acceptance Criteria

* No production code path reads/writes **chat tool events** from/to `process.cwd()/data/chat-tool-events.json`.
* Todos, misalignments, hookify decisions, session repo bindings, and profile UI settings are persisted in the database and survive restart/redeploy.
* Multi-instance deployments return consistent results for these domains.
* Tool event status and misalignment status transitions remain correct under concurrent actions (no lost updates). ([postgresql.org][3])
* Logged-in profile UI settings are durable server-side; guest settings remain explicitly device-local and are not treated as a reliable system-of-record when quota is exceeded.  ([MDN Web Docs][1])

[1]: https://developer.mozilla.org/en-US/docs/Web/API/QuotaExceededError?utm_source=chatgpt.com "QuotaExceededError - Web APIs - MDN Web Docs"
[2]: https://tanstack.com/db/latest/docs/collections/electric-collection?utm_source=chatgpt.com "Electric Collection | TanStack DB Docs"
[3]: https://www.postgresql.org/docs/current/tutorial-transactions.html?utm_source=chatgpt.com "Documentation: 18: 3.4. Transactions"
