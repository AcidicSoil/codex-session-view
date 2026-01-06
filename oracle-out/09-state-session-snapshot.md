Direct answer (1–4 bullets, evidence-cited)

No—upsertSessionSnapshot does not, by itself, prevent stale state during rapid session switching or out-of-order async writes. It overwrites meta, events, and persistedAt unconditionally on update, with no “newer-wins” check (e.g., comparing persistedAt). Evidence: draft.meta = record.meta; draft.events = record.events; draft.persistedAt = record.persistedAt; and persistedAt is stored but never used for conflict resolution in this function.

No—partial payloads can clobber previously complete snapshots. Because meta is optional and assigned directly, a record with meta: undefined will erase existing meta; similarly, a partial events array will replace the full prior list. Evidence: meta?: SessionMetaParsed; and draft.meta = record.meta; draft.events = record.events;.

It only avoids staleness if callers guarantee (a) the record is always complete, and (b) writes are serialized so that older data never arrives after newer data. Nothing in this function enforces those invariants. Evidence: the function performs a simple existence check then overwrite/insert with no ordering/merge logic.

Risks/unknowns (bullets)

Call-site ordering/races are unknown: if snapshot building is async (network fetch + parsing), older requests can complete after newer ones and overwrite state.

Session switching semantics are unknown: whether rapid switching reuses ACTIVE_SNAPSHOT_ID ('active-session') for multiple sessions or uses per-session IDs determines blast radius of races.

Partial-update intent is unknown: it’s unclear whether record.meta being optional is meant to allow “events-only” updates (which currently wipes meta) or whether meta is always expected.

@tanstack/db update atomicity/serialization behavior is unknown: whether update() queues operations per-record or allows interleaving matters, but even perfect serialization won’t fix out-of-order “older write arrives last”.

Next smallest concrete experiment (1 action)

Run a repo-wide search for upsertSessionSnapshot( and inspect each call site for ordering/guarding (e.g., comparing persistedAt, canceling in-flight loads on session change, or ensuring full snapshot materialization before writing). Concretely: ck --regex "upsertSessionSnapshot\\(" src (or rg "upsertSessionSnapshot\\(" src).

If evidence is insufficient, name the exact missing file/path pattern(s) to attach next

src/** files containing upsertSessionSnapshot( call sites (or paste the matching snippets).

Any code that sets snapshot IDs / uses ACTIVE_SNAPSHOT_ID:

src/** matches for ACTIVE_SNAPSHOT_ID, clearSessionSnapshot(, and storageKey: 'codex-viewer:session'.

The code that constructs the SessionSnapshotRecord (especially where persistedAt is chosen and whether meta/events can be partial):

likely patterns: src/**/snapshot*, src/**/session*, src/**/timeline*, src/**/loadSession*, src/**/session-parser*.

The consumer side that reads snapshots to render timeline/coach context:

patterns: src/**/sessionSnapshots*, src/**/timeline*, src/**/coach*, src/**/sessionSnapshotCollection*.
