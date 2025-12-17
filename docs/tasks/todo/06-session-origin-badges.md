## Context
- Gemini CLI ingestion now works through a fallback parser, but parsed sessions/raw uploads never capture where the file came from (Codex vs Gemini) and none of the UI surfaces expose that provenance.
- Session uploads/discovery write normalized assets without any origin metadata, so persisted records, summaries, and snapshots cannot later produce “Gemini CLI” badges or filters.
- Timeline event cards and Session Explorer tiles should display a compact badge indicating the session origin so users know which runtime produced each artifact.

## Success criteria / acceptance
- Session meta/events returned by `streamParseSession`, Gemini fallback parsing, and snapshot hydration always set `origin` to `'codex'` or `'gemini-cli'`. When origin cannot be determined, badges stay hidden and an info/error state can surface instead of guessing.
- `useFileLoader`, session snapshots, and upload persistence copy the origin through to in-memory state so every event and the enclosing session meta share a consistent origin.
- Session upload records (`SessionUploadRecord`, summaries, and `DiscoveredSessionAsset`) store origin/tags, and discovery/import flows populate the field for bundled, external, and upload sources (any directory provided via `GEMINI_SESSION_DIR` is treated as Gemini).
- Session Explorer cards show exactly one origin badge (“Codex” or “Gemini CLI”) while timeline prop cards show per-event badges plus a toggle control to filter Codex vs Gemini events without misclassifying legacy uploads.
- Tests cover origin detection, schema serialization, UI badges, and the new timeline toggle (ensuring no-regression for mixed Codex/Gemini sessions).

## Deliverables
- Schema/type updates for `SessionOrigin`, `SessionMetaParsed`, `ResponseItemParsed`, and related helper exports.
- Parser + fallback updates that detect origin via `detectSessionOriginFromContent`, stamp it onto meta/events, and ensure merge logic keeps the field intact.
- Session persistence/discovery updates so upload records, summaries, and `DiscoveredSessionAsset` expose `origin` (and optional derived tags) for downstream UI.
- UI updates to `TimelineWithFilters`, `AnimatedTimelineList`, `SessionCard`, and any shared badge component to display the origin label consistently.
- Tests (unit + component) covering origin propagation plus docs (README/CHANGELOG/gemini-cli-support) that describe the new badges and environment variable expectations.

## Approach
1. **Model + type extensions**
   - Define a shared `SessionOrigin` union in `src/lib/session-parser` and extend `SessionMetaSchema` + `BaseEvent` to include optional `origin`.
   - Re-export the type where meta/events are consumed (viewer event model, `useFileLoader`, storage adapters) so downstream callers can rely on strong typing.
2. **Parsing + detection**
   - In `streamParseSession`, detect session origin at the start by sampling the first chunk of the blob (reuse `detectSessionOriginFromContent`), attach it to emitted `meta` objects, and default event origin if absent.
   - Update Gemini-specific normalization (`normalizeGeminiMetaPayload`, `normalizeGeminiEventShape`, fallback blob parser) to set `origin: 'gemini-cli'` explicitly; let the standard validator default to `'codex'`.
   - Ensure fallback parser/hook (`useGeminiJsonFallback`) annotates parsed events/meta before returning them.
3. **Loader + snapshot plumbing**
   - Update `useFileLoader` so loader state stores `sessionOrigin`, `SessionMetaParsed.origin`, and all dispatched events share `origin`.
   - Extend session snapshot persistence (`sessionSnapshots` collection) to serialize origin so reloads keep badges.
   - Normalize controller meta (wherever viewer components read parse state) to expose a top-level `sessionOrigin`.
4. **Persistence + discovery**
   - Add `origin` to `SessionUploadRecord`, summaries, `SessionUploadView`, and `DiscoveredSessionAsset`; ensure `saveSessionUpload`, `ensureSessionUploadForFile`, and refresh flows call `detectSessionOriginFromContent`.
   - When converting upload/discovery records to assets (`uploadRecordToAsset`, `viewerDiscovery.server`), pass through origin, add `origin:<value>` tags, and treat every path from `GEMINI_SESSION_DIR` as Gemini even if the file lacks obvious markers.
5. **UI rendering + filters**
   - Thread `sessionOrigin` through viewer contexts (`TimelineWithFilters`, `AnimatedTimelineList`, `SessionCard`) and introduce reusable badge/toggle components (e.g., `SessionOriginBadge`, `TimelineOriginFilters`).
   - Session Explorer shows a single badge per card; timeline prop cards show per-event badges and a filter toggle (Codex, Gemini, All). Unknown origin hides badges and can raise a non-blocking warning near filters.
6. **Docs, badges, and tests**
   - Add parser tests proving events/meta carry origin (stream + fallback) and extend any Gemini fixtures to assert `'gemini-cli'` tagging; add component tests (or Storybook screenshot updates) covering badge rendering.
   - Document the behavior in `docs/gemini-cli-support.md`, README, and CHANGELOG (mention opt-in `GEMINI_SESSION_DIR` + new badges).
   - Run `pnpm test` (or targeted suites) and verify manual upload/discovery flows display the badges on both timeline events and session cards.

## Risks / unknowns
- Existing persisted snapshots/uploads lack origin and may need a migration/reset; ensure UI degrades gracefully (badge shows “Unknown”).
- Extra per-event metadata might increase memory/serialization costs for large sessions; monitor bundle size and avoid redundant strings (reuse meta origin when possible).
- Origin detection keyed on heuristics might misclassify non-Gemini JSON; we may need additional markers (e.g., env-provided overrides) if collisions appear.

## Testing & validation
- Unit: parser/normalizer tests for origin stamping, storage tests for `SessionUploadRecord`, and badge component tests with Vitest + React Testing Library.
- Integration/manual: upload Codex + Gemini fixtures, reload snapshots, and browse discovered sessions to confirm badges render consistently on both timeline events and Session Explorer cards.
- Regression: rerun existing parser suites and viewer unit tests to ensure optional origin fields do not break legacy behavior.

## Rollback / escape hatch
- Keep origin fields optional and gate UI badges on their presence; if issues arise, disabling the badge component or defaulting everything to “Codex” is a one-file change without undoing parser logic.

## Owner / date
- Codex AI / 2025-12-16

## Assumptions / open points
- Older uploads without origin will simply hide the badge and optionally surface a non-blocking warning; no forced default to `codex`.
- Session badges only need to display the source (“Gemini CLI” vs “Codex”) without additional tooltip metadata (file path, env var, etc.).
- Discovery directories marked via `GEMINI_SESSION_DIR` imply Gemini origin even if the file content lacks the usual markers; otherwise detection relies solely on file content.
