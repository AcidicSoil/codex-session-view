Context
- Playwright suites drifted from the current TanStack Start router/layout hierarchy, leaving gaps for new viewer and chatbot flows (Session Coach + General Chat) introduced in docs/next-task-plan.md.
- Production build reportedly diverges from dev (env vars, adapter/server fn wiring, asset paths, feature-flag gating), preventing prod-like validation of the chatbot stack.
- Need cohesive end-to-end coverage plus a stable production runtime so QA can trust outcomes before launch.

Success criteria
- Playwright tests cover viewer entry, Session Coach + General Chat flows (send, reset, model select, misalignment UI, summary/commit, evidence) aligned with latest routes.
- Playwright fixtures/utilities updated for TanStack Start structure; suites run green in CI against dev server and the Vercel-targeted build (`DEPLOY_TARGET=vercel pnpm run build`, `vercel deploy --prebuilt`).
- Production server build (Nitro Vercel preset) starts successfully with correct env wiring; viewer + chatbot features function identically to dev.
- Documented checklists for env configuration + feature flags to keep prod parity.

Deliverables
- Rebuilt Playwright specs + fixtures located under `e2e/` (or new hierarchy) reflecting new flows.
- Production runtime fixes: config changes, adapter updates, env/doc updates ensuring `DEPLOY_TARGET=vercel pnpm run build` + `vercel deploy --prebuilt` serves full viewer/chatbot experience.
- Supporting scripts/docs (README/ops) describing how to run e2e against prod build and required env vars/flags.
- Optional monitoring or logging adjustments if needed to debug prod issues.

Approach
1) Audit existing Playwright specs/fixtures; map current TanStack Start routes and viewer entry points, updating test hooks + selectors.
2) Implement end-to-end flows: Session Coach and General Chat (send, streaming assertions, new chat reset, model selector, misalignment banner/timeline, summary/commit popouts, evidence surfaces).
3) Extend fixtures to seed chat/session data, stub providers when necessary, and support model selection toggles; ensure deterministic data for evidence/misalignment.
4) Align CI config + scripts to run both `pnpm test:e2e` (dev server) and `pnpm test:e2e:prod` (against the Vercel-targeted build) with documented env vars/feature flags.
5) Diagnose production runtime failures (env, adapter, server functions, asset paths, feature-flag handling); patch code/config until viewer/chatbot runs identically in the Vercel build output.
6) Add documentation/checklists for env setup, secrets, feature flags, and how to validate new flows in prod-like environment.
7) Land tests + runtime fixes together to keep parity, ensuring flaky cases are stabilized via retries or better waits.

Risks / unknowns
- Real LLM providers may be unavailable in CI/prod; need reliable mocks or fallback endpoints without masking bugs.
- Production adapter differences (Edge vs Node) might expose SSR/hydration issues not reproducible locally.
- Feature flags or env secrets may differ per deploy target; unspecified defaults could break prod start.
- Streaming assertions in Playwright can be flaky if not synchronized carefully.

- Run Playwright suites locally against dev (`pnpm playwright test`) and the Vercel build (`DEPLOY_TARGET=vercel pnpm run build` + `pnpm test:e2e:prod`).
- Optionally run smoke tests in CI container with production-like envs.
- Verify manual prod startup referencing new docs to ensure instructions are complete.

Rollback / escape hatch
- Keep ability to skip new specs via tagged `describe.skip` or feature flag if blocking release; maintain previous server config behind env toggles to revert quickly.

Owner/Date
- Codex / 2025-11-26
