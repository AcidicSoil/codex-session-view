
1. **Overview**

The relevant governance comes from the root AGENTS.md (core loader/effects/data placement + TanStack DB rules), `src/AGENTS.md` (environment + TanStack Query rules), `src/routes/AGENTS.md` (server routes), and `src/server/function/AGENTS.md` (server functions). agents-nested-example\_instructa… Overall alignment is mixed-high: core data-loading and effects rules are followed well in the root route, main `(site)` routes, and the viewer route; server routes and server functions are implemented in the prescribed patterns; search-param usage in the viewer route is exemplary. The main structural gaps are: inconsistent adherence to the TanStack Query idioms (notably in `src/routes/logs.tsx`), lack of TanStack DB usage for server-synced domain data, and an unused server function (`getBrowserLogs`) that is not wired into the logs UI. routes The assistant generating this code clearly understood and applied many AGENTS rules for “happy path” features but fell back to more generic patterns for diagnostic/secondary flows.

* * *

2. **Rule-by-Rule Alignment**

### 2.1 Core Loader / Effects Rules (“don’t fetch or derive app state in useEffect”)

**Rule:** Fetch on navigation in route loaders; reserve effects for external systems; compute derived state in render; avoid useEffect for app state. agents-nested-example\_instructa…

* **Status:** Compliant for primary routes, Partially Compliant for `/logs`.

* **Evidence:**

  * `src/routes/__root.tsx` uses a route `loader` to get the theme (`getTheme()`) and consumes it via `Route.useLoaderData()` with no `useEffect`, matching the “loader + render” pattern. routes

  * `src/routes/(site)/index.tsx` seeds todos in the `loader` via `opts.context.queryClient.ensureQueryData(todosQueries.list())` and reads them with `useSuspenseQuery`, which is exactly the documented loader + Suspense idiom. routes

  * `src/routes/(site)/viewer/index.tsx` defines a `loader: () => discoverProjectAssets()`, then reads via `Route.useLoaderData()`, again loader-driven. All derived labels (`progressLabel`, `timelineContent`) are computed during render without effects. routes

  * `src/routes/(site)/docs.tsx` and `(site)/route.tsx` are purely presentational, with no fetching or effects. routes

  * `src/routes/logs.tsx` fetches logs with a `useQuery` `queryFn` calling `fetch('/__browser-echo/logs')` and no route loader. routes The data is needed for the route’s main content, so under the “needed at render → loader” checklist, this is a deviation from the preferred loader-based approach. agents-nested-example\_instructa…

* **Impact:**

  * In the main UX (home and viewer routes), data is available to SSR and can stream, avoiding mount-time spinners and aligning with hydration guidance.

  * For `/logs`, the page shows a client-side loading state and cannot SSR the initial logs snapshot, breaking the “fetch on navigation in loaders” pattern and reducing SSR usefulness for that route. There is no direct bug, but SSR/streaming value is lost.

### 2.2 Server Functions for Server Work

**Rule:** Do server work on the server via TanStack Start server functions; after mutations, invalidate router and/or TanStack Query. agents-nested-example\_instructa…

* **Status:** Largely Compliant, with one missed integration.

* **Evidence:**

  * `src/routes/__server.ts` defines `getBrowserLogs = createServerFn().handler(async () => readBrowserLogSnapshot())`, performing filesystem access (`readdir`, `readFile`) only on the server, which fits the server-function pattern. routes

  * `src/routes/(site)/viewer/index.tsx` imports `persistSessionFile` from `~/server/function/sessionStore` and calls it as a server function (`await persistSessionFile({ data: { filename: file.name, content } })`), then calls `router.invalidate()` to refresh loader data—exactly the “server fn → invalidate” recipe. routes

  * The todos flow imports `useCreateTodoMutation`, `useToggleTodoMutation`, and `useDeleteTodoMutation` from `~/lib/todos/queries`, implying server-first mutations encapsulated in query/mutation utilities rather than inline client server work. routes

  * `src/routes/logs.tsx` does not use the `getBrowserLogs` server function at all; instead it reads from `/__browser-echo/logs` over HTTP directly from the browser. routes

