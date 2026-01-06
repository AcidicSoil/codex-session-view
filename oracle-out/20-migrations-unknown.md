1. Direct answer (1–4 bullets, evidence-cited)

* **No explicit migration strategy is documented or wired.** The README describes persistence as **“localStorage”** on the client and **in-memory** on the server, but does not mention any migration tooling or process. (README: “It persists state using `localStorage`.” / “file uploads (in-memory)” / “In-memory data collections (`@tanstack/db`)”)
* **Practical implication: persisted state is likely treated as disposable cache.** Given “Local-First” + “localStorage” + “in-memory” (README), the safest inferred strategy is “break glass → clear storage / rebuild from source session files” rather than migrating durable DB records.
* **Session/schema evolution is likely handled at parse-time (or by failing fast), not via migrations.** The system positions the viewer as parsing session files into a UI timeline (README: “parses session files and renders the visualization”), which commonly shifts compatibility handling into the parser layer (e.g., tolerant parsing, defaulting, or rejecting old formats) rather than a migration framework.
* **There is no migration-related script or dependency signal in `package.json` scripts.** The scripts list build/dev/test/lint/rules apply, but nothing resembling `migrate`/`migration`/schema tooling. (package.json “scripts” section)

2. Risks/unknowns (bullets)

* **LocalStorage schema breaks can brick the UI until the user clears storage**, unless there is a version gate + reset path (unknown without seeing where localStorage keys are defined/used).
* **Older session logs may become partially/fully unparsable** if the session event Zod schemas are strict and don’t tolerate unknown/older variants (unknown without `src/lib/session-parser/**` and its error-handling call sites).
* **If RxDB is actually used for persistence (dependency exists), missing explicit migration configuration becomes a correctness risk** (data corruption / failed opens). Currently unclear whether RxDB collections are enabled in runtime or just experimental.

3. Next smallest concrete experiment (1 action)

* Run: `ck --regex "localStorageCollectionOptions|localOnlyCollectionOptions|createCollection|localStorage\.|schemaVersion|version" src`
  Goal: enumerate all persisted collections/keys and check whether any versioning/reset logic exists (the real “migration strategy” in local-first apps is often “version bump → transform or wipe”).

4. If evidence is insufficient, name the exact missing file/path pattern(s) to attach next

Attach any of the following if they exist (or confirm they don’t), plus the persistence entry points:

* Migration/tooling candidates:

  * `**/migrations/**`
  * `db/migrations/**`
  * `src/db/**` (esp. anything like `schema.ts`, `storage.ts`, `persistence.ts`)
  * `prisma/schema.prisma`, `prisma/migrations/**`
  * `drizzle.config.*`, `drizzle/**`
* Persistence/versioning hotspots to inspect:

  * `src/server/persistence/**` (already referenced in README; include all files)
  * `src/db/**` (TanStack DB collections, localStorage adapters)
  * Any file defining localStorage keys (often `src/lib/*storage*`, `src/features/**/storage*`, `src/db/*`)
  * `src/lib/session-parser/**` (schemas + parse error handling paths)
