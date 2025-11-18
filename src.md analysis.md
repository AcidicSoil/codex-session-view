# rules-broken

## src/** */ analysis

1. **Overview**
    The code in `src.md` spans shared libs (`src/lib`), UI components (`src/components/ui`, `src/components/viewer`), hooks (`src/hooks`), and server functions (`src/server/function`). The governing rules are the root AGENTS for data placement and effects, the `src/AGENTS.md` environment + TanStack Query/server function guidance, and `src/server/function/AGENTS.md` for server-only logic. Overall alignment is high for TanStack server function usage and basic client/server separation, mixed for hydration/environment safety, and low for the “collections over ad-hoc storage” rule and the “don’t fetch/derive app state in useEffect” family of rules. The main issues are repeated ad-hoc local/session storage usage, environment-unsafe hooks, and missing cache/router invalidation after server-side mutations.

* * *

2. **Rule-by-Rule Alignment**

### Rule: “Do server work on the server via TanStack Start server functions; validate input with `.inputValidator`; after mutations call `router.invalidate()` / `queryClient.invalidateQueries()`.”

**Status:** Partially Compliant

**Evidence:**

* `src/lib/theme.ts` uses `createServerFn` for both reading and writing the theme cookie, and uses `.inputValidator` for `setTheme`. This correctly confines cookie access to the server and matches the documented pattern.

* `src/server/function/sessionStore.ts` uses `createServerFn({ method: 'POST' })`, validates input with Zod via `.inputValidator`, and then uses Node `fs` and `path` only inside the handler, which is exactly the intended server-only logic pattern.

* `src/server/function/browserLogs.ts` similarly wraps filesystem access and environment-dependent defaults (`process.env`) inside a `createServerFn` handler.

**Impact:**
Server-only concerns (cookies, filesystem, environment) are correctly isolated into server functions, preventing Node APIs from leaking into client bundles and aligning with the core server-function idioms. However, none of these mutations (theme change, session file persistence) trigger `router.invalidate()` or query invalidation, so any loader/query that reflects these resources would not be automatically refreshed, leaving a gap relative to the prescribed “mutate → invalidate” pattern.

* * *

### Rule: “Use TanStack Server Functions for server-only logic callable from anywhere; top-level `createServerFn` with `.inputValidator` and `.handler`, may access env, cookies, Node modules.” agents-nested-example\_instructa…

**Status:** Compliant

**Evidence:**

* `src/server/function/sessionStore.ts` defines `persistSessionFile` at module top level using `createServerFn({ method: 'POST' })`, validates input with `.inputValidator` and Zod, then performs directory creation and file writes with lazily-imported `node:fs/promises` and `node:path`, including environment-based home directory resolution.

* `src/server/function/browserLogs.ts` defines a `createServerFn` (partial snippet) that delegates all work to `readBrowserLogSnapshot`, which uses Node modules and environment variables but never runs outside the server function context.

* `src/lib/theme.ts` uses `createServerFn` for cookie-oriented theme access; while not in `src/server/function`, it still respects the top-level server-function pattern.

**Impact:**
This is structurally aligned with the governance: server-only code paths are clean, testable, and safe from client execution, and validation is correctly centralized in `.inputValidator`. The assistant followed the server-function rules closely and systematically.

* * *

### Rule: “Don’t fetch or derive app state in `useEffect`; fetch on navigation in route loaders; reserve effects for real external effects only. Local-only prefs/cross-tab → localStorage collection (no effects).”

**Status:** Non-Compliant

**Evidence:**

* The `useFileLoader` hook (bottom of the snippet returning `{ state, progress, start, reset, persist, setPersist, hydrated }`) uses several `useEffect` blocks to initialize from `localStorage`, subscribe to `storage` events, and persist snapshots back to `localStorage`. Although these effects are guarded with `typeof window === 'undefined'` and target an external system, they effectively define and maintain core application state (parsed events and meta) entirely in effects rather than via loaders or collections.

* `src/hooks/useSessionStorage.ts` derives state from `sessionStorage` via a `useState` initializer and persists it with `React.useEffect`, i.e., both read and write of persisted app/session state are handled by an ad-hoc hook rather than the prescribed localStorage-collection pattern.

**Impact:**
Core state (event timelines, persisted user/session state) is managed outside route loaders and TanStack DB/localStorage collections. This violates the “collections not effects” directive for persistent local-only data and the “don’t derive app state in effects” ethos. It leads to duplicated persistence logic, complicates SSR/SEO (initial HTML cannot reflect the persisted snapshot), and makes hydration behavior dependent on client-only effects instead of deterministic loader/DB state.

* * *

### Rule: “Reserve effects for external systems; compute derived state during render; treat external store sync via `useSyncExternalStore` and understand hydration impact.”

**Status:** Partially Compliant

**Evidence:**

* In `useFileLoader`, all `useEffect` calls are tied to genuine external systems: `window.localStorage`, the `storage` event, and a persist-pref toggle, each guarded with `typeof window === 'undefined'` checks, so they do not run on the server at all.

* Multiple UI components (`border-beam`, `toggle-group`, `popover`, etc.) are declared with `"use client"` and limit effects to animation and DOM-like concerns, aligning with the “effects for external systems only” guidance.

* In contrast, `useSessionStorage` intertwines external storage and app state derivation by reading from `sessionStorage` in a `useState` initializer, which runs during render and not as a dedicated external effect.

**Impact:**
The assistant understands the basic “external-only effects” rule and applies it to complex hooks like `useFileLoader` and to UI components. However, inconsistency in `useSessionStorage` shows that the line between “derived app state” and “external effect” is not systematically enforced: storage reads happen in render, which is explicitly discouraged and makes SSR behavior fragile.