* **Impact:**

  * For viewer uploads and (likely) todos, server work is correctly isolated to server functions, with proper invalidation, preserving the isomorphic/RPC model and keeping server logic out of components.

  * For logs, the assistant created a server function but did not integrate it with the UI. This leaves dead/unused server-side logic and misses the opportunity to route logging through a typed server function, reducing consistency and observability.

### 2.3 Typed Search Params as State

**Rule:** Keep page/UI state in the URL via `validateSearch`, `Route.useSearch`, and `navigate`. agents-nested-example\_instructa…

* **Status:** Compliant where applicable.

* **Evidence:**

  * `src/routes/(site)/viewer/index.tsx` defines a `searchSchema` with Zod, plugs it into `validateSearch`, reads search with `Route.useSearch()`, and updates via `navigate({ search: (prev) => ({ ...prev, filters: sanitized }) })` and a similar pattern for `expanded`. routes This is exactly the “validateSearch → Route.useSearch → navigate({ search })” idiom. agents-nested-example\_instructa…

  * Other stateful routes (e.g., todos input, viewer local upload state) use `useState` for transient UI state that does not belong in the URL (current input text, eject/persist toggles). routes

* **Impact:**

  * The viewer’s filters and expansion state are fully shareable/bookmarkable and survive reloads consistently, matching the AGENTS’ expectations for “page/UI state that belongs in the URL.”

  * There is no evidence of state that clearly belongs in the URL being kept only in component state.

### 2.4 TanStack Query Rules

**Rule:** Define queries in `lib/{resource}/queries.ts` via `queryOptions`; use `useQuery`/`useSuspenseQuery` with those options; call server functions directly in `queryFn`; invalidate after mutations; handle loading/error states appropriately. agents-nested-example\_instructa…

* **Status:** Compliant for todos, Partially Compliant for logs.

* **Evidence:**

  * Todos: `src/routes/(site)/index.tsx` imports a queries module (`todosQueries` plus mutation hooks) from `~/lib/todos/queries` and uses `useSuspenseQuery(todosQueries.list())`, which strongly matches the recommended “queryOptions in lib + Suspense” pattern. routes The loader seeds the same query, aligning with the loader + query idiom.

  * Mutations for todos are delegated to hooks imported from the same queries module; by the AGENTS pattern, those hooks are expected to integrate server functions and query invalidation centrally, which is structurally correct even though their internal implementation is not shown. agents-nested-example\_instructa…

  * Logs: `src/routes/logs.tsx` uses `useQuery` inline with a literal config object and a `queryFn` that manually calls `fetch('/__browser-echo/logs')`. routes This ignores the “define in `lib/{resource}/queries.ts` using `queryOptions`” rule and also bypasses the existing `getBrowserLogs` server function instead of calling a server function from the query. agents-nested-example\_instructa…

  * Logs error handling is done by rendering a simple `<div>Error: {String(error)}</div>`, which is acceptable but does not follow the documented toast-based pattern; however that is stylistic rather than architectural. routes

* **Impact:**

  * For todos, the assistant has aligned with the project’s canonical TanStack Query structure, making it easy to reuse queries, centralize invalidation logic, and evolve the resource layer.

  * For logs, the inline `useQuery` creates a one-off pattern, scatters fetching logic into the route, and sidesteps the server-function abstraction. This makes logging behavior less consistent and harder to refactor (e.g., switching to a different log backend or adding caching).

### 2.5 Data Placement and TanStack DB Usage

**Rule:** Server-synced domain data should live in TanStack DB collections (usually fed by Query or a sync engine); ephemeral UI/session state goes to zustand or local-only collections; derived views are computed in render/live queries. agents-nested-example\_instructa…

* **Status:** Non-Compliant for TanStack DB usage; Compliant for avoiding misuse of UI stores.

* **Evidence:**

  * Across the provided code, there is no usage of TanStack DB collections, `createCollection`, or live queries. Domain-like data includes todos (clearly server-synced), viewer session metadata (persisted sessions in `~/.codex/sessions`), and browser log snapshots via server functions, all handled via plain TanStack Query + server functions or loaders. routes

  * Ephemeral UI state (theme is loader-based + context; new todo input, viewer loader state, “persist session” toggle, “ejecting” state) is correctly kept in component state or context rather than any global store, and there is no sign of mirroring server data into a local store like zustand.

