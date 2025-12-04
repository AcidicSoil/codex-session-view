Context
- Production/preview deploys succeed in CI but never serve the viewer because Nitro defaults to the `node-server` preset, emitting `.output` artifacts that hosts ignore.
- We are standardizing on Vercel for preview and prod, yet our build still lacks the Vercel adapter output (`.vercel/output`) that Vercel expects.
- Deployment runbooks omit Nitro adapter guidance, so engineers keep redeploying the same misconfigured build and lose insight into required env vars.

Success criteria
- `pnpm run build` emits `.vercel/output/**` when `DEPLOY_TARGET=vercel` or `VERCEL=1` is set, while defaulting to `.output` for local Node.
- Preview/prod Vercel deploys render the `/viewer` route successfully (verified via `vercel deploy --prebuilt`).
- README + ops docs clearly document how to run local builds, how to set `DEPLOY_TARGET=vercel`, and how Vercel handles env vars + serverless entry.
- Automated smoke (Playwright prod parity + Vercel dry run) passes against the adapter-backed server.

Deliverables
- Updated build/runtime configuration (likely `nitro.config.ts`, env-driven preset switch, optional `vercel.json`/`netlify.toml`).
- Documentation updates covering deployment workflow and env requirements.
- Adjusted tests or scripts (`pnpm test:e2e:prod`) aligned with the new adapter outputs.

Approach
1) Lock in Vercel as the canonical hosting target; document any remaining self-hosted Node usage limited to local testing.
2) Add `nitro.config.ts` (or enhance `nitro()` plugin config) to switch presets via a single env contract: default `node-server`, but use `vercel` whenever `process.env.VERCEL === '1'` or `DEPLOY_TARGET=vercel` is supplied.
3) Add/verify `vercel.json` (if needed) and update CI to run `DEPLOY_TARGET=vercel pnpm run build`, ensuring `.vercel/output/config.json`, `functions`, and `static` directories exist.
4) Ensure `pnpm preview`/`pnpm start` still function locally by keeping the node preset when no env override is set, and document how to simulate Vercel locally (`DEPLOY_TARGET=vercel pnpm run build && pnpm run preview`).
5) Update README, `docs/ops/session-coach-rollout.md`, `docs/tasks/todo/05-playwright-prod-parity.md`, and add a short `docs/ops/deployment-vercel.md` covering env vars, secrets, and CLI workflows.
6) Re-run `pnpm run build && pnpm run preview`, `DEPLOY_TARGET=vercel pnpm run build`, `vercel deploy --prebuilt --dry-run`, and `pnpm test:e2e:prod` to verify parity.

Risks / unknowns
- Actual hosting provider(s) might require additional filesystem layout (functions folders, serverless entrypoints) beyond preset flips.
- Feature flags/env vars for Session Coach could differ per environment; mismanaging them could break prod flows.
- Adapter switching might introduce large artifacts or build time regressions.

Testing & validation
- `pnpm run build && pnpm run preview` for local regression coverage.
- `DEPLOY_TARGET=vercel pnpm run build && vercel deploy --prebuilt --dry-run` with log capture for CI parity.
- `pnpm run test:e2e:prod` (Chromium) against the adapter-based build.

Rollback / escape hatch
- Keep the existing `node .output/server/index.mjs` path behind an env flag so we can revert to self-hosted Node quickly if the adapter path fails.

Owner/Date
- Codex / 2025-12-04
