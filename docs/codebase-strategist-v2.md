1. **Contract/Interface Validation**
   - **Reference:** `src/server/chatbot-api/schema.ts:ChatbotApiSchema`
   - **Rationale:** Ensuring the API schema strictly matches the frontend consumption prevents runtime type errors during chat interactions.
   - **Experiment:** Add a Zod parsing step in a test to validate a mock response against `ChatbotApiSchema`.

2. **Invariant: Event Ordering**
   - **Reference:** `src/server/lib/sessionEventResolver.ts:resolveEvents`
   - **Rationale:** Chat sessions rely on strictly ordered events; out-of-order resolution could corrupt the conversation history.
   - **Experiment:** Write a unit test that feeds shuffled events to `resolveEvents` and asserts the output matches the canonical order.

3. **State Persistence Strategy**
   - **Reference:** `src/server/persistence/uiSettingsStore.ts`
   - **Rationale:** Understanding if UI settings are persisted per-user or globally prevents configuration conflicts in multi-user scenarios.
   - **Experiment:** Modify a setting, restart the server/session, and log the read value to verify persistence scope.

4. **Background Job Reliability**
   - **Reference:** `src/server/lib/sessionUploadWatchers.server.ts`
   - **Rationale:** File watchers can fail silently; ensuring they restart or report errors is critical for real-time session updates.
   - **Experiment:** Manually kill the watcher process (or simulate an error) and check `src/lib/logger.ts` for a restart or error log.

5. **Observability: Client-Side Logs**
   - **Reference:** `src/lib/logger.ts:forwardBrowserLog`
   - **Rationale:** Verifying that critical client-side errors are actually making it to the server logs is essential for debugging production issues.
   - **Experiment:** Trigger a `logError` in the browser console and `tail` the server logs to confirm receipt.

6. **Permissions: Session Access**
   - **Reference:** `src/server/function/sessionRepoContext.server.ts`
   - **Rationale:** We need to confirm that users cannot access session repositories they aren't authorized for, especially with file-system based access.
   - **Experiment:** Attempt to call a session function with a mocked context pointing to a restricted/non-existent path and check for a 403/404.

7. **Database Schema Evolution**
   - **Reference:** `src/db/sessionSnapshots.ts`
   - **Rationale:** If the snapshot format changes, we need a strategy to handle old snapshots to prevent data loss or crash loops.
   - **Experiment:** Create a "legacy" snapshot object, attempt to load it, and observe if it migrates or throws a schema validation error.

8. **UX Flow: Viewer Loading State**
   - **Reference:** `src/features/viewer/viewer.loader.ts`
   - **Rationale:** Large sessions might take time to load; verifying the loading state UX prevents user frustration during data fetching.
   - **Experiment:** Add an artificial delay in the loader and visually verify the `pendingComponent` or skeleton UI.

9. **Failure Mode: Chat Stream Interruption**
   - **Reference:** `src/server/lib/chatStream/ndjsonStream.ts`
   - **Rationale:** Network interruptions during streaming are common; the client must handle incomplete JSON chunks gracefully without crashing.
   - **Experiment:** Mock a stream that terminates abruptly mid-JSON and verify the client UI displays the partial content or an error indicator.

10. **Feature Flag Cleanup**
    - **Reference:** `src/config/features.ts:sessionCoach`
    - **Rationale:** Stale feature flags clutter code; confirming if `sessionCoach` is fully rolled out determines if we can remove the conditional logic.
    - **Experiment:** grep for `featureFlags.sessionCoach.enabled` usages and assess the effort to hardcode it to `true`.

11. **Contract: AI Runtime Providers**
    - **Reference:** `src/server/lib/aiRuntime.providers.ts`
    - **Rationale:** Adding new AI providers requires adhering to a strict interface; verifying this abstraction prevents vendor lock-in.
    - **Experiment:** Implement a dummy provider that throws on every call and verify the runtime handles the switch gracefully.

12. **Invariant: Message Deduplication**
    - **Reference:** `src/server/persistence/chatMessages.server.ts`
    - **Rationale:** Duplicate messages in a chat thread degrade UX and confuse the context window; ensuring unique IDs is vital.
    - **Experiment:** Attempt to insert two messages with the same ID and check if the second write is rejected or ignored.

13. **Caching: Repo Metadata**
    - **Reference:** `src/lib/repo-metadata.ts`
    - **Rationale:** Frequently reading repository metadata from disk is slow; verifying cache hit rates ensures optimal dashboard performance.
    - **Experiment:** Add logging to the metadata read function and refresh the page multiple times to count disk reads.

14. **Observability: Server Function Performance**
    - **Reference:** `src/server/function/__server.ts` (or middleware)
    - **Rationale:** Server functions are the API backbone; tracking their execution time helps identify bottlenecks before they affect users.
    - **Experiment:** Wrap a server function with `console.time/timeEnd` and observe the overhead in the logs.

15. **Permissions: File System Scope**
    - **Reference:** `src/lib/fileFilters.ts`
    - **Rationale:** We must ensure the file viewer cannot traverse outside the allowed project directories (Path Traversal).
    - **Experiment:** Try to request `../../etc/passwd` (or similar) via the file loader and verify it is blocked by the filter.

16. **UX Flow: Export Formats**
    - **Reference:** `src/features/viewer/export/createExportPayload.ts`
    - **Rationale:** Exporting complex sessions to Markdown/JSON must preserve all metadata; data loss here destroys the feature's value.
    - **Experiment:** Export a rich session with tools and images, then inspect the output file for missing fields.

17. **Failure Mode: Hookify Runtime**
    - **Reference:** `src/server/lib/hookifyRuntime.ts`
    - **Rationale:** If the "Hookify" runtime (likely plugin/extension logic) crashes, it shouldn't take down the main application.
    - **Experiment:** Inject a syntax error into a hook script and verify the main app continues to function with an error log.

18. **Background Job: Upload Cleanup**
    - **Reference:** `src/server/persistence/sessionUploads.server.ts`
    - **Rationale:** Temporary uploads can fill up disk space; ensuring they are cleaned up or capped is crucial for long-term server health.
    - **Experiment:** Check if there's a cron job or logic that deletes files older than X days in the uploads directory.

19. **Invariant: Todo List Sync**
    - **Reference:** `src/server/function/todos.ts`
    - **Rationale:** Todo state must be synchronized between the `todosStore` and the underlying persistence to prevent data loss on refresh.
    - **Experiment:** Add a todo, kill the browser immediately, reopen, and verify the todo persists.

20. **Contract: Timeline Tools**
    - **Reference:** `src/server/lib/tools/timelineTools.ts`
    - **Rationale:** The timeline visualization relies on specific tool data structures; changes here break the visualization rendering.
    - **Experiment:** Pass a malformed tool object to the timeline renderer and check if it falls back to a generic view or crashes.