* **Impact:**

  * The absence of TanStack DB violates a core architectural decision that “server-synced domain data → TanStack DB collections,” meaning the current implementation will not benefit from live queries, transactional merging, or DB-level write patterns described in AGENTS.

  * However, given the relatively small surface area shown, this manifests more as architectural drift than immediate bugs: state is still server-first via Query and server functions but does not leverage the prescribed DB layer, making later migration more costly.

### 2.6 Server Routes — TanStack Start

**Rule:** Server HTTP endpoints live in `./src/routes` and are defined via `createFileRoute` with a `server.handlers` map; one handler per resolved path; routing mirrors TanStack Router (dynamic `$id`, splats, etc.). agents-nested-example\_instructa…

* **Status:** Compliant.

* **Evidence:**

  * `src/routes/api/test.ts` defines `export const Route = createFileRoute('/api/test')({ server: { handlers: { GET, POST }}})` and both handlers return JSON via the `json` helper with appropriate status codes, exactly matching the RC1 route structure in AGENTS.

  * Other routes (`__root`, `(site)/index`, `(site)/docs`, `(site)/viewer`, `/logs`) use `createRootRouteWithContext` or `createFileRoute` without conflicting paths, respecting the “unique path rule” (no duplicate resolved paths like `users.ts` vs `users/index.ts`).

* **Impact:**

  * API routes are defined in the expected way, ensuring consistency with the router’s expectations and avoiding path conflicts. This part of the codebase is well-aligned with the server-route governance.

### 2.7 Server Function Implementation Details

**Rule:** Server functions should be defined with `createServerFn`, optionally use `.inputValidator`; operate only on the server; return primitives/JSON/Response; can be called from clients via the proxy; after mutations, use router/query invalidation. agents-nested-example\_instructa…

* **Status:** Compliant for shown usage.

* **Evidence:**

  * `src/routes/__server.ts` defines a server-only FS reader (`readBrowserLogSnapshot`) and then a server function `getBrowserLogs = createServerFn().handler(async () => readBrowserLogSnapshot())`, which returns a serializable snapshot type (`BrowserLogSnapshot`). routes No client-side access to `fs` appears in the code.

  * `persistSessionFile` is imported from `~/server/function/sessionStore` and called from the viewer route with a `{ data: { filename, content } }` payload, matching the documented `{ data, signal? }` convention for server functions. The call is inside an async callback and followed by `router.invalidate()`.

  * No server functions are invoked via deprecated `.validator()` or mis-shaped inputs.

* **Impact:**

  * Server-side behavior is correctly encapsulated, and the assistant respects the environment boundaries that server functions enforce. The main weakness is not the server-function implementations themselves, but the failure to consistently _use_ them from all relevant consumers (logs).

### 2.8 Environment / ClientOnly / Hydration Rules

**Rule:** Use `ClientOnly` or environment helpers when UI cannot be stably rendered on the server; avoid hydration mismatches from timezone, random, or client-only APIs; consider selective SSR where HTML cannot be stable. agents-nested-example\_instructa…

* **Status:** Compliant for visible patterns; some unassessed risk areas.

* **Evidence:**

  * Root route computes theme in a loader and uses `ThemeInitScript` + `ThemeProvider` with `initial` theme from loader, which matches the guidance to compute environment-dependent inputs once and hydrate them as initial state, mitigating hydration mismatch risk.

  * No components here explicitly use `window`, random IDs, or uncontrolled `Date.now()` during render; Suspense is used in `(site)/route.tsx` purely as a boundary around nested routes with a static fallback. routes

  * The import of `virtual:browser-echo` in `src/routes/logs.tsx` is the only environment-sensitive hook; the plugin presumably patches the browser environment. There is no explicit `ClientOnly` wrapper around the `/logs` UI, but no direct browser global (`window`) usage appears in the component itself. routes

* **Impact:**

  * Hydration is likely stable for the shown code paths. The absence of `ClientOnly` is acceptable because nothing obviously non-deterministic is rendered server-side.

  * If `virtual:browser-echo` injects behavior that only works in the browser, there is a latent risk of SSR build-time issues, but this is not directly visible from the snippet; AGENTS do not currently give explicit rules for virtual plugin imports.

### 2.9 Project Constraints (pnpm, aliases, file types)

