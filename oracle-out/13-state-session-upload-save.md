1. Direct answer (1–4 bullets, evidence-cited)

* **Persistence is not bounded in this module.** Every upload is inserted into `sessionUploadsCollection` (`await sessionUploadsCollection.insert(record)` in `saveSessionUpload`) and there is **no TTL / max-count / max-bytes / LRU eviction** logic shown; the only cleanup is an explicit bulk delete via `clearSessionUploadRecords()` iterating `sessionUploadsCollection.toArray` and deleting each record.
* **It retains enough metadata for basic downstream analysis + replay, but not for full source provenance on “upload” entries.** The stored record includes `content` (root source of truth), `size`, `storedAt`, repo fields (`repoLabel`, `repoMeta`, `workspaceRoot` derived from first line), and `origin` (via `detectSessionOriginFromContent(..., { defaultOrigin: 'codex' })`). This is exposed in `SessionUploadSummary` via `toRecordView()` including `url: /api/uploads/${record.id}`, `repoLabel/repoMeta`, `lastModifiedMs/lastModifiedIso`, and `origin`.
* **For “file-backed” sessions (bundled/external), it captures stronger provenance and refresh capability.** `ensureSessionUploadForFile()` stores `sourcePath`, `sourceUpdatedAt` (mtime), and supports incremental refresh/update semantics (including timestamp/origin/metadata/workspace root updates), while `refreshSessionUploadFromSource()` requires `record.sourcePath` and throws if absent (“live updates are unavailable.”). Uploads created by `saveSessionUpload()` set `source: 'upload'` and do **not** set `sourcePath`, so they cannot be refreshed from disk.

2. Risks/unknowns (bullets)

* **Unbounded growth risk:** because `content` is stored inline per record and there’s no eviction, repeated uploads or large sessions can grow memory/disk usage (depending on what `localOnlyCollectionOptions` actually persists to) and can make `toArray` operations slower (`listSessionUploadRecords()`, `clearSessionUploadRecords()`, and the `find...` helpers all scan `toArray`).
* **Metadata quality depends on first-line conventions:** `deriveRepoDetailsFromContent()` and `deriveSessionTimestampFromContent()` only inspect the first line; if uploads don’t include that header line, repo/timestamp fields become best-effort fallbacks (`resolveLastModifiedMs(..., Date.parse(record.storedAt))` / `Date.now()`).
* **Unknown persistence semantics/capacity:** the real storage bounds may be enforced by `@tanstack/db` “localOnly” backing store or browser limits, but that behavior isn’t visible here.

3. Next smallest concrete experiment (1 action)

* Run: `ck --regex "session-uploads-store|saveSessionUpload\\(|ensureSessionUploadForFile\\(|clearSessionUploadRecords\\(|/api/uploads" src` to (a) find call sites and any UI/route-driven cleanup, and (b) locate the `/api/uploads/:id` handler to see whether content is streamed, size-limited, or otherwise constrained.

4. If evidence is insufficient, exact missing file/path pattern(s) to attach next

* `src/routes/**/uploads*` (or wherever `/api/uploads/${id}` is implemented)
* The module defining `localOnlyCollectionOptions` usage/persistence configuration (often under something like `src/**/tanstack-db*` or `src/**/db*`)
* Any lifecycle/cleanup logic around uploads: `src/**/sessionUploads*`, `src/**/viewerDiscovery*`, and any “reset/clear storage” UI action handlers.
