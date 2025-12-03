Context
- Hookify gate (`src/server/function/hookifyAddToChat.ts:28`) always loads AGENT rules from the viewer workspace via `loadAgentRules()` which scans `process.cwd()`; session uploads’ own `.ruler` / `AGENTS.md` files are ignored.
- Session Coach APIs (`src/server/function/chatbotState.ts:20`, `src/server/chatbot-api.server.ts:205,333`) reuse the same global loader, so misalignment detection, streaming replies, and analyses all display the viewer repo’s rules instead of the user-selected session repo.
- Session uploads already persist `filePath`, `source`, and absolute `sourcePath` metadata (`src/server/persistence/sessionUploads.ts`), but no helper threads that location into Hookify/coach pipelines or caches rule sets by repo root.

Success criteria
- `loadAgentRules` accepts an explicit root directory, caches results per root, and defaults to the viewer workspace only when no session context is provided.
- Hookify, Session Coach fetch, and chatbot API streaming/analysis always pass the resolved session repo root (derived from the clicked asset or stored session context) into `loadAgentRules`.
- A deterministic helper resolves repo roots for session assets (`uploads/...`) and propagates that mapping to any downstream requests keyed by `sessionId`.
- When no repo root can be located (e.g., pure uploads without `sourcePath`), the system logs a warning and safely falls back to the workspace rules without crashing.

Deliverables
- Refactored `src/server/lib/chatbotData.ts` implementing root-scoped rule loading with an LRU/Map cache and invalidation hook for tests.
- New `src/server/lib/sessionRepoRoots.ts` (or similar) that resolves repo roots from session assets / upload metadata plus unit tests covering bundled, external, and upload-only cases.
- Updated server functions (`hookifyAddToChat`, `chatbotState`, chatbot streaming/analysis handlers) that call the helper and propagate repo context through Hookify decisions, misalignment detection, and chat context builders.
- Logging/metrics updates to trace which repo root was used, plus documentation of the new behavior in a CHANGELOG entry if needed.

Approach
1. **Design repo-root resolution helper**
   - Extend `src/server/persistence/sessionUploads.ts` with read helpers (e.g., `findUploadByOriginalName`, `findUploadById`) to expose `sourcePath`, `repoLabel`, and `source` metadata without leaking the internal TanStack DB collection.
   - Build `resolveRepoRootForAssetPath(filePath: string)` that strips the `uploads/` prefix, finds the upload record, and then:
     - If `sourcePath` exists (`bundled`/`external`), walk upward until `.git` or instruction sentinel (AGENTS/.ruler) is found; cache the final directory.
     - If only the serialized `content` exists (`upload`), create a temporary virtual workspace directory (or fallback to viewer root) and record that the resolution is incomplete so UI can warn users.
   - Add `rememberSessionRepoRoot(sessionId, rootDir)` / `getSessionRepoRoot(sessionId)` to share the root for later chatbot calls triggered by the same session tab.
2. **Refactor `loadAgentRules` (src/server/lib/chatbotData.ts:43)**
   - Accept `rootDir = process.cwd()` parameter and replace the single `cachedRules` with a `Map<string, AgentRule[]>`.
   - Include filesystem watcher invalidation hooks for dev/test (e.g., `clearAgentRulesCache(rootDir?)`).
   - Keep the existing glob list but parameterize `cwd: rootDir`; ensure ignores still prevent `node_modules`, `dist`, fixtures, etc.
3. **Thread repo root through Hookify**
   - In `hookifyAddToChat`, call `resolveRepoRootForAssetPath(data.filePath)` when `source === 'session'` or when `filePath` is present; fall back to prior session root map or viewer root.
   - Store the resolved root via `rememberSessionRepoRoot(data.sessionId, rootDir)` so follow-up server calls share the same context.
   - Pass the scoped rules to `evaluateAddToChatContent` and include the root in logging for diagnostics.
4. **Update Session Coach APIs**
   - `fetchChatbotState` should retrieve `rootDir = getSessionRepoRoot(data.sessionId) ?? resolveDefaultRepoRoot()`; only load rules (and build contexts/misalignments) when a root is found, otherwise warn and use empty rules.
   - In `chatbot-api.server.ts`, update both `handleSessionChatStream` and `analyzeChatFromPayload` to load scoped rules. When no root is known, degrade gracefully but annotate misalignment results so we know they relied on fallback.
   - Ensure misalignment detection and hook discovery operate on the per-session rules to keep Hook Gate overlays, chat replies, and analysis in sync.
5. **Validation + DX**
   - Add targeted unit tests for `sessionRepoRoots` helper, verifying it returns absolute directories for bundled/external records and handles missing data.
   - Update existing chatbot/Hookify tests (e.g., `tests/chatbot.test.ts`) to exercise the new API surface by injecting fake repo roots and asserting the correct rule paths are used.
   - Document the behavior (docs or CHANGELOG) so future contributors know to pass repo context when introducing new AGENT-consuming code.

Risks / unknowns
- Timeline/manual prompts lack a file path; ensure they either reuse the last session root or explicitly fall back with telemetry so Hookify doesn’t block legitimate actions.
- Pure uploads without `sourcePath` may never expose filesystem instructions. Need clarity on whether we should support archival `.ruler` files embedded alongside the session file.
- Persisting repo-root mappings per sessionId requires lifecycle management (clearing when uploads change or sessions reset) to avoid stale rules.
- Scanning large repos per upload could be slow; caching logic must balance correctness and performance, especially when multiple sessions map to the same repo.

Testing & validation
- Unit: new helper tests plus updated chatbot/Hookify tests run via `pnpm test tests/chatbot.test.ts` and any added suites under `tests/server`.
- Integration: run `pnpm test e2e/chatbot-api.spec.ts` to confirm streaming/analyze flows still function with scoped rules.
- Manual: trigger “Add to chat” for assets from two different repos and verify Hook Gate surfaces the correct AGENT excerpts for each without requiring a viewer reload.

Rollback / escape hatch
- Because scoped rule loading is isolated behind `loadAgentRules(rootDir)`, reverting to the current behavior only requires restoring the prior helper and removing session-root plumbing if regressions surface. Keep feature-flag scaffolding ready so we can toggle repo-scoped rules off if needed.

Owner/Date
- Codex / 2025-12-03