**Rule:** Use pnpm; all route files are `.tsx`; use `~` alias; never touch `.env`; do not start dev server from the assistant; never create a local pnpm store. agents-nested-example\_instructa…

* **Status:** Compliant where observable.

* **Evidence:**

  * All route files shown under `src/routes` have `.tsx` extensions. routes

  * Imports like `import GradientOrb from '~/components/gradient-orb'` and `import { persistSessionFile } from '~/server/function/sessionStore'` use the `~` alias consistently. routes

  * No `.env` modification, package manager commands, or pnpm store changes appear in the code.

* **Impact:**

  * The assistant respects structural project constraints within the scope visible in these files.

* * *

3. **Behavior Patterns of the Assistant/Agent**

* Consistently uses route loaders plus TanStack Query for core user flows (todos, viewer) in line with the loader + Suspense pattern.

* Correctly delegates server-only concerns to server functions and uses `router.invalidate()` after mutations in at least one flow (viewer uploads).

* Implements typed search-param state exactly as prescribed in AGENTS for the viewer route.

* Regularly ignores the TanStack DB requirement for server-synced domain data and relies solely on TanStack Query + server functions.

* Falls back to ad-hoc, inline TanStack Query configs and direct `fetch` calls in secondary/diagnostic routes (logs), bypassing the `lib/{resource}/queries.ts` abstraction and an existing server function.

* Treats AGENTS rules as hard constraints for main routes but as looser guidelines for “example” or debug functionality.

* * *

4. **Prioritized Remediation Plan (for the Assistant/Agent)**

5. Route all data fetching needed at render time through route loaders, then hydrate via `useSuspenseQuery` or direct loader data reads; avoid standalone `useQuery` fetches for primary route content.

6. For the `/logs` route, define a dedicated `browserLogs` query in a `lib/logs/queries.ts` module that calls the `getBrowserLogs` server function, seed it in a loader, and consume it via `useSuspenseQuery`, instead of using inline `useQuery` with `fetch('/__browser-echo/logs')`.

7. Start placing server-synced domain data (todos, persisted sessions, log snapshots where appropriate) into TanStack DB collections, using `queryCollectionOptions` and live queries per AGENTS, rather than relying solely on raw TanStack Query caches.

8. After each mutation that changes server-synced data (todos, persisted sessions, any future log-management actions), always trigger `router.invalidate()` and/or `queryClient.invalidateQueries()` in the mutation handlers, centralizing this logic in the resource/queries layer.

9. Standardize TanStack Query usage so that all routes depend on resource-level `queryOptions` helpers in `lib/{resource}/queries.ts`, eliminating inline query configs in route components.

10. When adding new environment-sensitive or diagnostic features, continue to keep environment-specific logic in server functions or dedicated client-only wrappers and ensure any virtual imports (like `virtual:browser-echo`) do not accidentally break SSR or violate environment boundaries.

* * *

5. **Optional: AGENTS.md Improvements**

* **Clarifications:** Explicitly scope the TanStack DB rule to “long-lived, multi-user server-synced domain data” and call out that narrow, debug-only or local-filesystem utilities (like dev-time session viewers or raw log readers) may use plain TanStack Query + server functions without DB when justified. This would better explain why small examples sometimes omit DB. agents-nested-example\_instructa…

* **Clarifications:** In the TanStack Query rules, add a short note about “diagnostic/utility routes” clarifying whether they are still required to use `lib/{resource}/queries.ts` helpers or may define inline queries for quick demos, so assistants do not flip between styles.

* **Granularity:** Introduce a nested `src/routes/logs/AGENTS.md` (or similar) specifying the intended source of truth for browser logs (e.g., `getBrowserLogs` server function vs. direct plugin endpoint) and any polling/refresh constraints; this would prevent assistants from inventing their own fetch endpoints.

* **Examples:** Add a focused example under the server-function section showing a server-function-backed “logs” query (`createServerFn` + `useSuspenseQuery` + loader seeding) to encode the pattern as canonical for monitoring/diagnostic data, not only for CRUD domain data.

---

## You asked

which file were you given for this analysis?

---

## ChatGPT Replied

You provided two files: an AGENTS governance file (`agents-nested-example_instructa-starter-min.md`, containing the hierarchical AGENTS.md content) and a routes/code file (`routes.md`, containing the `src/routes` tree and route implementations).

---
