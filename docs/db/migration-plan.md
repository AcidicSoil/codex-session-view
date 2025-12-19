## Postgres + ElectricSQL Migration Plan

### Goals

- Replace local-only JSON snapshots + in-memory TanStack DB stores with Postgres as the system of record.
- Introduce ElectricSQL sync so clients use TanStack DB electric collections instead of localOnly stores.
- Prepare for future auth/tenant enforcement by adding ownership columns now.

### Schema Outline

1. `accounts` – owners of sessions; includes optional identity metadata.
2. `sessions` – root entity for each conversation or imported log; stores metadata/origin refs.
3. `session_members` – membership table for future shared sessions; supports RLS.
4. `chat_threads` / `chat_messages` – conversation threads and messages including dedupe keys.
5. `chat_tool_events` – audit log for tool calls with context + results.
6. `session_uploads` – persisted upload content + repo metadata.
7. `session_repo_bindings`, `misalignments`, `hookify_decisions`, `todos` – existing domain stores moved to Postgres.

Indexes focus on `(session_id, created_at)` ordering plus dedupe (`client_message_id`).

### Migration Process

1. Run `pnpm db:migrate` to apply SQL migrations defined under `db/migrations`.
2. Run `pnpm db:import-legacy` (idempotent) to backfill `data/chat-threads.json`, `data/chat-messages.json`, and `data/chat-tool-events.json` into Postgres using their existing IDs.
3. Switch server persistence modules to use the new database adapters (replace localOnly collections).
4. Configure ElectricSQL shapes scoped by `session_id`, with gatekeeper issuing scoped tokens.
5. Replace `localOnlyCollectionOptions` with `electricCollectionOptions` in client TanStack DB collections.
6. Remove filesystem hydration/persist logic once Postgres path verified.

### Environment Variables

- `DATABASE_URL` – Postgres connection string, required on server.
- `ELECTRIC_HTTP_URL` – HTTP endpoint for Electric shape streaming.
- `ELECTRIC_SYNC_URL` – WS endpoint for Electric sync.

Sample values added to `.env.example`.

### Operational Notes

- Migration scripts are idempotent; reruns verify checksums.
- Keep snapshot export before cutover for rollback.
- Electric must sit behind an authorizing proxy; session scoping enforced by gatekeeper tokens.
