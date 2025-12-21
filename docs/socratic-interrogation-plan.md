# Socratic Interrogation Plan: Codex Session Viewer

## Repo Context Summary
- **Architecture**: Local-first analysis workbench using **TanStack Start** (SSR) and **Nitro**. Visualization via React, state management with **Zustand** and **@tanstack/db**.
- **Domain**: AI agent session analysis, misalignment detection against `AGENTS.md` rules, and interactive coaching.
- **Key Files**: `src/server/lib/aiRuntime.ts` (LLM orchestration), `src/features/chatbot/misalignment-detector.ts` (Rule checking), `src/server/persistence/sessionUploads.server.ts` (IO/Storage).

---

## 1. Socratic Question Tree

### Root: Session Analysis Workbench Optimization
- **Question**: Can we transform the viewer from a passive replay tool into a proactive performance engineering environment?
- **Trigger signal**: `docs/architecture-analysis.md`
- **Probe method**: `grep -r "proactive" src/`
- **Exit criterion**: Discovery of automated suggestion logic vs user-initiated queries.
- **Next action**: Integrated bottleneck alerting.

#### A. Architecture Seams (Theme: Scalability & Performance)
- **A.1 Question**: Does the O(N) log reading strategy bottleneck interactive live-tailing?
  - **Trigger signal**: `src/server/persistence/sessionUploads.server.ts` line 105 (`fs.readFile`)
  - **Probe method**: `grep "readFile" src/server/persistence/sessionUploads.server.ts`
  - **Exit criterion**: Confirmation that full file is read on every watch event.
  - **Next action**: Implement `fs.read` with byte offsets.
- **A.2 Question**: Are server-side RPC functions (TanStack Start) creating unnecessary latency for local-first interactions?
  - **Trigger signal**: `src/server/function/sessionStore.ts`
  - **Probe method**: `grep "createServerFn" src/server/function/*.ts`
  - **Exit criterion**: Analysis of round-trip time for local file metadata updates.
  - **Next action**: Move metadata derivation to client-side Web Workers.
- **A.3 Question**: Is the in-memory store susceptible to data loss during dev-server HMR?
  - **Trigger signal**: `src/server/persistence/*.server.ts` (localOnlyCollectionOptions)
  - **Probe method**: `grep "localOnlyCollectionOptions" src/server/persistence/*.ts`
  - **Exit criterion**: Observation of wiped state after Nitro reload.
  - **Next action**: Configure SQLite persistence for `@tanstack/db`.

#### B. Domain Invariants (Theme: Rule Alignment & AI Safety)
- **B.1 Question**: Do the misalignment patterns effectively handle multi-turn context (e.g., repeating a mistake)?
  - **Trigger signal**: `src/features/chatbot/misalignment-detector.ts` (single message context)
  - **Probe method**: `read_file src/features/chatbot/misalignment-detector.ts`
  - **Exit criterion**: Verification that `analyze` only accepts one string at a time.
  - **Next action**: Add "Rolling History" buffer to the detector.
- **B.2 Question**: Is the AI Coach vulnerable to context-window overflow with long sessions?
  - **Trigger signal**: `src/server/lib/aiRuntime.prompts.ts`
  - **Probe method**: `grep "substring" src/server/lib/aiRuntime.ts`
  - **Exit criterion**: Absence of token-counting or truncation logic before prompt assembly.
  - **Next action**: Implement a "Relevant Event Selector" (RAG-lite) for prompts.
- **B.3 Question**: Can we guarantee that "Coach" remediations don't themselves violate project rules?
  - **Trigger signal**: `src/server/lib/aiRuntime.ts` (direct stream)
  - **Probe method**: `grep "tools" src/server/lib/aiRuntime.ts`
  - **Exit criterion**: Check if LLM output is piped through the Misalignment Detector.
  - **Next action**: Self-Correction loop for LLM responses.

#### C. Workflow Bottlenecks (Theme: Search & Discovery)
- **C.1 Question**: Does the search system support complex structural queries (e.g., "Find bash commands with exit code 1")?
  - **Trigger signal**: `src/features/viewer/viewer.search.ts`
  - **Probe method**: `read_file src/features/viewer/viewer.search.ts`
  - **Exit criterion**: Verification if search is limited to string matching vs object filtering.
  - **Next action**: Implement a faceted query DSL for session events.
