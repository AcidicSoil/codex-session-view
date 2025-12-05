# repo-root_fix_todo-bug 12/03/25

What Codex is doing today

* Sessions live in `$CODEX_HOME/sessions` (usually `~/.codex/sessions`), as JSONL. First line is `session_meta`. ([DeepWiki][1])
* That `session_meta` line includes a `cwd` field that is the directory where `codex` was run for that session. ([GitHub][2])

So the correct repo root signal is already there: `session_meta.cwd`. Not the physical path of the JSONL file.

What the viewer should do instead of chasing `.git` from the `.codex` file path

1. When reading the first line of each session file, parse `cwd` from the `session_meta` object and keep it.

   Example shape:

   ```ts
   type SessionMeta = {
     id: string
     created_at: string
     model: string
     // ...
     cwd?: string
   }
   ```

2. Store `cwd` into your existing per-session metadata structure (whatever you call `repoMeta` / `SessionUploadRecord`):

   ```ts
   interface RepoMetadata {
     repo?: string
     branch?: string
     commit?: string
     remote?: string
     dirty?: boolean
     cwd?: string        // new
   }

   interface SessionUploadRecord {
     id: string
     originalName: string
     sourcePath?: string
     source: 'bundled' | 'external' | 'upload'
     repoMeta?: RepoMetadata
     // ...
   }
   ```

   When you derive repo details from the meta line:

   ```ts
   function buildRepoDetailsFromMeta(meta: SessionMeta): RepoDetails {
     const anyMeta = meta as any

     const repoMeta: RepoMetadata = {
       repo: deriveRepoLabel(meta),
       branch: meta.git?.branch,
       commit: meta.git?.commit,
       remote: meta.git?.remote,
       dirty: meta.git?.dirty,
       cwd: typeof anyMeta.cwd === 'string' ? anyMeta.cwd : undefined,
     }

     return { repoMeta, repoLabel: repoMeta.repo }
   }
   ```

3. Change the repo-root resolution used by Hookify so it uses `cwd` instead of, or in addition to, `sourcePath`:

   ```ts
   export async function resolveRepoRootForAssetPath(
     assetPath: string | undefined,
   ): Promise<RepoRootResolution> {
     const originalName = normalizeAssetName(assetPath)
     if (!originalName) {
       return { rootDir: null, reason: 'missing-file-path' }
     }

     const cached = assetRootCache.get(originalName)
     if (cached) return { ...cached, assetName: originalName }

     const record = findSessionUploadRecordByOriginalName(originalName)
     if (!record) {
       const miss = { rootDir: null, reason: 'asset-not-found', assetName: originalName }
       assetRootCache.set(originalName, miss)
       return miss
     }

     // Primary signal: cwd from Codex session metadata
     if (record.repoMeta?.cwd) {
       const rootFromCwd = await findGitRoot(record.repoMeta.cwd)
       if (rootFromCwd) {
         const hit = { rootDir: rootFromCwd, source: record.source, assetName: originalName }
         assetRootCache.set(originalName, hit)
         return hit
       }
     }

     // Fallback: walk up from physical sourcePath when it exists
     if (record.sourcePath) {
       const rootFromSource = await findGitRoot(record.sourcePath)
       if (rootFromSource) {
         const hit = { rootDir: rootFromSource, source: record.source, assetName: originalName }
         assetRootCache.set(originalName, hit)
         return hit
       }

       const miss = {
         rootDir: null,
         reason: 'no-git-root',
         source: record.source,
         assetName: originalName,
       }
       assetRootCache.set(originalName, miss)
       return miss
     }

     const miss = {
       rootDir: null,
       reason: 'no-source-path',
       source: record.source,
       assetName: originalName,
     }
     assetRootCache.set(originalName, miss)
     return miss
   }
   ```

Result:

* `.codex` stays where it is, central and out of your repos.
* The viewer resolves the git root against the real project directory (`session_meta.cwd`), not the archive directory.
* Hookify stops emitting “no .git root found” for sessions that already have a perfectly valid repo with `.git` at that `cwd`.

[1]: https://deepwiki.com/openai/codex/4.4-session-resumption?utm_source=chatgpt.com "Session Resumption | openai/codex | DeepWiki"
[2]: https://github.com/openai/codex/issues/6730?utm_source=chatgpt.com "Filtering `codex resume` sessions if inside trusted repository · Issue #6730 · openai/codex · GitHub"
