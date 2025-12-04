# Vercel Deployment Playbook

Standard preview and production environments run on Vercel. Follow this checklist whenever you ship a new build or debug a deployment failure.

## Build pipeline

1. Install dependencies: `pnpm install`.
2. Build with the Vercel preset so Nitro emits `.vercel/output/**`:

   ```bash
   DEPLOY_TARGET=vercel pnpm run build
   # Windows (PowerShell): $Env:DEPLOY_TARGET="vercel"; pnpm run build
   # Windows (cmd.exe): set DEPLOY_TARGET=vercel && pnpm run build
   ```

   Vercel’s CI already sets `VERCEL=1`, so the preset switch activates automatically there.

3. The build artifacts live in `.vercel/output/` and can be inspected before deploying.

## CLI flows

- Preview deploy: `vercel deploy --prebuilt`
- Production deploy: `vercel deploy --prebuilt --prod`
- Dry-run smoke: `vercel deploy --prebuilt --dry-run` (captures routing errors without publishing)

The CLI reuses the last `DEPLOY_TARGET` build. Re-run the build if you change code or env vars.

## Env vars & secrets

- Mirror everything defined in `.env.example` inside the Vercel project dashboard (OpenAI/Gemini keys, `SESSION_COACH_ENABLED`, etc.).
- Never store secrets in `vercel.json`—use Vercel’s encrypted env vars and link them to Preview + Production environments.
- When adding a new secret, document it in the runbook and gate risky features with flags so rollbacks stay cheap.

## CI / automation notes

- CI jobs that simulate a Vercel deploy should run `DEPLOY_TARGET=vercel pnpm run build` followed by `vercel deploy --prebuilt --dry-run` and `pnpm run test:e2e:prod`.
- Keep the fallback `pnpm run build && pnpm run preview` around for local debugging, but don’t rely on `.output/` for deploys.

## Rollback

- Use `vercel rollback <deployment-id>` to revert to a known-good deployment.
- If the Nitro preset misbehaves, temporarily redeploy by setting `DEPLOY_TARGET=` (empty) and serving via `pnpm run start`, but document the outage and fix the preset immediately.