- **C.2 Question**: Is the "Misalignment Banner" too intrusive for high-frequency non-critical events?
  - **Trigger signal**: `src/components/chatbot/MisalignmentBanner.tsx`
  - **Probe method**: `grep "severity" src/components/chatbot/MisalignmentBanner.tsx`
  - **Exit criterion**: Check if 'low' severity triggers the same UI treatment as 'high'.
  - **Next action**: Floating "Indicator" vs blocking "Banner" for low-severity.
- **C.3 Question**: Does the "Discovery" process miss sessions stored in non-standard root folders?
  - **Trigger signal**: `src/lib/viewerDiscovery.server.ts`
  - **Probe method**: `grep "rootDir" src/server/persistence/sessionRepoBindings.ts`
  - **Exit criterion**: Analysis of how `rootDir` is populated (manual vs auto).
  - **Next action**: Implement `fd` or `glob` scanning for `.session` file headers.

### Level 3 Leaves (27 Nodes)
*(Selected representative nodes populated below)*

1. **A.1.1: Incremental Read**
   - Question: Can we use `fs.open` to only read new bytes?
   - Trigger: `src/server/persistence/sessionUploads.server.ts`
   - Probe: `grep "stat" src/server/persistence/sessionUploads.server.ts`
   - Exit: Finding use of `readFile` inside `refreshSessionUploadFromSource`.
   - Next Action: `fs.open` + `read(offset)`.

2. **A.1.2: Debounce Throttling**
   - Question: Does the watcher thrash on high-freq appends?
   - Trigger: `src/server/lib/sessionUploadWatchers.server.ts`
   - Probe: `grep "setTimeout" src/server/lib/sessionUploadWatchers.server.ts`
   - Exit: Finding the promise lock is the only throttle.
   - Next Action: Add 250ms debounce.

3. **A.1.3: Binary Safety**
   - Question: Do we handle non-UTF8 logs?
   - Trigger: `src/lib/session-parser/streaming.ts`
   - Probe: `grep "utf8" src/lib/session-parser/streaming.ts`
   - Exit: Hardcoded 'utf8' in `fs.readFile`.
   - Next Action: Detect encoding or use binary safe buffers.

4. **A.2.1: Persistence Strategy**
   - Question: Is chat history persisted to disk?
   - Trigger: `src/server/persistence/chatThreads.server.ts`
   - Probe: `grep "localOnlyCollectionOptions" src/server/persistence/chatThreads.server.ts`
   - Exit: Confirmation of in-memory only status.
   - Next Action: `JSON.stringify` backup on change.

5. **A.2.2: Large Session Memory**
   - Question: Does storing 100+ sessions crash the Node process?
   - Trigger: `src/server/persistence/sessionUploads.server.ts`
   - Probe: `wc -l data/chat-messages.json`
   - Exit: Finding sessions stored as raw strings in RAM.
   - Next Action: Streaming store (indexedDB/sqlite).

6. **A.2.3: Atomic Writes**
   - Question: Can the session store corrupt on partial writes?
   - Trigger: `src/server/function/sessionStore.server.ts`
   - Probe: `grep "write" src/server/persistence/*.ts`
   - Exit: Finding non-atomic `fs.writeFile` calls.
   - Next Action: Write-temp-and-rename.

7. **A.3.1: Parallel Parsing**
   - Question: Can parsing large logs move to a Worker?
   - Trigger: `src/lib/session-parser/streaming.ts`
   - Probe: `grep "Worker" src/lib/session-parser/streaming.ts`
   - Exit: Confirmation of main-thread parsing.
   - Next Action: `Worker` thread offload.

8. **A.3.2: Multi-Session Diffing**
   - Question: Can we compare two session files for drift?
   - Trigger: `src/features/viewer/viewer.page.tsx`
   - Probe: `grep "comparison" src/features/viewer/*.tsx`
   - Exit: Absence of multi-session state.
   - Next Action: "Diff View" for sessions.

