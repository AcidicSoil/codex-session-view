# Output Template — Repo Socratic Interrogation Plan

## Tree (40 nodes)

- ROOT
  - Question: What are the highest-leverage feature opportunities that reduce drift between the Viewer, Coach, and persistence layers?
  - Trigger signal: `README.md` (architecture overview), `docs/architecture-analysis.md` (module map + data flow)
  - Probe method: `rg "Viewer|Chatbot|persistence|local-first" README.md docs/architecture-analysis.md`; fallback: `grep -R -n -E "Viewer|Chatbot|persistence|local-first" README.md docs/architecture-analysis.md`
  - Exit criterion: At least 2 seams show duplicated state or inconsistent ownership.
  - Next action if “yes”: Draft a unification roadmap (storage, parsing, API boundaries).

  - A (Architecture seams)
    - Question: Where do client/server boundaries duplicate responsibilities or hide state divergence?
    - Trigger signal: `src/router.tsx:getRouter`, `src/routes/api/*`, `src/server/function/*`
    - Probe method: `rg "createRouter|createFileRoute|createServerFn" src`; fallback: `grep -R -n -E "createRouter|createFileRoute|createServerFn" src`
    - Exit criterion: Same concerns handled in both route handlers and server functions or in both client + server stores.
    - Next action if “yes”: Consolidate responsibilities by boundary (route vs server fn, client vs server state).

    - A.1
      - Question: Is the session snapshot lifecycle split across client localStorage and server in-memory uploads?
      - Trigger signal: `src/db/sessionSnapshots.ts:sessionSnapshotCollection`, `src/server/persistence/sessionUploads.server.ts:sessionUploadsCollection`
      - Probe method: `rg "sessionSnapshotCollection|sessionUploadsCollection" src`; fallback: `grep -R -n -E "sessionSnapshotCollection|sessionUploadsCollection" src`
      - Exit criterion: Two stores persist overlapping session data with no explicit sync pathway.
      - Next action if “yes”: Introduce a shared snapshot authority (server-first or unified adapter).

      - A.1.1
        - Question: Are sessions parsed in both client and server, risking divergent results?
        - Trigger signal: `src/hooks/useFileLoader.ts:streamParseSession`, `src/server/lib/chatbotData.server.ts:parseSessionToArrays`
        - Probe method: `rg "streamParseSession|parseSessionToArrays" src`; fallback: `grep -R -n -E "streamParseSession|parseSessionToArrays" src`
        - Exit criterion: Both parse paths exist and populate separate stores.
        - Next action if “yes”: Centralize parsing (server parse + client hydrate).
      - A.1.2
        - Question: Does the server silently fall back to fixture snapshots when uploads are missing?
        - Trigger signal: `src/server/lib/chatbotData.server.ts:loadBaseSnapshot/loadFixtureSnapshot`
        - Probe method: `rg "loadFixtureSnapshot|Fallback" src/server/lib/chatbotData.server.ts`; fallback: `grep -R -n -E "loadFixtureSnapshot|Fallback" src/server/lib/chatbotData.server.ts`
        - Exit criterion: Fallback fixture path is used when upload content cannot be loaded.
        - Next action if “yes”: Surface explicit “missing upload” state + remediation UI.
      - A.1.3
        - Question: Can cached server snapshots remain stale after upload refresh?
        - Trigger signal: `src/server/lib/chatbotData.server.ts:cachedSnapshots`, `src/server/persistence/sessionUploads.server.ts:refreshSessionUploadFromSource`
        - Probe method: `rg "cachedSnapshots|refreshSessionUploadFromSource" src/server/lib/chatbotData.server.ts src/server/persistence/sessionUploads.server.ts`; fallback: `grep -R -n -E "cachedSnapshots|refreshSessionUploadFromSource" src/server/lib/chatbotData.server.ts src/server/persistence/sessionUploads.server.ts`
        - Exit criterion: Cache invalidation is only tied to repo binding updates, not upload refresh events.
        - Next action if “yes”: Add cache busting on upload refresh or versioned snapshot keys.

    - A.2
      - Question: Are API boundaries inconsistent between file routes and server functions?
      - Trigger signal: `src/routes/api/*` handlers vs `src/server/function/*` createServerFn usage
      - Probe method: `rg "createFileRoute\('/api|createServerFn" src`; fallback: `grep -R -n -E "createFileRoute\('/api|createServerFn" src`
      - Exit criterion: Both approaches used for similar interactions without a single standard.
      - Next action if “yes”: Standardize on server functions for type-safe client access.

      - A.2.1
        - Question: Should chat streaming use server functions instead of raw `/api` fetch calls?
        - Trigger signal: `src/features/chatbot/chatbot.runtime.ts:requestChatStream`, `src/routes/api/chatbot/stream.ts:Route`
        - Probe method: `rg "requestChatStream|/api/chatbot/stream" src`; fallback: `grep -R -n -E "requestChatStream|/api/chatbot/stream" src`
        - Exit criterion: Client uses fetch to `/api/chatbot/stream` rather than a server fn.
        - Next action if “yes”: Add a `createServerFn` wrapper and replace fetch usage.
      - A.2.2
        - Question: Is server persistence in-memory only, causing data loss on restart?
        - Trigger signal: `src/server/persistence/*:localOnlyCollectionOptions`
        - Probe method: `rg "localOnlyCollectionOptions" src/server/persistence`; fallback: `grep -R -n -E "localOnlyCollectionOptions" src/server/persistence`
        - Exit criterion: Critical stores (uploads, misalignments, tool events) are memory-only.
        - Next action if “yes”: Add durable storage adapter (SQLite or file-backed).
      - A.2.3
        - Question: Does rule inventory caching miss changes to rule files or bindings?
        - Trigger signal: `src/server/lib/ruleInventory.server.ts:rulesByRoot`, `listSessionRepoBindings`
        - Probe method: `rg "rulesByRoot|listSessionRepoBindings" src/server/lib/ruleInventory.server.ts`; fallback: `grep -R -n -E "rulesByRoot|listSessionRepoBindings" src/server/lib/ruleInventory.server.ts`
        - Exit criterion: Cache has no mtime/hash invalidation for rule files.
        - Next action if “yes”: Add file hash or timestamp invalidation in rule inventory.

    - A.3
      - Question: Are repo binding, rule loading, and viewer loader responsibilities overly coupled?
      - Trigger signal: `src/components/chatbot/SessionRepoSelector.tsx`, `src/features/viewer/viewer.loader.ts`
      - Probe method: `rg "SessionRepoSelector|viewerLoader" src`; fallback: `grep -R -n -E "SessionRepoSelector|viewerLoader" src`
      - Exit criterion: UI binding + loader fetches are tightly synchronized without explicit lifecycle control.
      - Next action if “yes”: Separate binding lifecycle (explicit events) from loader refresh.

      - A.3.1
        - Question: Does binding a repo trigger consistent rule inventory refresh?
        - Trigger signal: `src/components/chatbot/SessionRepoSelector.tsx:handleBind`, `src/server/function/sessionRepoContext.ts`
        - Probe method: `rg "handleBind|sessionRepoContext" src/components/chatbot/SessionRepoSelector.tsx src/server/function/sessionRepoContext.ts`; fallback: `grep -R -n -E "handleBind|sessionRepoContext" src/components/chatbot/SessionRepoSelector.tsx src/server/function/sessionRepoContext.ts`
        - Exit criterion: Binding sets repo context without explicit rule inventory refresh trigger.
        - Next action if “yes”: Invalidate rule inventory after successful binding.
      - A.3.2
        - Question: Is viewer loader doing too many server calls at once (discovery + chat state + rules)?
        - Trigger signal: `src/features/viewer/viewer.loader.ts:viewerLoader`
        - Probe method: `rg "runSessionDiscovery|fetchChatbotState|fetchRuleInventory" src/features/viewer/viewer.loader.ts`; fallback: `grep -R -n -E "runSessionDiscovery|fetchChatbotState|fetchRuleInventory" src/features/viewer/viewer.loader.ts`
        - Exit criterion: Loader performs multiple heavyweight calls without caching or deferral.
        - Next action if “yes”: Split loader or defer less critical calls.
      - A.3.3
        - Question: Are tool invocations stored separately from chat messages, making audit trails fragmented?
        - Trigger signal: `src/server/lib/tools/timelineTools.ts:insertChatToolEvent`, `src/server/persistence/chatToolEvents.server.ts`
        - Probe method: `rg "insertChatToolEvent|chatToolEvents" src/server/lib/tools/timelineTools.ts src/server/persistence/chatToolEvents.server.ts`; fallback: `grep -R -n -E "insertChatToolEvent|chatToolEvents" src/server/lib/tools/timelineTools.ts src/server/persistence/chatToolEvents.server.ts`
        - Exit criterion: Tool events live in a separate store with no merged view in UI.
        - Next action if “yes”: Provide unified “chat + tool” audit stream.

  - B (Domain invariants)
    - Question: Which invariants must always hold for sessions, misalignments, and chat state?
    - Trigger signal: `src/lib/sessions/model.ts` (core types + transitions)
    - Probe method: `rg "SessionSnapshot|Misalignment|ChatThreadState" src/lib/sessions/model.ts`; fallback: `grep -R -n -E "SessionSnapshot|Misalignment|ChatThreadState" src/lib/sessions/model.ts`
    - Exit criterion: Invariants are defined but not enforced across persistence and UI.
    - Next action if “yes”: Codify invariants in server functions + validation.

    - B.1
      - Question: Are misalignment lifecycle rules enforced consistently?
      - Trigger signal: `src/lib/sessions/model.ts:MISALIGNMENT_STATUS_TRANSITIONS`, `src/server/persistence/misalignments.ts:updateMisalignmentStatus`
      - Probe method: `rg "MISALIGNMENT_STATUS_TRANSITIONS|updateMisalignmentStatus" src/lib/sessions/model.ts src/server/persistence/misalignments.ts`; fallback: `grep -R -n -E "MISALIGNMENT_STATUS_TRANSITIONS|updateMisalignmentStatus" src/lib/sessions/model.ts src/server/persistence/misalignments.ts`
      - Exit criterion: UI or API paths bypass transition checks.
      - Next action if “yes”: Enforce transitions in all mutation paths.

      - B.1.1
        - Question: Do misalignment status transitions ever skip validation?
        - Trigger signal: `src/server/persistence/misalignments.ts:updateMisalignmentStatus`
        - Probe method: `rg "updateMisalignmentStatus" src/server/persistence/misalignments.ts`; fallback: `grep -R -n -E "updateMisalignmentStatus" src/server/persistence/misalignments.ts`
        - Exit criterion: Any update path sets status without `canTransitionMisalignmentStatus`.
        - Next action if “yes”: Centralize all status updates in one server fn.
      - B.1.2
        - Question: Is excluding `severity: 'info'` from detection intentional or should it be configurable?
        - Trigger signal: `src/features/chatbot/misalignment-detector.ts` (filters `info` + `source`)
        - Probe method: `rg "severity === 'info'|isInformational" src/features/chatbot/misalignment-detector.ts`; fallback: `grep -R -n -E "severity === 'info'|isInformational" src/features/chatbot/misalignment-detector.ts`
        - Exit criterion: Detection permanently skips `info` without configuration.
        - Next action if “yes”: Add a config/setting to include `info` rules.
      - B.1.3
        - Question: Are misalignment records required to include evidence and event ranges?
        - Trigger signal: `src/lib/sessions/model.ts:MisalignmentEvidence`, `createMisalignmentRecord`
        - Probe method: `rg "MisalignmentEvidence|createMisalignmentRecord" src/lib/sessions/model.ts`; fallback: `grep -R -n -E "MisalignmentEvidence|createMisalignmentRecord" src/lib/sessions/model.ts`
        - Exit criterion: Records can be created with empty evidence and no event range.
        - Next action if “yes”: Enforce minimum evidence requirements.

    - B.2
      - Question: Do chat thread invariants (one active per session+mode) hold?
      - Trigger signal: `src/server/persistence/chatThreads.server.ts:getActiveChatThread`
      - Probe method: `rg "getActiveChatThread|status === 'active'" src/server/persistence/chatThreads.server.ts`; fallback: `grep -R -n -E "getActiveChatThread|status === 'active'" src/server/persistence/chatThreads.server.ts`
      - Exit criterion: Multiple active threads can exist or are not reconciled.
      - Next action if “yes”: Enforce unique active thread in storage layer.

      - B.2.1
        - Question: Is a new active thread always created when none exist?
        - Trigger signal: `src/server/persistence/chatThreads.server.ts:getActiveChatThread/createChatThread`
        - Probe method: `rg "getActiveChatThread|createChatThread" src/server/persistence/chatThreads.server.ts`; fallback: `grep -R -n -E "getActiveChatThread|createChatThread" src/server/persistence/chatThreads.server.ts`
        - Exit criterion: No active thread created for a session+mode.
        - Next action if “yes”: Ensure thread creation on first access.
      - B.2.2
        - Question: Is chat thread persistence to `data/chat-threads.json` robust to corruption?
        - Trigger signal: `src/server/persistence/chatThreads.server.ts:hydrateFromDisk/schedulePersist`
        - Probe method: `rg "CHAT_THREADS_FILE|hydrateFromDisk|schedulePersist" src/server/persistence/chatThreads.server.ts`; fallback: `grep -R -n -E "CHAT_THREADS_FILE|hydrateFromDisk|schedulePersist" src/server/persistence/chatThreads.server.ts`
        - Exit criterion: No versioning or atomic write safeguards are used.
        - Next action if “yes”: Add atomic write + snapshot versioning.
      - B.2.3
        - Question: Is `session-default` an implicit invariant that should be explicit?
        - Trigger signal: `src/features/viewer/viewer.loader.ts:resolveSessionId`
        - Probe method: `rg "session-default|resolveSessionId" src/features/viewer/viewer.loader.ts`; fallback: `grep -R -n -E "session-default|resolveSessionId" src/features/viewer/viewer.loader.ts`
        - Exit criterion: Session ID defaults to `session-default` without user intent.
        - Next action if “yes”: Require explicit session selection or prompt.

    - B.3
      - Question: Are repository/origin metadata assumptions consistent across UI and server?
      - Trigger signal: `src/server/persistence/sessionUploads.server.ts`, `src/components/viewer/TimelineWithFilters.tsx`
      - Probe method: `rg "origin|repoLabel|repoMeta" src/server/persistence/sessionUploads.server.ts src/components/viewer/TimelineWithFilters.tsx`; fallback: `grep -R -n -E "origin|repoLabel|repoMeta" src/server/persistence/sessionUploads.server.ts src/components/viewer/TimelineWithFilters.tsx`
      - Exit criterion: UI assumes fixed origin set while server can emit unknowns.
      - Next action if “yes”: Add explicit “unknown” origin handling and UI labels.

      - B.3.1
        - Question: Should origin filters handle more than `codex` and `gemini-cli`?
        - Trigger signal: `src/components/viewer/TimelineWithFilters.tsx` origin stats calculation
        - Probe method: `rg "originStats|geminiCli|codex|unknown" src/components/viewer/TimelineWithFilters.tsx`; fallback: `grep -R -n -E "originStats|geminiCli|codex|unknown" src/components/viewer/TimelineWithFilters.tsx`
        - Exit criterion: Unknown origins exist but UI only exposes two toggles.
        - Next action if “yes”: Add explicit “unknown/other” origin filter.
      - B.3.2
        - Question: Is repository label normalization consistent across ingestion and discovery?
        - Trigger signal: `src/server/persistence/sessionUploads.server.ts:deriveRepoDetailsFromContent`, `src/lib/repository.ts:normalizeRepositoryLabel`
        - Probe method: `rg "deriveRepoDetailsFromContent|normalizeRepositoryLabel" src`; fallback: `grep -R -n -E "deriveRepoDetailsFromContent|normalizeRepositoryLabel" src`
        - Exit criterion: Normalization logic is split between ingestion and display utilities.
        - Next action if “yes”: Centralize repo label normalization in one module.
      - B.3.3
        - Question: Should session snapshot persistence include TTL or versioning invariants?
        - Trigger signal: `src/db/sessionSnapshots.ts:SessionSnapshotRecord.persistedAt`
        - Probe method: `rg "persistedAt" src/db/sessionSnapshots.ts`; fallback: `grep -R -n -E "persistedAt" src/db/sessionSnapshots.ts`
        - Exit criterion: `persistedAt` exists but no TTL or cleanup logic is enforced.
        - Next action if “yes”: Add snapshot expiry/cleanup policy.

  - C (Workflow bottlenecks)
    - Question: Where are user workflows slow, error-prone, or opaque?
    - Trigger signal: `src/hooks/useFileLoader.ts`, `src/components/viewer/TimelineWithFilters.tsx`, `src/features/chatbot/chatbot.runtime.ts`
    - Probe method: `rg "file-loader|TimelineWithFilters|requestChatStream" src`; fallback: `grep -R -n -E "file-loader|TimelineWithFilters|requestChatStream" src`
    - Exit criterion: Multiple steps rely on heavy client computation or silent error handling.
    - Next action if “yes”: Add instrumentation + UX affordances for bottlenecks.

    - C.1
      - Question: Is session ingestion/parse a bottleneck for large sessions?
      - Trigger signal: `src/hooks/useFileLoader.ts:streamParseSession`, `src/lib/session-parser/*`
      - Probe method: `rg "streamParseSession|ParserError" src/hooks/useFileLoader.ts src/lib/session-parser`; fallback: `grep -R -n -E "streamParseSession|ParserError" src/hooks/useFileLoader.ts src/lib/session-parser`
      - Exit criterion: Parsing is purely client-side with error counts but no throttling or worker offload.
      - Next action if “yes”: Add worker-based parsing + progress UI.

      - C.1.1
        - Question: Are parse errors aggregated but not surfaced with actionable recovery?
        - Trigger signal: `src/hooks/useFileLoader.ts:fail` and `useGeminiJsonFallback`
        - Probe method: `rg "ParserError|useGeminiJsonFallback|fail" src/hooks/useFileLoader.ts`; fallback: `grep -R -n -E "ParserError|useGeminiJsonFallback|fail" src/hooks/useFileLoader.ts`
        - Exit criterion: UI only tracks error counts; no detailed remediation.
        - Next action if “yes”: Add detailed parse error UI + retry options.
      - C.1.2
        - Question: Are live session watchers robust and visible to the user?
        - Trigger signal: `src/server/lib/sessionUploadWatchers.server.ts:subscribeToUploadWatcher`, `refreshSessionUploadFromSource`
        - Probe method: `rg "subscribeToUploadWatcher|refreshSessionUploadFromSource" src/server/lib/sessionUploadWatchers.server.ts src/server/persistence/sessionUploads.server.ts`; fallback: `grep -R -n -E "subscribeToUploadWatcher|refreshSessionUploadFromSource" src/server/lib/sessionUploadWatchers.server.ts src/server/persistence/sessionUploads.server.ts`
        - Exit criterion: Watcher errors are logged but not clearly surfaced in UI workflows.
        - Next action if “yes”: Add live-update status + rebind/repair UI.
      - C.1.3
        - Question: Are upload validation rules too permissive for large or malformed files?
        - Trigger signal: `src/routes/api/uploads/index.ts:uploadSchema`
        - Probe method: `rg "uploadSchema|filename|content" src/routes/api/uploads/index.ts`; fallback: `grep -R -n -E "uploadSchema|filename|content" src/routes/api/uploads/index.ts`
        - Exit criterion: Only filename/content length are validated; no size/type limits.
        - Next action if “yes”: Add size/type validation and streaming safeguards.

    - C.2
      - Question: Are timeline search/filter operations too expensive for large event lists?
      - Trigger signal: `src/features/viewer/timeline/search.ts:applyTimelineSearch`, `src/components/viewer/TimelineWithFilters.tsx`
      - Probe method: `rg "applyTimelineSearch|TimelineWithFilters" src`; fallback: `grep -R -n -E "applyTimelineSearch|TimelineWithFilters" src`
      - Exit criterion: Search constructs large haystacks and JSON stringifies per event.
      - Next action if “yes”: Add indexing or worker-based search.

      - C.2.1
        - Question: Is search/filter state duplicated between URL and local UI settings?
        - Trigger signal: `src/components/viewer/TimelineWithFilters.tsx:applyViewerSearchUpdates`, `useUiSettingsStore`
        - Probe method: `rg "applyViewerSearchUpdates|useUiSettingsStore" src/components/viewer/TimelineWithFilters.tsx`; fallback: `grep -R -n -E "applyViewerSearchUpdates|useUiSettingsStore" src/components/viewer/TimelineWithFilters.tsx`
        - Exit criterion: Both URL and store are updated, risking divergence.
        - Next action if “yes”: Make URL the single source of truth and hydrate UI from it.
      - C.2.2
        - Question: Is timeline search O(N) with heavy JSON stringification per event?
        - Trigger signal: `src/features/viewer/timeline/search.ts:applyTimelineSearch`
        - Probe method: `rg "JSON.stringify\(anyEvent\)|applyTimelineSearch" src/features/viewer/timeline/search.ts`; fallback: `grep -R -n -E "JSON.stringify\(anyEvent\)|applyTimelineSearch" src/features/viewer/timeline/search.ts`
        - Exit criterion: Search builds full JSON haystack for every event on every search.
        - Next action if “yes”: Precompute searchable index or use Web Worker.
      - C.2.3
        - Question: Is repeated dedupe/sort work causing rendering delays?
        - Trigger signal: `src/components/viewer/TimelineWithFilters.tsx:dedupeTimelineEvents`
        - Probe method: `rg "dedupeTimelineEvents|sortOrder" src/components/viewer/TimelineWithFilters.tsx`; fallback: `grep -R -n -E "dedupeTimelineEvents|sortOrder" src/components/viewer/TimelineWithFilters.tsx`
        - Exit criterion: Dedupe + reverse happens on every filter change without incremental reuse.
        - Next action if “yes”: Memoize or incrementalize dedupe/sort.

    - C.3
      - Question: Are Coach workflows (streaming, gating, model selection) brittle or opaque?
      - Trigger signal: `src/features/chatbot/chatbot.runtime.ts`, `src/server/lib/hookifyRuntime.ts`
      - Probe method: `rg "requestChatStream|hookify" src`; fallback: `grep -R -n -E "requestChatStream|hookify" src`
      - Exit criterion: Errors or blocking states exist without guided remediation.
      - Next action if “yes”: Add guided workflows for model health and rule gating.

      - C.3.1
        - Question: Are model availability errors handled with sufficient user feedback?
        - Trigger signal: `src/features/chatbot/chatbot.runtime.ts:requestChatStream` error handling
        - Probe method: `rg "Chat stream failed|Chat mode unavailable|requestChatStream" src/features/chatbot/chatbot.runtime.ts`; fallback: `grep -R -n -E "Chat stream failed|Chat mode unavailable|requestChatStream" src/features/chatbot/chatbot.runtime.ts`
        - Exit criterion: Error codes are thrown without UX remediation path.
        - Next action if “yes”: Add “provider health” panel + retry guidance.
      - C.3.2
        - Question: Does Hookify blocking leave users without a remediation path?
        - Trigger signal: `src/server/lib/hookifyRuntime.ts` (blocked), `src/components/chatbot/HookGateNotice.tsx`
        - Probe method: `rg "blocked|HookGateNotice" src/server/lib/hookifyRuntime.ts src/components/chatbot/HookGateNotice.tsx`; fallback: `grep -R -n -E "blocked|HookGateNotice" src/server/lib/hookifyRuntime.ts src/components/chatbot/HookGateNotice.tsx`
        - Exit criterion: Blocking only informs user; no structured remediation flow.
        - Next action if “yes”: Add “remediation checklist” flow linked to rules.
      - C.3.3
        - Question: Are chat thread and message persistence paths aligned?
        - Trigger signal: `src/server/persistence/chatThreads.server.ts`, `src/server/persistence/chatMessages.server.ts`
        - Probe method: `rg "chatThreads|chatMessages" src/server/persistence`; fallback: `grep -R -n -E "chatThreads|chatMessages" src/server/persistence`
        - Exit criterion: Thread and message persistence differ (disk vs memory) without reconciliation.
        - Next action if “yes”: Align persistence strategies for chat state.

