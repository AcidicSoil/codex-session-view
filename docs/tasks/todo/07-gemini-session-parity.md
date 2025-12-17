**Context**
- Gemini CLI sessions are partially ingested but still lack clean repo attribution, so Session Explorer cards and timeline metadata fall back to “unknown” labels and make it hard to differentiate Codex vs Gemini work.
- Timeline filters and badges exist, yet role normalization from Gemini event payloads is wrong (user turns show as assistant) and discovery logic doesn’t consistently tag sessions/events so Codex and Gemini timelines diverge.
- We must respect repo rules (feature slices, dedicated modules) while extending parser/discovery code so both ecosystems share a single viewer with accurate origin badges, repo labels, and configurable visibility.

**Success criteria / acceptance**
- Session Explorer lists Gemini CLI sessions discovered from `~/.gemini/tmp` (and env overrides) with repo names derived from Gemini project metadata rather than “unknown”.
- Timeline shows Codex and Gemini events intermixed chronologically with per-event origin badges on the card faces, and the origin toggle filters reliably hide/show each source without affecting the other.
- Gemini message normalization sets the correct `role` for user vs assistant turns based on the payload, letting role filters behave consistently.
- Repo metadata derived from Gemini sources rehydrates both the explorer list and timeline meta (e.g., upload cards) so the same repo label appears everywhere.
- Unit tests cover Gemini repo parsing and role normalization; docs changelog mentions the new detection + UI behavior.

**Deliverables**
- Gemini project metadata extractor module (e.g., `src/lib/gemini/projectMetadata.ts`) that can parse `.gemini/history` entries and session blobs to map `projectHash`/session IDs → repo labels + cwd info.
- Updated discovery + persistence flow (`viewerDiscovery.server.ts`, `sessionUploads.ts`) that plugs the extractor into repo detail resolution for Gemini-origin files and persists the metadata.
- Parser tweaks (`session-parser/gemini.ts`, validators) that inject repo label/meta into `SessionMetaParsed` objects and correctly determine message roles.
- Timeline/session UI adjustments (if needed) to ensure badges render on each card face and the origin toggle filters both Codex and Gemini events in-place.
- Tests + docs: fixture-based unit tests for the extractor + message-role normalization, README/docs updates outlining how Gemini sessions and badges behave.

**Approach**
1. **Assess current ingestion path** – Trace how `viewerDiscovery.server.ts`, `sessionUploads.ts`, and `SessionCard` currently derive `repoLabel` for Codex sessions; note Gemini-specific branches and gaps so we know the exact injection points for new metadata.
2. **Implement Gemini project metadata cache** – Create a dedicated module that can (a) read `.gemini/history/*.json` and/or the session `projectHash` to resolve repo info, (b) optionally fall back to parsing chat files for repo lines, and (c) expose a memoized `getGeminiRepoDetailsForFile` API returning `{ repoLabel, repoMeta }`.
3. **Wire extractor into discovery & persistence** – In `readRepoDetailsFromFile` (or a Gemini-only helper), detect when the file lives under a Gemini-origin directory, call the extractor, and merge results before persisting via `sessionUploads.ensureSessionUploadForFile`. Ensure shared helper doesn’t become a god module; keep Gemini-specific logic in the new file and import it from discovery + server persistence layers.
4. **Propagate repo metadata to timeline meta** – Update Gemini parser (`normalizeGeminiMetaPayload`, `tryParseGeminiConversationBlob`) to stitch repo labels/meta into `SessionMetaParsed` so upload metadata, timeline headers, and search consume consistent values.
5. **Fix Gemini role normalization** – Enhance `normalizeGeminiMessage` (and fallback data paths) to inspect `payload.participant.role`, `payload.type`, or other explicit cues; only default to `assistant` when nothing signals `user/system`. Add regression tests covering NDJSON + saved session message shapes.
6. **Validate UI surfaces** – Ensure `AnimatedTimelineList` and `SessionCard` render origin badges directly on each card face (not in filter chrome) and that `TimelineOriginFilters` toggles filter events without hiding the other origin by default. Confirm the mixed timeline view handles both origins simultaneously.
7. **Documentation + testing** – Add fixture data for Gemini project history + chat logs, write targeted tests for the extractor and role normalization, and update `docs/gemini-cli-support.md`/`README.md` with the new auto-detection + badge behavior. Run `pnpm test` to keep the suite green.

**Risks / unknowns**
- `.gemini/history` schemas may vary by CLI version; extractor must tolerate missing fields and not block ingestion when metadata is absent.
- Reading many history files could be expensive; need caching and filesystem guards so discovery remains fast.
- Some Gemini sessions may lack `projectHash` or repo hints; we must define graceful fallbacks so UI still renders meaningful info.

**Testing & validation**
- Unit tests for the new metadata extractor (history parsing, fallback heuristics) and for `normalizeGeminiMessage` role mapping using real sample payloads.
- Integration-style tests for discovery/persistence to confirm `repoLabel`/`origin` values persist and appear in Session Explorer lists.
- Manual verification in the viewer: ensure toggles, badges, and mixed-origin timelines behave correctly while switching filters and running search.

**Rollback / escape hatch**
- Keep Gemini-specific logic isolated in new helper modules; if issues arise, we can disable the new extractor or revert parser tweaks without affecting Codex ingestion.

**Owner / date**
- Codex / 2025-12-17

**Assumptions / open points**
- `.gemini/history` entries expose a stable link between `projectHash` and repo metadata (name, cwd, remote) that we can safely parse.
- Gemini session JSON always carries either a `projectHash`, `cwd`, or explicit repo label so we can fall back gracefully when the history lookup fails.