9. **A.3.3: Global Rule Index**
   - Question: Are rules shared across repositories?
   - Trigger: `src/server/lib/ruleInventory.server.ts`
   - Probe: `grep "repoRoot" src/server/lib/ruleInventory.server.ts`
   - Exit: Finding strict 1:1 binding.
   - Next Action: Global rule "Registry".

10. **B.1.1: Contextual Regex**
    - Question: Can rules match across multiple events?
    - Trigger: `detector.analyze` loop.
    - Probe: `grep "events.forEach" misalignment-detector.ts`
    - Exit: Confirming it only sees current string.
    - Next Action: Windowed event processing.

11. **B.1.2: Negation Rules**
    - Question: Can we detect "Missing" behavior?
    - Trigger: `MisalignmentRule` schema.
    - Probe: `grep "negative" misalignment-detector.ts`
    - Exit: Absence of negative lookahead logic.
    - Next Action: "Behavioral Absence" rules.

12. **B.1.3: Rule Conflict**
    - Question: Do rules conflict with each other?
    - Trigger: `deriveKeywords` in `parser.ts`.
    - Probe: `grep "Set" parser.ts`
    - Exit: Finding basic unique set logic.
    - Next Action: Rule precedence scores.

13. **B.2.1: Token Window Tracking**
    - Question: Do we use token-aware truncation?
    - Trigger: `src/server/lib/aiRuntime.ts`
    - Probe: `grep "token" src/server/lib/aiRuntime.ts`
    - Exit: Confirming length-based truncation.
    - Next Action: `tiktoken` integration.

14. **B.2.2: Prompt Versioning**
    - Question: Can we rollback Coach "personality"?
    - Trigger: `aiRuntime.prompts.ts`
    - Probe: `grep "version" aiRuntime.prompts.ts`
    - Exit: Hardcoded prompt strings.
    - Next Action: YAML-based prompt repo.

15. **B.2.3: Provider Fallback**
    - Question: Does it failover if Gemini is down?
    - Trigger: `aiRuntime.ts` line 20.
    - Probe: `grep "catch" aiRuntime.ts`
    - Exit: Absence of multi-provider retry.
    - Next Action: AI Gateway (Vercel SDK features).

16. **B.3.1: Hallucination Check**
    - Question: Does the coach verify its own file paths?
    - Trigger: `CoachReply` logic.
    - Probe: `grep "exists" src/server/lib/aiRuntime.analysis.ts`
    - Exit: Finding unverified path citations.
    - Next Action: Path verification tool.

17. **B.3.2: PII Scrubbing**
    - Question: Are secrets leaked to the LLM?
    - Trigger: `toCoreMessages` in `aiRuntime.messages.ts`.
    - Probe: `grep "secret" aiRuntime.messages.ts`
    - Exit: Absence of redaction logic.
    - Next Action: Regex-based secret scrubber.

18. **B.3.3: Cost Tracking**
    - Question: Do we track session analysis costs?
    - Trigger: `usage` in `ChatStreamResult`.
    - Probe: `grep "usage" src/server/lib/aiRuntime.ts`
    - Exit: Usage is returned but not logged/stored.
    - Next Action: Usage DB.

19. **C.1.1: Virtualized List Yank**
    - Question: Does scroll-to-search-result jank?
    - Trigger: `TimelineView.tsx`
    - Probe: `grep "scrollTo" TimelineView.tsx`
    - Exit: Fixed scroll offset logic.
    - Next Action: `react-virtual` precise alignment.

20. **C.1.2: Search Indexing**
    - Question: Is search O(N)?
    - Trigger: `viewer.search.ts`
    - Probe: `grep "filter" viewer.search.ts`
    - Exit: Confirming linear array filter.
    - Next Action: Bloom filter or inverted index.

21. **C.1.3: Highlight Perf**
    - Question: Does highlighting freeze the UI?
    - Trigger: `HighlightedText.tsx`
    - Probe: `grep "dangerouslySetInnerHTML" HighlightedText.tsx`
    - Exit: Confirmation of heavy DOM nodes.
    - Next Action: Canvas-based highlighting.

22. **C.2.1: Git Context Discovery**
    - Question: Can we auto-bind repos via Git metadata?
    - Trigger: `repo-metadata.ts`
    - Probe: `grep "remote" repo-metadata.ts`
    - Exit: Metadata extracted but not used for discovery.
    - Next Action: Automatic `git clone` bind.