## Top 5 leaves (ranked)

1. Leaf: A.1.1
   - reach: 0.8
   - confidence: 0.7
   - complexity: 0.5
   - value = reach * confidence / complexity: 1.12
   - Justification (evidence paths + identifiers or Unknown): Client parses via `src/hooks/useFileLoader.ts:streamParseSession` while server parses via `src/server/lib/chatbotData.server.ts:parseSessionToArrays`.

2. Leaf: C.1.2
   - reach: 0.7
   - confidence: 0.6
   - complexity: 0.4
   - value = reach * confidence / complexity: 1.05
   - Justification (evidence paths + identifiers or Unknown): Live watcher exists in `src/server/lib/sessionUploadWatchers.server.ts:subscribeToUploadWatcher` with error broadcasts; UI surfacing not evident here.

3. Leaf: B.1.2
   - reach: 0.6
   - confidence: 0.5
   - complexity: 0.3
   - value = reach * confidence / complexity: 1.00
   - Justification (evidence paths + identifiers or Unknown): `src/features/chatbot/misalignment-detector.ts` filters out `severity === 'info'` in detection.

4. Leaf: A.2.2
   - reach: 0.9
   - confidence: 0.6
   - complexity: 0.6
   - value = reach * confidence / complexity: 0.90
   - Justification (evidence paths + identifiers or Unknown): `src/server/persistence/*` uses `localOnlyCollectionOptions`, e.g. `sessionUploads.server.ts`.

