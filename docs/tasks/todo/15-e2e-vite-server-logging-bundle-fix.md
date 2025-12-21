Context
- Playwright `pnpm test:e2e` fails during Vite build because server-only modules (node builtins) are pulled into the browser bundle.
- The shared logger imports a server function at module scope, causing Vite to externalize Node builtins and eventually crash in the client build.
- Goal: enforce clean server/client boundaries for logging so browser builds succeed without losing logging features.

Success criteria
- `pnpm test:e2e` completes without Vite build failures or Node builtin externalization errors.
- Client bundles contain no `node:` imports from logging-related modules.
- Browser logging still records entries server-side and console logging remains intact in both environments.

Deliverables
- Code: logging boundary refactor (likely `src/lib/logger.ts` and any new helper files).
- Tests: update/add a build or e2e guard if needed (kept minimal).
- Docs: update logging/telemetry section in `README.md` with server/client boundary note.

Approach
1) Locate all client-side imports of `~/lib/logger` and confirm which pathways are used in browser vs server contexts.
2) Refactor `src/lib/logger.ts` to remove top-level imports of server-only modules; use TanStack Start environment helpers (`createIsomorphicFn`/`createServerOnlyFn`) or split into `logger.client.ts` + `logger.server.ts` with a safe shared facade.
3) Ensure browser logging uses a client-only function that lazily imports the server function (`~/server/function/browserLogs`) only on the client side.
4) Keep server-only file append logic isolated to server-only execution to avoid bundling Node builtins into client output.
5) Update `README.md` logging section to describe the server/client execution boundary and any configuration requirements.

Risks / unknowns
- Other client modules may import `~/server/*` at module scope, causing similar bundling issues.
- Logger refactor must preserve behavior for both SSR and client logging (no regressions in telemetry).
- Potential differences in TanStack Start execution boundaries across environments (dev vs build).

Testing & validation
- `pnpm test:e2e` (primary regression gate).
- `pnpm build` to confirm client bundle excludes Node builtins.
- Spot-check browser log ingestion path (manual or minimal automated check if existing test coverage allows).

Rollback / escape hatch
- Revert to previous logger implementation if new boundary logic breaks logging, but only after isolating a correct server-only wrapper.

Owner/Date
- codex / 2025-12-21
