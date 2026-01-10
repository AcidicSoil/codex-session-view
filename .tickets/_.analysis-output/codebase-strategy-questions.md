# Codebase Strategy: 20 Actionable Questions

This document contains 20 actionable questions for the `codex-session-view` codebase, prioritized by immediate Return on Investment (ROI) to drive rapid understanding and improvements.

## Immediate Exploration (High ROI)

1. **Reference:** `src/server/lib/sessionUploadWatchers.server.ts:watcherRegistry`
   **Question:** Does the in-memory `watcherRegistry` map cause session state desync when the development server restarts or if deployed to a serverless environment?
   **Rationale:** Server-side in-memory state is ephemeral; users may lose live updates silently upon deployment or restart.
   **ROI:** 0.9 (High Impact, High Confidence, Low Effort)
   **Experiment:** Start the app, open a session, trigger a file change, restart the server process, and check if the UI still receives updates.

2. **Reference:** `src/lib/logger.ts:forwardBrowserLog`
   **Question:** What is the performance penalty of `forwardBrowserLog` sending a network request for every client-side error or warning?
   **Rationale:** High-frequency client logs (e.g., during a render loop error) could inadvertently DDOS the logging endpoint.
   **ROI:** 0.85 (Moderate Impact, High Confidence, Low Effort)
   **Experiment:** Intentionally trigger a loop of 50 `logError` calls in a client component and measure network tab activity/latency.

3. **Reference:** `src/db/sessionSnapshots.ts:sessionSnapshotCollection`
   **Question:** Does `localStorageCollectionOptions` handle `QuotaExceededError` gracefully when storing large chat session snapshots?
   **Rationale:** LocalStorage has a strict 5MB limit; exceeding it without handling causes app-wide write failures.
   **ROI:** 0.8 (High Impact, Moderate Confidence, Moderate Effort)
   **Experiment:** Run `sessionSnapshotCollection.insert` with a 6MB dummy string payload and observe if the app crashes or alerts.

4. **Reference:** `src/server/function/sessionStore.ts:inputSchema`
   **Question:** Does the `content` validator (`z.string().min(1)`) prevent malicious payloads or extremely large files from crashing the server parser?
   **Rationale:** Unbounded string inputs can lead to DoS via memory exhaustion during Zod parsing.
   **ROI:** 0.75 (High Impact, Moderate Confidence, Moderate Effort)
   **Experiment:** Send a `persistSessionFile` request with a 50MB string payload and monitor server memory usage.

5. **Reference:** `src/lib/session-parser/validators.ts:parseResponseItemLine`
   **Question:** How does the parser behave when encountering a valid JSON line with an unknown `record_type` (forward compatibility)?
   **Rationale:** If the parser fails hard on new event types, the viewer will break whenever the upstream CLI adds features.
   **ROI:** 0.72 (Moderate Impact, High Confidence, Low Effort)
   **Experiment:** Pass `{"record_type": "future_event", "data": {}}` to `parseResponseItemLine` and check if it returns a "success" or "error" result.

6. **Reference:** `src/config/features.ts:isSessionCoachEnabled`
   **Question:** Why does the feature flag logic strictly check `'true' | '1'`/`'false' | '0'` but default to `true` for any other value?
   **Rationale:** Defaulting to `true` on malformed config is risky for experimental features; "fail closed" is safer.
   **ROI:** 0.7 (Moderate Impact, High Confidence, Low Effort)
   **Experiment:** Set `SESSION_COACH_ENABLED=foo` in `.env` and assert `isSessionCoachEnabled()` returns `true`.

7. **Reference:** `src/server/lib/sessionUploadWatchers.server.ts:UploadWatcher`
   **Question:** Does `fs.watch` properly release file handles when `dispose()` is called, or are we leaking watchers on component unmount?
   **Rationale:** Leaking file watchers eventually hits the OS file descriptor limit, crashing the server.
   **ROI:** 0.68 (High Impact, Moderate Confidence, Moderate Effort)
   **Experiment:** Open and close a session view 10 times, then run `lsof | grep <filename>` (or `Handle` on Windows) to count active watches.

8. **Reference:** `src/lib/logger.ts:emit`
   **Question:** Is the `queueMicrotask` wrapper effectively swallowing synchronous errors during log serialization?
   **Rationale:** If serialization fails (e.g., circular reference in `meta`), the error is silenced, making debugging the logger itself impossible.
   **ROI:** 0.65 (Low Impact, High Confidence, Low Effort)
   **Experiment:** Call `logInfo('test', 'msg', circularObject)` and verify if *any* error appears in the console or if it fails silently.

9. **Reference:** `src/server/chatbot-api/errors.ts:isProviderUnavailableError`
   **Question:** Does the `MODEL_UNAVAILABLE` code check cover 503 Service Unavailable responses from upstream providers?
   **Rationale:** Narrow error checks might misclassify transient network failures as permanent logical errors.
   **ROI:** 0.62 (Moderate Impact, Moderate Confidence, Low Effort)
   **Experiment:** Mock a provider response with status 503 and no body/code, then pass it to `isProviderUnavailableError`.

10. **Reference:** `src/router.tsx:getRouter`
    **Question:** Does `defaultPreload: 'intent'` cause excessive data fetching on mobile devices when scrolling through session lists?
    **Rationale:** "Intent" preloading fetches data on hover/touch-start; aggressive preloading wastes bandwidth on list views.
    **ROI:** 0.6 (Moderate Impact, Moderate Confidence, Moderate Effort)
    **Experiment:** Simulate a mobile viewport, scroll quickly through the session list, and count the number of initiated network requests.

