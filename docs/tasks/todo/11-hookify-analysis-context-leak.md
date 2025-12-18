Context
- Hookify analysis inside Session Intelligence currently surfaces rules/issues tied to files (e.g., `ChatDock.tsx`) that are not part of the repository loaded in the active session, eroding user trust.
- Server loader `loadSessionSnapshot` (`src/server/lib/chatbotData.ts`) still returns the static `tests/fixtures/session-large.json` for every sessionId, so Hook Discovery always analyzes that bundled fixture instead of the active repo/session asset.
- The UI (`SessionAnalysisPopouts`) keeps prior Hook Discovery markdown in component state even after the operator switches sessions/repos, so stale fixture-based output keeps rendering.
- Users rely on Hook Discovery to audit their own codebases, so cross-repo references make results unusable and may expose unrelated private info.

Success criteria
- Analysis results only mention files/components that exist within the currently loaded repository/session context because the backend loads that session’s real JSON/JSONL asset rather than the shared fixture.
- Switching the loaded repo/session and re-running analysis yields findings exclusively tied to the new repo with no stale carryover, and the UI clears previous Hook Discovery output whenever the bound sessionId or repo binding changes.
- Telemetry/logging for `/api/chatbot/analyze` events includes the resolved repo root/asset id so we can audit which context was analyzed.
- All automated tests and lint checks pass; new coverage guards against regressions.

Deliverables
- Updated backend/service logic ensuring Hookify analysis receives and enforces the active session repo scope (including reading the current session asset instead of the static fixture and isolating caches per session).
- UI updates that bind Hook Discovery output to the active session/repo and purge stale results prior to rendering mismatched findings.
- Tests (unit/integration/e2e) validating repo-specific scoping plus telemetry assertions showing repo metadata on analysis runs.
- Documentation updates: CHANGELOG entry, Session Intelligence spec notes, and any runbooks describing the corrected flow and logging expectations.

Approach
1) Replace the stubbed `loadSessionSnapshot` implementation so it reads the actual session upload that matches the bound repo/session (via `sessionRepoBindings` + `sessionUploads`). Preserve caching, but key it by upload id/lastModified to avoid global fixture reuse.
2) Tighten `/api/chatbot/analyze`: require a repo binding (fail fast or surface actionable messaging when missing), pass the resolved repo root + asset metadata into `buildChatContext`, and annotate logs/telemetry with `repoRoot`, `assetPath`, and `sessionUploadId`. Ensure caches (`rulesCache`, `cachedSnapshots`) are segregated by session+repo.
3) Update Session Intelligence UI (`SessionAnalysisPopouts`, Coach context) so Hook Discovery results are tagged with the sessionId/repo metadata from the response. Clear prior results when the active session/repo binding changes or while a new analysis is running; optionally show a placeholder until the server confirms the matching repo metadata.
4) Expand automated coverage: unit tests for the new snapshot loader + caching, integration tests for `analyzeChatFromPayload` verifying repo scoping, and a Playwright scenario that switches between two repo sessions and confirms Hook Discovery output changes accordingly.
5) Document the behavior change (CHANGELOG, docs) and run `pnpm lint`, component/unit suites, and updated e2e flows before handoff.

Risks / unknowns
- Current snapshot loader doesn’t yet expose real session content; reworking it means defining how/where JSONL assets are stored and streamed (session uploads vs. live watchers).
- Snapshot sizes could be large; need to enforce limits or streaming reads so `buildChatContext` stays performant even when loading real session files.
- `sessionRepoBindings` might be unset for some sessions; need UX and server-side fallbacks (e.g., show actionable error states) rather than silently analyzing the wrong repo.
- Lack of telemetry today could make validation harder; may require schema changes to log repo IDs.

Testing & validation
- Unit tests for the snapshot loader + cache (feeding different session uploads) and for analysis request builders enforcing repo/session IDs.
- Integration/e2e test covering: load repo A, run analysis, switch to repo B, run analysis → results reference only repo B.
- Regression pass on Session Intelligence modal interactions plus `pnpm lint`, component/unit suites, and existing e2e flows touching Hook Discovery.

Rollback / escape hatch
- Revert service + UI changes to previous commit if regressions surface; maintain ability to temporarily disable Hookify analysis per repo via feature flag if needed during rollout.

Owner/Date
- Codex / 2025-12-18