23. **C.2.2: Branch Drift**
    - Question: Are we viewing a session from an old branch?
    - Trigger: `GitInfoSchema`
    - Probe: `grep "dirty" src/lib/session-parser/schemas.ts`
    - Exit: Schema supports it, UI doesn't show it.
    - Next Action: "Branch Drift" warning badge.

24. **C.2.3: Session Dedupe**
    - Question: Are duplicate uploads handled?
    - Trigger: `saveSessionUpload`
    - Probe: `grep "find" src/server/persistence/sessionUploads.server.ts`
    - Exit: Unique ID assigned every time.
    - Next Action: Content hash deduping.

25. **C.3.1: Export Formatters**
    - Question: Can we export to PDF/HTML?
    - Trigger: `src/features/viewer/export/formatters/`
    - Probe: `ls src/features/viewer/export/formatters/`
    - Exit: Only text, markdown, json, csv.
    - Next Action: Print-styled PDF formatter.

26. **C.3.2: Collaborative Review**
    - Question: Can two users share a session view?
    - Trigger: `ViewerChatView.tsx`
    - Probe: `grep "share" src/features/viewer/*.tsx`
    - Exit: Absence of URL-encoded session state.
    - Next Action: Deep-linkable session state.

27. **C.3.3: Dark Mode Polish**
    - Question: Does code highlighting work in light mode?
    - Trigger: `theme-provider.tsx`
    - Probe: `grep "shiki" src/components/kibo-ui/code-block/highlight.ts`
    - Exit: Verification of theme-aware Shiki.
    - Next Action: Dual-theme CSS variables.

---

## 2. Top 5 Leaves Ranked

| ID | Leaf | Reach | Conf | Cplx | Value | Justification |
|---|---|---|---|---|---|---|
| **A.1.1** | Incremental Log Reading | 1.0 | 1.0 | 0.8 | **1.25** | `refreshSessionUploadFromSource` reads full files; O(N^2) thrashes disks on long sessions. |
| **B.2.1** | Token Window Tracking | 1.0 | 0.9 | 0.5 | **1.80** | Critical for production stability; prevents LLM "Context too long" crashes. |
| **A.2.1** | Disk Persistence | 0.8 | 1.0 | 0.4 | **2.00** | Simple to implement via `@tanstack/db` adapter; prevents loss of "Coach" state. |
| **B.3.1** | Path Verification | 0.7 | 0.8 | 0.3 | **1.86** | Prevents LLM hallucinations; ensures Coach remediation steps are actually runnable. |
| **C.1.2** | Search Indexing | 0.6 | 0.9 | 0.6 | **0.90** | Linear filter `O(N)` blocks UI on 10MB+ session files; common in long agent runs. |

---

## 3. Evidence Gathering Checklist

### [A.1.1] Incremental Log Reading
- [ ] `grep "readFile" src/server/persistence/sessionUploads.server.ts` (Confirm full file read)
- [ ] `grep "watch" src/server/lib/sessionUploadWatchers.server.ts` (Check watcher implementation)
- [ ] `ls -lh tests/fixtures/` (Observe size of realistic sessions)

### [B.2.1] Token Window Tracking
- [ ] `grep "tiktoken" package.json` (Verify absence of token library)
- [ ] `read_file src/server/lib/aiRuntime.ts` (Search for manual character count vs token count)
- [ ] `grep "maxOutputTokens" src/lib/ai/client.ts` (Check if limits are defined but ignored)

### [A.2.1] Disk Persistence
- [ ] `grep "localOnlyCollectionOptions" src/server/persistence/chatThreads.server.ts`
- [ ] `ls data/` (Check for existing `.json` persistence files)

### [B.3.1] Path Verification
- [ ] `grep "fs.stat" src/server/lib/aiRuntime.analysis.ts` (Check for validation logic)
- [ ] `read_file src/server/lib/aiRuntime.prompts.ts` (Check if LLM is instructed to verify paths)

### [C.1.2] Search Indexing
- [ ] `grep "filter" src/features/viewer/viewer.search.ts` (Confirm O(N) array filtering)
- [ ] `grep "Worker" src/features/viewer/viewer.search.ts` (Verify lack of off-thread work)