11. **Reference:** `src/lib/ai/client.types.ts:ChatModelDefinition`
    **Question:** Are the `modes` defined in the type strictly enforced at runtime, or can a model be forced into an unsupported mode?
    **Rationale:** Mismatch between defined capabilities and runtime usage leads to cryptic API failures.
    **ROI:** 0.58 (Moderate Impact, High Confidence, Low Effort)
    **Experiment:** Call an AI client with a model ID and a mode *not* in its `modes` array; check for immediate validation error.

12. **Reference:** `src/lib/session-parser/validators.ts:SessionMetaSchema`
    **Question:** Does `SessionMetaSchema` validation strip unknown fields, potentially losing critical metadata from newer CLI versions?
    **Rationale:** Zod's `strip()` (default) behavior causes data loss; `passthrough()` is needed for forward compatibility.
    **ROI:** 0.55 (Moderate Impact, High Confidence, Low Effort)
    **Experiment:** Parse `{ "valid_field": "x", "new_field": "y" }` with `SessionMetaSchema` and check if `new_field` exists in the output.

## Strategic Planning (High Value)

13. **Reference:** `src/server/function/sessionStore.ts:persistSessionFile`
    **Question:** Can we abstract the file persistence layer to support S3/Blob storage instead of direct disk writes?
    **Rationale:** Direct disk dependency locks the application to stateful hosting, preventing horizontal scaling.
    **ROI:** 0.82 (High Impact, High Confidence, High Effort)
    **Experiment:** Create an interface `ISessionStore` with `save` method, implement the current disk logic, and swap the import in `sessionStore.ts`.

14. **Reference:** `src/db/sessionSnapshots.ts:createCollection`
    **Question:** Should we migrate from `localStorage` to `IndexedDB` (via `idb-keyval` or similar) to support larger session histories?
    **Rationale:** `localStorage` is synchronous (blocks main thread) and size-limited; IndexedDB is async and handles larger blobs.
    **ROI:** 0.78 (Moderate Impact, High Confidence, Moderate Effort)
    **Experiment:** Benchmark reading a 5MB JSON blob from localStorage vs IndexedDB to measure main thread blocking time.

15. **Reference:** `src/lib/logger.ts:appendServerLog`
    **Question:** Should we replace the custom `appendServerLog` with a structured logger (Pino/Winston) to enable JSON logs and log shipping?
    **Rationale:** Ad-hoc logging is hard to query; structured logging enables integration with observability platforms (Datadog/Grafana).
    **ROI:** 0.74 (Moderate Impact, High Confidence, Moderate Effort)
    **Experiment:** Replace one `console.log` with a `pino` instance and check if the output format is valid JSON.

16. **Reference:** `src/server/lib/sessionUploadWatchers.server.ts:ensureNodeFs`
    **Question:** How can we refactor `UploadWatcher` to be runtime-agnostic (Node/Edge) given its hard dependency on `node:fs`?
    **Rationale:** The current implementation prevents deploying the viewer to Edge runtimes (Cloudflare Workers/Vercel Edge).
    **ROI:** 0.7 (High Impact, Moderate Confidence, High Effort)
    **Experiment:** Attempt to bundle the server code with a target of `edge` (e.g., via Nitro config) and identify build errors.

17. **Reference:** `src/server/chatbot-api/errors.ts:AiProviderError`
    **Question:** Should we implement a Circuit Breaker pattern for AI providers to fail fast when `AiProviderError` rates spike?
    **Rationale:** Retrying failing providers wastes quota and increases latency; failing fast improves UX during outages.
    **ROI:** 0.66 (Moderate Impact, Moderate Confidence, Moderate Effort)
    **Experiment:** Wrap a provider call in a simple `try/catch` loop that counts failures and "opens" (stops calling) after 3 errors.

18. **Reference:** `src/config/features.ts:featureFlags`
    **Question:** Can we move feature flags to a remote configuration provider (or a database) to allow runtime toggling without redeploy?
    **Rationale:** Env-var based flags require a full redeploy to change, slowing down rollouts/rollbacks.
    **ROI:** 0.62 (Low Impact, Moderate Confidence, Moderate Effort)
    **Experiment:** Fetch feature flags from a mock API endpoint in `features.ts` (cached) instead of reading `env` directly.

19. **Reference:** `src/lib/session-parser/validators.ts:parseSessionMetaLine`
    **Question:** Should parsing logic be offloaded to a Web Worker to prevent UI jank when loading large session logs?
    **Rationale:** JSON parsing and Zod validation are CPU intensive; doing this on the main thread freezes the UI for large files.
    **ROI:** 0.58 (High Impact, Moderate Confidence, High Effort)
    **Experiment:** Move `parseSessionMetaLine` to a `worker.ts`, send 1000 lines, and measure main thread responsiveness (FPS).

20. **Reference:** `src/router.tsx:setupRouterSsrQueryIntegration`
    **Question:** What is the strategy for detecting and preventing hydration mismatches caused by time-dependent data (e.g. `persistedAt`)?
    **Rationale:** SSR/Client timestamp differences often cause React hydration errors that degrade performance and UX.
    **ROI:** 0.54 (Low Impact, Moderate Confidence, Moderate Effort)
    **Experiment:** Render a component displaying `new Date()` in SSR and Client, and observe the console for "Hydration failed" warnings.
