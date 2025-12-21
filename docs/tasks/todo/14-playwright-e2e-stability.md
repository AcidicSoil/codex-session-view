Context

- Playwright E2E suite currently shows 35 cascading failures driven by unstable dev server startup, API contract drift, and stale UI locators.
- Server refuses or resets connections across browsers, `/api/chatbot/analyze` responds 422, selectors expect removed headings/test IDs, and readiness waits rely on `networkidle`.
- Logs route assertions rely on a synthetic error entry that is no longer recorded consistently, leading to deterministic failures.

Success criteria

- Playwright uses a single deterministic `webServer` with aligned `use.baseURL` on `127.0.0.1`, eliminating connection refusal/reset incidents.
- `/api/chatbot/analyze` test path succeeds with HTTP 200 via either payload or backend adjustment, matching validated schema.
- UI and upload tests rely on new explicit `data-testid` attributes and stable file-input or file-chooser hooks instead of brittle locators.
- No tests call `waitForLoadState('networkidle')`; readiness is element-gated and logs route assertions pass deterministically.

Deliverables

- Updated Playwright config (`playwright.config.ts`) and supporting scripts ensuring deterministic server lifecycle.
- Backend or test updates resolving `/api/chatbot/analyze` validation mismatch plus any shared types/fixtures.
- UI component updates adding required `data-testid` attributes and stable upload/log instrumentation.
- Revised Playwright tests covering selectors, upload flow, readiness waits, and logs assertions.
- Documentation updates (CHANGELOG, possibly README/testing guide) summarizing stability fixes.

Approach

1) Inspect `playwright.config.ts`, current start scripts, and `test_e2e-failing.log` to catalog failure clusters and confirm command + ports.
2) Implement Playwright `webServer` command that builds/starts the app once (prefer `pnpm dev -- --port 3001` or production build) with `reuseExistingServer` as needed; align `use.baseURL` to `http://127.0.0.1:3001` and ensure health-check readiness.
3) Decide `/api/chatbot/analyze` fix path (payload vs backend) based on validation schema; update server handler/tests/fixtures accordingly and add regression coverage.
4) Instrument UI with required `data-testid` attributes (hero title, viewer title, upload dropzone/input, chat textarea(s), mode toggles, log container) and ensure file inputs are accessible for tests (refactor to persistent `<input type="file">` or handle Playwright file chooser flow).
5) Update Playwright specs to use new test IDs, remove `networkidle` waits in favor of targeted locator assertions, and stabilize file upload + logs route flows.
6) Run targeted and full E2E suites across browsers; address residual flakes, update docs/CHANGELOG, and ensure CI scripts align with new workflow.

Risks / unknowns

- Unclear start command or environment variables needed for deterministic server boot; may require additional build steps or background services.
- `/api/chatbot/analyze` validation expectations may depend on backend data/state not available in tests; fixture seeding might be required.
- Adding test IDs could clash with existing styling or SSR constraints; must ensure no regressions in UI/DOM semantics.
- Logs route behavior might depend on runtime logging pipeline; capturing `window.error` may require hooking global listeners and ensuring cleanup.

Testing & validation

- `pnpm lint` and `pnpm build` to keep repo healthy per project rules.
- Targeted Playwright runs for affected specs (upload, analyze API, logs route) followed by full `pnpm e2e` across Chromium, Firefox, WebKit with retries disabled to prove determinism.
- Any relevant unit/integration tests for API handlers or logging utilities.

Rollback / escape hatch

- Keep previous Playwright config + test selectors retrievable via git; if new server boot path fails in CI, fall back to original scripts temporarily while investigating.

Owner/Date

- Codex / 2025-12-19
