## Context
- The session viewer currently only parses NDJSON streams via `streamParseSession`, while Gemini CLI saves pretty-printed `.json` conversations and emits `tool_use/tool_result` event types that do not satisfy `ResponseItemSchema`, so uploads from Gemini fail or lose tool/output context.
- Upload surfaces such as `src/components/viewer/DropZone.tsx` and `src/features/viewer/viewer.upload.section.tsx` restrict accepted files to `.jsonl/.ndjson/.txt`, preventing users from even selecting Gemini `.json` checkpoints or auto-saved chats to analyze issues.
- External discovery (`src/lib/viewer-types/viewerDiscovery.server.ts`) only watches `~/.codex/sessions` (and opt-in env overrides), so Gemini CLI’s default cache in `~/.gemini/tmp/<project_hash>/{chats,checkpoints}` is invisible and cannot be imported without manual file juggling.

## Success criteria / acceptance
- Drag-and-drop or file-picker uploads of Gemini `.json`, `.jsonl`, and `.ndjson` logs fully parse through `useFileLoader` without schema errors and render an ordered timeline, including large (10k+ line) sessions.
- Gemini `tool_use` entries surface as `FunctionCall`, `LocalShellCall`, `WebSearchCall`, or other mapped tool-event types with stable `call_id`, and matching `tool_result` records merge their outputs so no orphaned tool cards remain.
- Discovery lists Gemini chat/checkpoint files when the user opts in via a `GEMINI_SESSION_DIR` (or similar) env flag; counts appear beside existing Codex sessions.
- Unknown Gemini fields or future schema variants continue to degrade to `Other` events without crashing the parser, and existing non-Gemini sources remain unaffected (regression risk mitigated).

## Deliverables
- Parser enhancements covering Gemini event normalization (`normalizeForeignEventShape`) and call-merging logic in `streamParseSession` so new event types map cleanly to internal schemas.
- A JSON ingestion fallback (e.g., blob-to-object reader invoked from `useFileLoader` or a helper in `streaming.ts`) that can flatten conversation arrays/objects when line-by-line parsing fails.
- Viewer UX updates: dropzone/file triggers accept `.json`, copy hints mention Gemini sources, and any session metadata surfaces stay format-agnostic.
- Discovery improvements: `getExternalSessionDirectories` (and downstream globbing) aware of `~/.gemini/tmp` plus targeted glob patterns for `chats/session-*.json` and `checkpoint-*.json`.
- Test fixtures and Vitest coverage for Gemini NDJSON + saved-session inputs, including tool pairing + JSON fallback, plus documentation notes in `docs/` if public APIs change.

## Approach
1. **Collect sample payloads**: export representative Gemini files (headless `--output-format stream-json`, auto-saved `chats/session-*.json`, checkpoints). Document their structures and identify stable keys (`tool_use`, `tool_result`, `tool_id`, `messages`, `startTime`, checkpoint `history`).
2. **Implement JSON fallback parsing**:
   - Add a helper (e.g., `parseBlobAsJsonEvents`) that loads smaller blobs into memory, detects whether the root is an array or conversation object, and yields `{ meta, events }` objects compatible with `SessionMetaSchema`/`ResponseItemSchema`.
   - Update `useFileLoader` (or `streamParseSession`) to attempt NDJSON first; on early fatal parse errors, retry via the JSON helper so multi-line `.json` sessions succeed without duplicating logic.
3. **Normalize Gemini event shapes**:
   - Extend `normalizeForeignEventShape` to recognize `tool_use`, `tool_result`, `init`, and `result` actions; canonicalize IDs via `tool_id`/`toolId`, map tool names to internal event types (bash/shell → `LocalShellCall`, search/web tools → `WebSearchCall`/`WebFetch`, file ops like `ls`, `read_file`, `write_file`, `edit`, `glob`, `grep` → dedicated event shorthands or `CustomToolCall`).
   - Ensure merged events share the same `call_id`, fill in timestamps from Gemini payloads, and preserve structured outputs (arrays/objects) in `args`/`result`.
   - Confirm `streamParseSession`’s call-merging logic handles LocalShellCall + FunctionCall combos from Gemini, adjusting conditions if result payloads arrive as separate records.
4. **Refresh viewer import UX**:
   - Update `SessionUploadDropzone`, `DropZone`, and `viewer.upload.section.tsx` to include `.json` (and corresponding MIME types) in `acceptExtensions`, and tweak helper text to mention Gemini CLI logs explicitly.
   - Verify `filterAcceptedFiles` remains deterministic when directories contain mixed extensions.
5. **Broaden discovery surface**:
   - Add an opt-in environment variable (e.g., `GEMINI_SESSION_DIR`) that, when set, contributes directories to `getExternalSessionDirectories`; skip auto-adding `~/.gemini/tmp` unless explicitly provided.
   - Inside `synchronizeExternalSessions`, detect directories flagged as Gemini sources and limit globbing to `**/chats/session-*.json` and `**/checkpoint-*.json` so unrelated temp JSON isn’t ingested; reuse existing hashing/import flows.
6. **Add fixtures, tests, and docs**:
   - Create fixture files under `src/lib/session-parser/__tests__/fixtures/gemini` covering NDJSON and saved JSON cases; write Vitest cases ensuring event normalization, JSON fallback, and tool merging behave as expected.
   - Update any relevant docs (`docs/session-import.md` or README import section) to describe the new Gemini capability and discovery path.

## Risks / unknowns
- Gemini CLI schemas may differ by version; overfitting to current field names might break quickly, so normalization must stay flexible (e.g., camel/snake-case tolerance, optional timestamps).
- Whole-file JSON parsing can be expensive for >20 MB logs; we need safeguards (size thresholds, streaming alternatives) to avoid freezing the UI.
- Automatically scanning `~/.gemini/tmp` could surface private sessions from other projects; ensure the UI communicates provenance and offers opt-out mechanisms.
- Tool taxonomy beyond bash/search is unclear; misclassification might degrade specialized renderers unless we keep a safe fallback path.

## Testing & validation
- Unit: `pnpm test --filter session-parser` plus new cases verifying Gemini normalization, JSON fallback, and call-merging behavior.
- Integration: run viewer-centric tests (`pnpm test --filter Timeline` or targeted component tests) to ensure DropZone and upload flows still behave.
- Manual: use the UI to upload each new fixture (Gemini NDJSON + saved JSON) and confirm the timeline renders tool calls, metadata, and search filters correctly; verify discovery lists Gemini files when the directory is populated.

## Rollback / escape hatch
- Scope Gemini-specific parsing and discovery toggles behind isolated helpers so reverting is as simple as removing the new normalization cases and directory entries without disturbing existing Codex ingestion.

## Owner / date
- Codex AI / 2025-12-16