5. Leaf: C.2.2
   - reach: 0.8
   - confidence: 0.5
   - complexity: 0.5
   - value = reach * confidence / complexity: 0.80
   - Justification (evidence paths + identifiers or Unknown): `src/features/viewer/timeline/search.ts:applyTimelineSearch` JSON-stringifies each event to build haystacks.

## Evidence-gathering checklist (top 5)

- Leaf A.1.1
  - Command 1: `rg "streamParseSession|parseSessionToArrays" src`
  - Command 2: `sed -n '1,200p' src/hooks/useFileLoader.ts`
  - Command 3: `sed -n '1,200p' src/server/lib/chatbotData.server.ts`
  - Command 4: `rg "sessionSnapshotCollection|sessionUploadsCollection" src`
  - Command 5: `grep -R -n -E "streamParseSession|parseSessionToArrays" src`

- Leaf C.1.2
  - Command 1: `rg "subscribeToUploadWatcher|refreshSessionUploadFromSource" src/server/lib/sessionUploadWatchers.server.ts src/server/persistence/sessionUploads.server.ts`
  - Command 2: `sed -n '1,200p' src/server/lib/sessionUploadWatchers.server.ts`
  - Command 3: `rg "sourcePath|refreshSessionUploadFromSource" src/server/persistence/sessionUploads.server.ts`
  - Command 4: `grep -R -n -E "subscribeToUploadWatcher|refreshSessionUploadFromSource" src/server/lib/sessionUploadWatchers.server.ts src/server/persistence/sessionUploads.server.ts`

