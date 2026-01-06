## 1) Direct answer (1–4 bullets, evidence-cited)

* The intended authorization boundary appears to be **“trusted local user / local network only” rather than user/role-based auth**: the README repeatedly frames the app as a *local-first workbench* (“Designed to run locally, accessing your project's file system”) and points users to `http://localhost:3000`. Evidence: `README.md` sections **Local-First Architecture** and **Development** (“available at `http://localhost:3000`”).
* The runtime behavior also suggests an **“exposure prevention” boundary (bind to loopback)** rather than middleware auth: `package.json`’s `preview` script explicitly pins `--host 127.0.0.1`, which is consistent with “only reachable from the same machine.” Evidence: `package.json` script `"preview": "vite preview --host 127.0.0.1 --port 4173"`.
* There is **no visible per-request principal / session identity** in the routing layer shown: `src/router.tsx` only injects a `queryClient` into router context and has no auth/session object or guard wiring. Evidence: `src/router.tsx` `context: { queryClient }` and no other context fields.
* Example “API-ish” route code shown earlier in this project (e.g., SSE watcher route) similarly shows **protocol mechanics but no auth check** (no token/header validation, no role/permission gate). Evidence: `src/routes/api/uploads/$uploadId.watch.ts` snippet defines SSE headers and keepalive behavior, but no guard is present in the shown portion.

## 2) Risks/unknowns (bullets)

* If the server is ever bound to **`0.0.0.0` / LAN** (or deployed), routes and server functions would be callable by any reachable client, because the observed boundary is “network reachability,” not authentication/authorization.
* Even on a single machine, **cross-origin attacks** can matter if endpoints accept ambient credentials or don’t validate Origin/CSRF semantics (especially for state-changing server functions or upload endpoints).
* It’s unclear whether there is an **implicit gate in Nitro/TanStack Start configuration** (e.g., a server plugin, request hook, or runtime env toggle) because those files were not included here.

## 3) Next smallest concrete experiment (1 action)

* Run a repo-wide search for *actual* request-gating primitives (not just the words “auth/role”):
  **`rg -n "(createServerOnlyFn\\(|server/function|src/routes/api|onRequest|eventHandler\\(|defineEventHandler\\(|middleware|csrf|origin|token|apiKey|authorization)" src`**
  This finds where server entrypoints exist and whether any centralized request hook/middleware enforces “local-only” or a shared secret.

## 4) If evidence is insufficient, exact missing file/path pattern(s) to attach next

Attach any of the following if they exist (or confirm they don’t):

* Server request hooks / middleware / Nitro plugins:
  `src/server/**/middleware*`, `src/server/**/hooks*`, `src/server/**/plugins*`, `server/**`, `nitro.config.*`, `src/server/nitro*`
* TanStack Start server entrypoints / handlers:
  `src/server/**/*.server.ts`, `src/server/**/index*`, `.output/server/**` (build output not ideal, but can reveal hooks)
* Any “deployment / binding / exposure” config:
  `vite.config.*`, `tools/vercel-dev.mjs`, any `*.config.*` controlling host binding, proxies, or headers
* Any auth-like modules (even if not named auth):
  `src/server/**/session*`, `src/server/**/identity*`, `src/server/**/access*`, `src/server/**/guard*`, `src/lib/**/(auth|acl|rbac|permissions)*`
