# oracle strategist question pack

---

## parsed args

- codebase_name: Unknown
- constraints: None
- non_goals: None
- team_size: Unknown
- deadline: Unknown
- out_dir: oracle-out
- oracle_cmd: oracle
- oracle_flags: --files-report
- extra_files: empty

---

## commands (exactly 20; sorted by ROI desc; ties by lower effort)

```bash
# 01 — ROI=2.80 impact=0.7 confidence=0.8 effort=0.2 horizon=Immediate category=invariants reference=src/features/chatbot/chatModeConfig.ts:assertChatModeEnabled
oracle \
  --files-report \
  --write-output "oracle-out/01-invariants-chat-mode-gate.md" \
  -p "Strategist question #01
Reference: src/features/chatbot/chatModeConfig.ts:assertChatModeEnabled
Category: invariants
Horizon: Immediate
ROI: 2.80 (impact=0.7, confidence=0.8, effort=0.2)
Question: Does assertChatModeEnabled fully gate session and general modes across all API entry points, or are there bypasses?
Rationale: Feature-gated modes are a core safety invariant and any bypass would create inconsistent UX and policy enforcement.
Smallest experiment today: Run ck --regex assertChatModeEnabled src to list every call site.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/features/chatbot/chatModeConfig.ts" \
  -f "src/server/chatbot-api.server.ts"

# 02 — ROI=2.10 impact=0.6 confidence=0.7 effort=0.2 horizon=Immediate category=invariants reference=src/server/lib/tools/timelineTools.ts:assertSameSession
oracle \
  --files-report \
  --write-output "oracle-out/02-invariants-timeline-session.md" \
  -p "Strategist question #02
Reference: src/server/lib/tools/timelineTools.ts:assertSameSession
Category: invariants
Horizon: Immediate
ROI: 2.10 (impact=0.6, confidence=0.7, effort=0.2)
Question: Is timeline tool access strictly scoped to the active session, and how is a mismatch surfaced to the client?
Rationale: Cross-session leakage would corrupt tool context and mislead the coach output.
Smallest experiment today: Run ck --regex createTimelineTools src to trace instantiation and call flow.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/lib/tools/timelineTools.ts"

# 03 — ROI=2.10 impact=0.9 confidence=0.7 effort=0.3 horizon=Immediate category=failure modes reference=src/server/chatbot-api.server.ts:streamChatFromPayload
oracle \
  --files-report \
  --write-output "oracle-out/03-failure-stream-chat.md" \
  -p "Strategist question #03
Reference: src/server/chatbot-api.server.ts:streamChatFromPayload
Category: failure modes
Horizon: Immediate
ROI: 2.10 (impact=0.9, confidence=0.7, effort=0.3)
Question: Are invalid input, disabled modes, and provider failures mapped to stable HTTP codes and response shapes?
Rationale: Streaming errors need deterministic handling to keep client retries and UI state consistent.
Smallest experiment today: Run ck --regex streamChatFromPayload src/routes src/server to verify routing and callers.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/chatbot-api.server.ts" \
  -f "src/routes/api/chatbot/stream.ts"

# 04 — ROI=2.00 impact=0.5 confidence=0.8 effort=0.2 horizon=Immediate category=feature flags reference=src/config/features.ts:isSessionCoachEnabled
oracle \
  --files-report \
  --write-output "oracle-out/04-feature-session-coach.md" \
  -p "Strategist question #04
Reference: src/config/features.ts:isSessionCoachEnabled
Category: feature flags
Horizon: Immediate
ROI: 2.00 (impact=0.5, confidence=0.8, effort=0.2)
Question: Is the session coach feature flag wired consistently, and is default-enabled behavior intentional?
Rationale: Feature flag drift can create environment-specific behavior that is hard to debug.
Smallest experiment today: Run ck --regex SESSION_COACH_ENABLED src to locate all wiring points.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/config/features.ts" \
  -f "src/features/chatbot/chatModeConfig.ts"

# 05 — ROI=1.87 impact=0.8 confidence=0.7 effort=0.3 horizon=Immediate category=contracts/interfaces reference=src/lib/session-parser/schemas.ts:ResponseItemSchema
oracle \
  --files-report \
  --write-output "oracle-out/05-contracts-response-item.md" \
  -p "Strategist question #05
Reference: src/lib/session-parser/schemas.ts:ResponseItemSchema
Category: contracts/interfaces
Horizon: Immediate
ROI: 1.87 (impact=0.8, confidence=0.7, effort=0.3)
Question: Does ResponseItemSchema enumerate all event types used by the viewer, and how are unknown event types handled?
Rationale: Schema gaps cause silent drops or rendering errors in the timeline.
Smallest experiment today: Inspect src/lib/session-parser/schemas.ts and enumerate the discriminated union variants.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/lib/session-parser/schemas.ts"

# 06 — ROI=1.87 impact=0.7 confidence=0.8 effort=0.3 horizon=Immediate category=contracts/interfaces reference=src/server/chatbot-api/schema.ts:streamInputSchema
oracle \
  --files-report \
  --write-output "oracle-out/06-contracts-stream-input.md" \
  -p "Strategist question #06
Reference: src/server/chatbot-api/schema.ts:streamInputSchema
Category: contracts/interfaces
Horizon: Immediate
ROI: 1.87 (impact=0.7, confidence=0.8, effort=0.3)
Question: Is the stream input contract aligned with client usage of prompt, metadata, modelId, and default mode?
Rationale: Misaligned input schemas can reject valid requests or accept invalid ones.
Smallest experiment today: Run ck --regex streamInputSchema src to trace validation and usage.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/chatbot-api/schema.ts" \
  -f "src/server/chatbot-api.server.ts"

# 07 — ROI=1.75 impact=0.5 confidence=0.7 effort=0.2 horizon=Immediate category=observability reference=src/lib/logger.ts:logError
oracle \
  --files-report \
  --write-output "oracle-out/07-observability-log-error.md" \
  -p "Strategist question #07
Reference: src/lib/logger.ts:logError
Category: observability
Horizon: Immediate
ROI: 1.75 (impact=0.5, confidence=0.7, effort=0.2)
Question: Are error logs reliably forwarded and persisted with sufficient metadata for diagnosing user issues?
Rationale: Observability gaps make post-mortems and user support unreliable.
Smallest experiment today: Run ck --regex logError\( src to map logging call sites.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/lib/logger.ts" \
  -f "src/lib/logger.server.ts"

# 08 — ROI=1.40 impact=0.6 confidence=0.7 effort=0.3 horizon=Immediate category=contracts/interfaces reference=src/server/function/sessionRepoContext.shared.ts:sessionRepoContextInputSchema
oracle \
  --files-report \
  --write-output "oracle-out/08-contracts-session-repo-context.md" \
  -p "Strategist question #08
Reference: src/server/function/sessionRepoContext.shared.ts:sessionRepoContextInputSchema
Category: contracts/interfaces
Horizon: Immediate
ROI: 1.40 (impact=0.6, confidence=0.7, effort=0.3)
Question: Does session repo context validation cover all actions and prevent malformed set and clear payloads?
Rationale: Repo context is required for analysis accuracy and misbinding has high blast radius.
Smallest experiment today: Run ck --regex sessionRepoContextInputSchema src to trace validators and callers.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/function/sessionRepoContext.shared.ts" \
  -f "src/server/function/sessionRepoContext.ts"

# 09 — ROI=1.40 impact=0.7 confidence=0.6 effort=0.3 horizon=Immediate category=caching/state reference=src/db/sessionSnapshots.ts:upsertSessionSnapshot
oracle \
  --files-report \
  --write-output "oracle-out/09-state-session-snapshot.md" \
  -p "Strategist question #09
Reference: src/db/sessionSnapshots.ts:upsertSessionSnapshot
Category: caching/state
Horizon: Immediate
ROI: 1.40 (impact=0.7, confidence=0.6, effort=0.3)
Question: Does upserting snapshots avoid stale state when sessions switch quickly or when data is partial?
Rationale: Incorrect snapshot state leads to incorrect timeline and coach context.
Smallest experiment today: Run ck --regex upsertSessionSnapshot src to find call sites.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/db/sessionSnapshots.ts"

# 10 — ROI=1.40 impact=0.6 confidence=0.7 effort=0.3 horizon=Immediate category=UX flows reference=src/features/viewer/viewer.search.ts:applyViewerSearchUpdates
oracle \
  --files-report \
  --write-output "oracle-out/10-ux-viewer-search.md" \
  -p "Strategist question #10
Reference: src/features/viewer/viewer.search.ts:applyViewerSearchUpdates
Category: UX flows
Horizon: Immediate
ROI: 1.40 (impact=0.6, confidence=0.7, effort=0.3)
Question: Does viewer search URL state normalize ranges and filters without leaving stale params?
Rationale: URL-driven state is the primary UX contract for sharing and restoring views.
Smallest experiment today: Run ck --regex applyViewerSearchUpdates src to see how it is used.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/features/viewer/viewer.search.ts"

# 11 — ROI=1.20 impact=0.6 confidence=0.6 effort=0.3 horizon=Immediate category=background jobs reference=src/server/lib/sessionUploadWatchers.server.ts:subscribeToUploadWatcher
oracle \
  --files-report \
  --write-output "oracle-out/11-jobs-upload-watcher.md" \
  -p "Strategist question #11
Reference: src/server/lib/sessionUploadWatchers.server.ts:subscribeToUploadWatcher
Category: background jobs
Horizon: Immediate
ROI: 1.20 (impact=0.6, confidence=0.6, effort=0.3)
Question: Is the upload watcher lifecycle cleaned up when the last SSE client disconnects?
Rationale: Leaked watchers increase memory and file descriptor usage over long sessions.
Smallest experiment today: Run ck --regex subscribeToUploadWatcher src to confirm call sites and cleanup paths.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/lib/sessionUploadWatchers.server.ts" \
  -f 'src/routes/api/uploads/$uploadId.watch.ts'

# 12 — ROI=1.20 impact=0.6 confidence=0.6 effort=0.3 horizon=Strategic category=failure modes reference=src/server/chatbot-api/errors.ts:getProviderErrorMessage
oracle \
  --files-report \
  --write-output "oracle-out/12-failure-provider-message.md" \
  -p "Strategist question #12
Reference: src/server/chatbot-api/errors.ts:getProviderErrorMessage
Category: failure modes
Horizon: Strategic
ROI: 1.20 (impact=0.6, confidence=0.6, effort=0.3)
Question: Does provider error normalization preserve actionable messages without leaking sensitive data?
Rationale: Strategic error messaging affects reliability and support workflows.
Smallest experiment today: Run ck --regex getProviderErrorMessage src to trace usage in analyze flow.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/chatbot-api/errors.ts" \
  -f "src/server/chatbot-api/analyze.ts"

# 13 — ROI=1.20 impact=0.8 confidence=0.6 effort=0.4 horizon=Immediate category=caching/state reference=src/server/persistence/sessionUploads.server.ts:saveSessionUpload
oracle \
  --files-report \
  --write-output "oracle-out/13-state-session-upload-save.md" \
  -p "Strategist question #13
Reference: src/server/persistence/sessionUploads.server.ts:saveSessionUpload
Category: caching/state
Horizon: Immediate
ROI: 1.20 (impact=0.8, confidence=0.6, effort=0.4)
Question: Is upload persistence bounded and does it retain enough metadata for downstream analysis?
Rationale: Uploads are the root source of truth for session replay.
Smallest experiment today: Run ck --regex saveSessionUpload src to locate all call sites.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/persistence/sessionUploads.server.ts"

# 14 — ROI=1.05 impact=0.7 confidence=0.6 effort=0.4 horizon=Strategic category=caching/state reference=src/server/persistence/sessionUploads.server.ts:refreshSessionUploadFromSource
oracle \
  --files-report \
  --write-output "oracle-out/14-state-session-upload-refresh.md" \
  -p "Strategist question #14
Reference: src/server/persistence/sessionUploads.server.ts:refreshSessionUploadFromSource
Category: caching/state
Horizon: Strategic
ROI: 1.05 (impact=0.7, confidence=0.6, effort=0.4)
Question: Does live refresh handle file changes atomically and avoid partial updates during watcher events?
Rationale: Live updates underpin the real-time session viewer and can drift if refresh is inconsistent.
Smallest experiment today: Run ck --regex refreshSessionUploadFromSource src to see how refresh is triggered.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/persistence/sessionUploads.server.ts" \
  -f "src/server/lib/sessionUploadWatchers.server.ts"

# 15 — ROI=1.05 impact=0.7 confidence=0.6 effort=0.4 horizon=Strategic category=UX flows reference=src/routes/(site)/viewer/route.tsx:Route
oracle \
  --files-report \
  --write-output "oracle-out/15-ux-viewer-route.md" \
  -p "Strategist question #15
Reference: src/routes/(site)/viewer/route.tsx:Route
Category: UX flows
Horizon: Strategic
ROI: 1.05 (impact=0.7, confidence=0.6, effort=0.4)
Question: Is the viewer route loader and head configuration sufficient for SSR and streaming behavior?
Rationale: The viewer is the primary UX surface, and SSR behavior affects first-load fidelity.
Smallest experiment today: Run ck --regex viewerLoader src/features/viewer to trace loader usage.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/routes/(site)/viewer/route.tsx" \
  -f "src/features/viewer/viewer.loader.ts"

# 16 — ROI=1.00 impact=0.5 confidence=0.6 effort=0.3 horizon=Strategic category=contracts/interfaces reference=src/server/chatbot-api/schema.ts:analyzeInputSchema
oracle \
  --files-report \
  --write-output "oracle-out/16-contracts-analyze-input.md" \
  -p "Strategist question #16
Reference: src/server/chatbot-api/schema.ts:analyzeInputSchema
Category: contracts/interfaces
Horizon: Strategic
ROI: 1.00 (impact=0.5, confidence=0.6, effort=0.3)
Question: Are analyzeInputSchema analysisType options complete for current product goals, and are defaults correct?
Rationale: Analysis types are a contract with UI and downstream processing.
Smallest experiment today: Run ck --regex analysisType src/server/chatbot-api to list all usage sites.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/chatbot-api/schema.ts" \
  -f "src/server/chatbot-api/analyze.ts"

# 17 — ROI=0.75 impact=0.6 confidence=0.5 effort=0.4 horizon=Strategic category=observability reference=src/server/function/browserLogs.server.ts:readBrowserLogSnapshot
oracle \
  --files-report \
  --write-output "oracle-out/17-observability-browser-snapshot.md" \
  -p "Strategist question #17
Reference: src/server/function/browserLogs.server.ts:readBrowserLogSnapshot
Category: observability
Horizon: Strategic
ROI: 0.75 (impact=0.6, confidence=0.5, effort=0.4)
Question: Does browser log snapshotting balance retention, truncation, and error handling for long-running sessions?
Rationale: Long sessions require reliable diagnostics without unbounded log growth.
Smallest experiment today: Inspect src/server/function/browserLogs.server.ts for truncation and directory handling.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "src/server/function/browserLogs.server.ts"

# 18 — ROI=0.75 impact=0.6 confidence=0.5 effort=0.4 horizon=Strategic category=background jobs reference=src/routes/api/uploads/$uploadId.watch.ts:Route
oracle \
  --files-report \
  --write-output "oracle-out/18-jobs-sse-upload-watch.md" \
  -p "Strategist question #18
Reference: src/routes/api/uploads/$uploadId.watch.ts:Route
Category: background jobs
Horizon: Strategic
ROI: 0.75 (impact=0.6, confidence=0.5, effort=0.4)
Question: Is the SSE upload watcher route resilient to disconnects and heartbeat timing issues?
Rationale: SSE stability is critical for live session updates at scale.
Smallest experiment today: Inspect src/routes/api/uploads/$uploadId.watch.ts and validate heartbeat and cleanup paths.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f 'src/routes/api/uploads/$uploadId.watch.ts'

# 19 — ROI=0.48 impact=0.8 confidence=0.3 effort=0.5 horizon=Strategic category=permissions reference=Unknown
oracle \
  --files-report \
  --write-output "oracle-out/19-permissions-unknown.md" \
  -p "Strategist question #19
Reference: Unknown
Category: permissions
Horizon: Strategic
ROI: 0.48 (impact=0.8, confidence=0.3, effort=0.5)
Question: What authorization or permissions boundary is intended for routes and server functions, given no auth middleware or guards were located?
Rationale: No auth artifacts were found (expected src/server/auth/** or route guard checks), leaving access control undefined.
Smallest experiment today: Run ck --regex auth|permission|role src/server src/routes to confirm missing auth wiring.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "README.md" \
  -f "package.json" \
  -f "src/router.tsx"

# 20 — ROI=0.42 impact=0.7 confidence=0.3 effort=0.5 horizon=Strategic category=migrations reference=Unknown
oracle \
  --files-report \
  --write-output "oracle-out/20-migrations-unknown.md" \
  -p "Strategist question #20
Reference: Unknown
Category: migrations
Horizon: Strategic
ROI: 0.42 (impact=0.7, confidence=0.3, effort=0.5)
Question: What is the migration strategy for persisted data and session schemas, given no migration tooling was found?
Rationale: No migration artifacts were found (expected **/migrations/** or db/migrations), so schema evolution is unclear.
Smallest experiment today: Run ck --regex migration|migrate src to confirm absence of migration tooling.
Constraints: None
Non-goals: None

Answer format:
1) Direct answer (1–4 bullets, evidence-cited)
2) Risks/unknowns (bullets)
3) Next smallest concrete experiment (1 action) — may differ from the suggested one if you justify it
4) If evidence is insufficient, name the exact missing file/path pattern(s) to attach next." \
  -f "README.md" \
  -f "package.json" \
  -f "src/router.tsx"
```

---

## coverage check (must be satisfied)

*   contracts/interfaces: OK

*   invariants: OK

*   caching/state: OK

*   background jobs: OK

*   observability: OK

*   permissions: Missing (no auth middleware or guard artifacts found; expected src/server/auth/** or route guard checks)

*   migrations: Missing (no migration tooling found; expected **/migrations/** or db/migrations)

*   UX flows: OK

*   failure modes: OK

*   feature flags: OK