- Leaf B.1.2
  - Command 1: `rg "severity === 'info'|isInformational" src/features/chatbot/misalignment-detector.ts`
  - Command 2: `sed -n '1,200p' src/features/chatbot/misalignment-detector.ts`
  - Command 3: `rg "MisalignmentSeverity" src/lib/sessions/model.ts`
  - Command 4: `rg "ingestMisalignmentCandidates" src/server/persistence/misalignments.ts`
  - Command 5: `grep -R -n -E "severity === 'info'|isInformational" src/features/chatbot/misalignment-detector.ts`

- Leaf A.2.2
  - Command 1: `rg "localOnlyCollectionOptions" src/server/persistence`
  - Command 2: `sed -n '1,200p' src/server/persistence/sessionUploads.server.ts`
  - Command 3: `sed -n '1,200p' src/server/persistence/chatThreads.server.ts`
  - Command 4: `rg "localOnlyCollectionOptions" src/server/persistence/chatToolEvents.server.ts`
  - Command 5: `grep -R -n -E "localOnlyCollectionOptions" src/server/persistence`

- Leaf C.2.2
  - Command 1: `rg "applyTimelineSearch|JSON.stringify\(anyEvent\)" src/features/viewer/timeline/search.ts`
  - Command 2: `sed -n '1,200p' src/features/viewer/timeline/search.ts`
  - Command 3: `rg "searchQuery|applyTimelineSearch" src/components/viewer/TimelineWithFilters.tsx`
  - Command 4: `rg "matchesSearchMatchers" src/utils/search.ts`
  - Command 5: `grep -R -n -E "applyTimelineSearch|JSON.stringify\(anyEvent\)" src/features/viewer/timeline/search.ts`