* * *

### Rule: “Environment and hydration safety: use `ClientOnly` or environment-aware helpers (`createIsomorphicFn`, `createClientOnlyFn`) to avoid SSR/hydration issues when accessing browser APIs (Intl, Date, window, storage).” agents-nested-example\_instructa…

**Status:** Partially Compliant

**Evidence:**

* `useFileLoader` checks `typeof window === 'undefined'` before using `window.localStorage`, thereby preventing server crashes and aligning with the “guard browser APIs on the server” guidance, even though it doesn’t explicitly use `ClientOnly` or the provided environment helpers.

* UI components that clearly depend on browser capabilities are marked `"use client"`, ensuring they are client-only and avoiding SSR execution entirely (`border-beam`, `toggle-group`, etc.).

* `useSessionStorage` directly calls `sessionStorage.getItem` in a `useState` initializer with no environment guard, and the hook file itself is not marked client-only. If imported into a server-rendered route component, this will throw at render time and contradicts the environment rules that call out precisely this class of mismatch.

**Impact:**
Most client-heavy pieces are reasonably safe, but the environment model is inconsistent: some browser-bound utilities are guarded or client-only, while others (notably `useSessionStorage`) are environment-unsafe. This pattern creates “footgun” hooks that assistants can reuse in SSR contexts, resulting in runtime failures or subtle hydration problems that the AGENTS explicitly try to prevent.

* * *

### Rule: “Use TanStack Query for server state (queries in `lib/{resource}/queries.ts` with `queryOptions`; mutations invalidate specific query keys).” agents-nested-example\_instructa…

**Status:** Non-Compliant (by omission in observed code)

**Evidence:**

* The AGENTS prescribe defining queries in `lib/{resource}/queries.ts` via `queryOptions` and consuming them via `useQuery`/`useSuspenseQuery`, with mutations wired through `useMutation` and specific `queryClient.invalidateQueries` calls.

* In the provided snippets, server functions such as `persistSessionFile` and the theme APIs are not paired with any query definitions or invalidation routines; the UI snippets (including the “API Test” section and todo-related scaffolding hints) show direct server function calls rather than Query patterns.

**Impact:**
Server state flows are handled directly through server functions and ad-hoc UI wiring instead of the prescribed Query layer. This bypasses the standardized caching, invalidation, and loading/error-state patterns that AGENTS define as canonical, making it harder to share server state consistently across the app and increasing the risk of stale or inconsistent data after mutations.

* * *

3. **Behavior Patterns of the Assistant/Agent**

* Consistently uses `createServerFn` and `.inputValidator` in server-side modules and encloses all Node-specific and env logic inside server functions, showing strong adherence to server-function rules.

* Regularly bypasses TanStack Query and DB/localStorage collections, favoring direct server-function invocation and custom local/session storage hooks for state and persistence instead of the prescribed collection/query patterns.

* Treats environment safety inconsistently: some browser APIs are carefully guarded (`useFileLoader`, `"use client"` components), while others (notably `useSessionStorage`) are used unguarded in render paths, contrary to the environment/hydration guidance.

* Uses `useEffect` primarily for external systems in complex hooks but still relies on effects and ad-hoc hooks for persistent app/session state, ignoring the “collections, not effects” directive for local-only and cross-tab data.

* * *

4. **Prioritized Remediation Plan (for the Assistant/Agent)**

5. Eliminate any hook that reads from `window`, `localStorage`, or `sessionStorage` during render (including `useState` initializers); add environment guards or confine those reads to client-only boundaries or effects that are never executed on the server.

6. Replace ad-hoc persistence logic in `useFileLoader` and `useSessionStorage` with TanStack DB/localStorage collections or equivalent standardized collection patterns, so persistent local-only and cross-tab data flows through collections instead of raw storage calls in hooks.

7. Introduce TanStack Query around server functions that expose domain data (e.g., theme, sessions, logs) and define `queryOptions` in `lib/{resource}/queries.ts`, wiring mutations to invalidate specific query keys rather than relying on ad-hoc refetch or no invalidation.

8. After any server function that mutates domain state, ensure the surrounding routes or queries call `router.invalidate()` and/or `queryClient.invalidateQueries()` as specified, so UI remains synchronized with server changes.

9. Treat any environment-sensitive utility (like `useSessionStorage` or Blob/stream helpers) as explicitly client-only by either wrapping their usage in `ClientOnly` or annotating their entire usage tree as client-only, preventing accidental import into SSR code paths.

10. Align new stateful features with the “effects only for external systems” rule by computing all derived app state during render or via loaders/queries, and restricting `useEffect` to I/O such as event listeners, analytics, and storage write-through.

* * *

5. **Optional: AGENTS.md Improvements**

* Clarifications: Explicitly call out that hooks which touch `window`, `localStorage`, or `sessionStorage` must either be (a) defined in client-only modules or (b) guard all browser usage with environment checks, and provide a small example of a compliant `useSessionStorage` that works safely with SSR.

* Granularity: Add a `src/hooks/AGENTS.md` that reiterates “no storage access at render; no app-state derivation in effects; local-only persistence must go through collections,” using concrete examples tailored to custom hooks, which would have prevented the current `useSessionStorage` pattern. agents-nested-example\_instructa…

* Examples: In the TanStack DB/local-only section, include a minimal snippet showing a localStorage-backed collection for simple preferences and a recommendation for how to handle larger local-only datasets like event timelines, so assistants do not default to bespoke localStorage + `useEffect` patterns for these cases.

---
