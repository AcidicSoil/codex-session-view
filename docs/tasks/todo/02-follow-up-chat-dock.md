Context

* Need an explicit follow-up audit confirming that the Chat Dock regressions from `01-chat-dock-session-intelligence-regressions` stay fixed after recent refactors (shared context, history panel, Session Intelligence renderer, logger scroll).
* PMs want proof that General/Session Coach parity, repo-specific rule sourcing, and Session Intelligence workflows work for real sessions (multi-repo, multi-tab, persisted chats) before sign-off.
* Logger stability, telemetry on “Add to Chat” vs. actual sends, and documentation of remaining edge cases must be verified without introducing new regressions.

Success criteria

* Regression checklist covering Add to Chat, context persistence, rule switching, AI Analysis, history panel, and logger scroll is executed and documented with evidence.
* Automated tests (unit + e2e) fail if any previously fixed regression reappears; telemetry dashboards show Add-to-Chat success rate and AI Analysis crash rate ≤ agreed thresholds.
* Written verification report shared with stakeholders summarizing scenarios tested, data sources, and any residual risks/open bugs.

Deliverables

* Verification playbook (markdown) detailing scenarios, expected vs. actual results, and evidence links/screenshots.
* Automated test additions/updates (Playwright + Vitest) targeting Add to Chat broadcast, thread selection/history, Session Intelligence render, and logger scrolling.
* Telemetry/metrics wiring (Add-to-Chat success, AI Analysis completion, logger overflow) plus dashboard snapshots or SQL queries showing healthy baselines.
* Risk/issue log capturing any deviations or newly observed bugs.

Approach

1. **Scope alignment:** Review `01-chat-dock-session-intelligence-regressions` and recent commits to list exact behaviors to verify (tabs, context, repo rules, history, AI Analysis, logger). Align with PM on baseline telemetry thresholds.
2. **Test harness updates:** Extend existing Vitest/Playwright suites with cases for dual-tab Add-to-Chat propagation, thread persistence, repo rule switching, Session Intelligence rendering, and logger scroll containment.
3. **Manual verification run:** Execute the regression checklist in staging (multi-repo sessions, cross-tab switching, clearing chats) capturing screenshots/logs; file bugs for any deviations.
4. **Telemetry instrumentation:** Ensure Add-to-Chat, AI Analysis, and logger scroll metrics are emitted; configure dashboards/alerts and backfill data to confirm crash rate ≤ target.
5. **Reporting:** Compile results + evidence into a follow-up report (include test run IDs, telemetry snapshots) and share via docs/tasks + stakeholder channel.

Risks / unknowns

* Telemetry plumbing may require access to analytics pipelines not currently exposed in dev envs.
* Multi-repo verification depends on availability of representative session assets; missing data could block realistic testing.
* Playwright coverage might be flaky unless we stabilize mock data or seed deterministic sessions.

Testing & validation

* Vitest: ChatDockPanel unit tests for thread management, renderer stability, repo labels.
* Playwright/E2E: Add-to-Chat from Session Explorer + Timeline, tab toggles, history panel selection, Session Intelligence Summary/Hook Discovery, logger scrolling.
* Telemetry dashboards/queries verifying Add-to-Chat success rate, AI Analysis completion rate, logger scroll event counts.

Rollback / escape hatch

* Keep previous regression fixes behind feature flags; if verification uncovers blockers, disable new telemetry/reporting surfaces while leaving chat fixes intact. Document outstanding gaps and next steps instead of partial sign-off.

Owner/Date

* Codex Assistant / 2025-12-16
