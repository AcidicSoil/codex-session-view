
1. **Overview**
    The relevant governance for `src/hooks/useFileLoader.ts` and `src/hooks/useSessionStorage.ts` is the root `AGENTS.md` (core React/effects/data-placement rules) and `src/AGENTS.md` (environment, ClientOnly, and hydration rules). agents-nested-example\_instructa… Overall alignment is mixed: the hooks respect some project constraints (alias imports, client-only use of `window` in effects) but deviate materially from the “don’t fetch or derive app state in useEffect”, “local-only prefs/cross-tab → localStorage collection (no effects)”, and “never touch storage during SSR” rules. agents-nested-example\_instructa… The largest structural issues are unsafe direct access to `sessionStorage` during render/initialization and hand-rolled localStorage/sessionStorage effects where a local-storage collection abstraction is mandated. The assistant/agent that produced this code appears to partially internalize the environment and effects guidance but treat the storage and collections rules as soft recommendations instead of hard constraints.

2. **Rule-by-Rule Alignment**

### Rule: “Don’t fetch or derive app state in useEffect; reserve effects for real external effects only” agents-nested-example\_instructa…

**Status:** Partially Compliant
**Evidence:** In `useFileLoader`, multiple `useEffect` hooks interact with `window.localStorage` to hydrate state from a snapshot, persist snapshots, and sync across tabs, e.g. the hydration effect that reads `STORAGE_PREF_KEY` and `STORAGE_KEY` and then dispatches `hydrate` into the reducer, and the persistence effect that serializes `meta`/`events` into localStorage when `state.phase !== 'parsing'`. hooks These effects are doing more than “wiring” external systems; they are the primary mechanism by which the hook derives its internal app state from storage. In contrast, the storage event listener effect (`window.addEventListener('storage', handler)`) is closer to the allowed “DOM/listeners/widgets → small useEffect/useLayoutEffect” pattern. agents-nested-example\_instructa… `useSessionStorage` is closer to the intended pattern for effects (it uses an effect only to write to `sessionStorage` as a side effect), but it still participates in the broader “app state derived from storage” pattern when combined with the storage read during initialization. hooks
**Impact:** Deriving hook state from storage primarily inside effects increases the likelihood of hydration-time divergence between server-rendered and client-restored state, and it undermines the explicit rule that derived state should be computed in render while effects are reserved for true external systems. It also makes it harder to reason about when app state becomes valid, since the reducer’s state transitions depend on asynchronous effects rather than purely on user/file input and loader/server-driven data.

### Rule: “Local-only prefs/cross-tab → localStorage collection (no effects)” agents-nested-example\_instructa…

**Status:** Non-Compliant
**Evidence:** The root AGENTS explicitly calls out local-only preferences and cross-tab storage synchronization as a case that should be handled via a “localStorage collection (no effects)” rather than custom `useEffect` logic. agents-nested-example\_instructa… `useFileLoader` implements exactly this domain—persisting a session snapshot (`meta`, `events`) and syncing it across tabs—by directly calling `window.localStorage.getItem`, `setItem`, and `removeItem` in several effects and by listening to the `storage` event. hooks `useSessionStorage` similarly uses `sessionStorage` as a generic local-only persistence mechanism, wrapping it in a hook but without using any of the prescribed “collection” abstractions. Neither hook is implemented as or built atop a TanStack DB/local-only collection; both rely on hand-written browser storage code. agents-nested-example\_instructa…
**Impact:** Bypassing the “localStorage collection” abstraction fragments storage handling across ad-hoc hooks, increasing the risk of inconsistent serialization, missing cross-tab semantics, and duplicate logic for hydration and persistence. It also directly conflicts with the stated architectural intent to centralize local-only persistence in a dedicated collection layer that can be SSR-aware and hydration-safe, making future refactors and enforcement of cross-tab behavior more difficult.

### Rule: “Data placement: server-synced domain data → DB; ephemeral UI/session → zustand or local-only/localStorage collection” agents-nested-example\_instructa…

**Status:** Partially Compliant
**Evidence:** The `useFileLoader` hook manages ephemeral, session-scoped UI state originating from a user-selected `File` and persists it in local storage for convenience. hooks This aligns conceptually with “ephemeral UI/session” data being kept on the client and optionally persisted locally instead of being modeled as server-synced domain data. However, the implementation does not route through either a zustand store or a local-only/localStorage collection as prescribed; it maintains its own internal reducer state and interacts with `localStorage` directly. agents-nested-example\_instructa… `useSessionStorage` similarly implements a generic local-only persistence hook that could be seen as a low-level primitive for UI/session state, but again it is not expressed as a collection within the TanStack DB/data-placement framework. hooks
**Impact:** While the data domain (ephemeral UI/session) is correctly kept client-local, the absence of the prescribed storage abstractions means this code is structurally out of step with the project’s broader data model. That increases the chance that other parts of the codebase will implement similar “one-off” storage hooks, undermining standardization of client-side persistence and making it harder to introduce cross-cutting concerns (versioning, migrations, feature flags) at the data layer.

### Rule: “SSR: per-request store instances; never touch storage during SSR” agents-nested-example\_instructa…

**Status:** Mixed (Compliant for `useFileLoader`, Non-Compliant for `useSessionStorage`)
**Evidence:** In `useFileLoader`, all `window.localStorage` access occurs inside `useEffect` hooks that guard on `typeof window !== 'undefined'`, which means no browser storage is touched during server rendering; effects only run on the client and the guards prevent accidental execution in non-browser environments. hooks This is aligned with the “never touch storage during SSR” portion of the TanStack DB/Zustand guidance. agents-nested-example\_instructa… In contrast, `useSessionStorage` calls `sessionStorage.getItem(key)` inside the lazy initializer passed to `React.useState`, which runs during render for both server and client. hooks On the server, `sessionStorage` is not defined, which will either throw or require non-standard globals, directly violating the SSR rule. agents-nested-example\_instructa…
**Impact:** For `useSessionStorage`, this pattern will cause runtime failures or require environment hacks whenever the hook is evaluated during SSR or in tests that lack a DOM-like environment, and it risks hydration mismatches when initial state depends on browser-only storage. For `useFileLoader`, the SSR behavior is safe, but the pattern is ad-hoc and does not leverage the standard environment helpers, which may cause inconsistencies relative to other SSR-safe code paths in the project.

### Rule: “ClientOnly / createClientOnlyFn / createIsomorphicFn for client-only behavior and hydration safety” agents-nested-example\_instructa…

**Status:** Partially Compliant
**Evidence:** `src/AGENTS.md` documents the use of `<ClientOnly>` and environment helpers (`createIsomorphicFn`, `createClientOnlyFn`, `createServerOnlyFn`) to control where code executes and avoid hydration mismatches for client-only concerns like browser APIs. agents-nested-example\_instructa… `useFileLoader` uses `typeof window !== 'undefined'` guards inside effects instead of these helpers, and it assumes that consumers of the hook will only call it in client-capable contexts; it does not itself leverage `ClientOnly` or an isomorphic helper to encapsulate environment behavior. hooks `useSessionStorage` performs no guard at all for the `sessionStorage` read during initialization, and it also does not use any of the environment helpers described in `src/AGENTS.md`. agents-nested-example\_instructa…
**Impact:** The lack of prescribed environment abstractions means environment-specific logic is encoded via ad-hoc `window` checks or, in the case of `useSessionStorage`, not guarded at all. That increases the risk of SSR and hydration issues, undermines the ability to reason about which code is tree-shaken from server vs client bundles, and makes the code brittle in non-browser runtime environments.

### Rule: “Project constraints: use alias imports (~) and TypeScript React in src” agents-nested-example\_instructa…

**Status:** Compliant
**Evidence:** `useFileLoader` imports `streamParseSession` using the configured alias root (`'~/lib/session-parser'`), consistent with the requirement that `~` resolve to `./src`. hooks Both hooks are TypeScript React (.ts) modules under `src/`, and there is no evidence of `.env` modification or dev-server commands in these files. agents-nested-example\_instructa…
**Impact:** Adhering to the alias and TypeScript constraints keeps these hooks consistent with the project’s module resolution and tooling expectations. This area shows that the assistant is capable of following mechanical project constraints even while missing more architectural rules around effects and storage.

3. **Behavior Patterns of the Assistant/Agent**

* Relies on handwritten `useEffect` patterns to manage localStorage/sessionStorage for local-only persistence and cross-tab sync, despite explicit guidance to use a localStorage collection abstraction without effects.

* Treats environment and SSR rules inconsistently: `useFileLoader` employs client-only guards inside effects, while `useSessionStorage` accesses `sessionStorage` during initialization with no guard, indicating the rules are not being applied systematically.

* Correctly applies straightforward project constraints (alias imports, TypeScript placement) but appears to treat AGENTS.md architectural guidance—especially around data placement and environment abstractions—as advisory best practices rather than strict requirements.

4. **Prioritized Remediation Plan (for the Assistant/Agent)**

5. Stop reading from `localStorage` or `sessionStorage` during render or hook initialization; move all browser storage access behind environment-safe abstractions that never execute during SSR.

6. Route local-only preferences and cross-tab snapshot persistence through the prescribed “localStorage collection” mechanism instead of ad-hoc effects and direct storage calls inside hooks.

7. Use the documented environment helpers (`createIsomorphicFn`, `createClientOnlyFn`) and/or `<ClientOnly>` wrappers as the default pattern for any hook or component that depends on browser-only APIs, rather than relying on manual `typeof window` checks or leaving access unguarded.

8. Keep effects focused on minimal external wiring (e.g., attaching/removing DOM or storage event listeners) and ensure that derivation of in-memory app state happens during render from well-defined inputs (loader data, props, query/DB collections), not from storage reads inside `useEffect`.

9. Align future hook-level persistence and synchronization logic with the TanStack DB and collection-based patterns described in `AGENTS.md` so that ephemeral UI/session state is handled consistently with the rest of the codebase.

10. **Optional: AGENTS.md Improvements**

* **Clarifications:** Make it explicit that direct use of `localStorage`/`sessionStorage` in custom hooks is prohibited except via the sanctioned “localStorage collection” abstraction and environment helpers, and that reading from browser storage in hook initializers or render functions is considered a violation of the “never touch storage during SSR” rule even if it might “work” in some environments.

* **Granularity:** Add a dedicated `src/hooks/AGENTS.md` that restates, in hook-specific terms, that reusable hooks must be SSR-safe, must not read from browser-only APIs during initialization, and should delegate all storage-related concerns to collections or environment helpers.

* **Examples:** Include a short canonical pattern in `AGENTS.md` for an SSR-safe client-only storage hook, e.g., demonstrating `createClientOnlyFn` or a `localStorage` collection selector used inside a hook, to make the intended alternative to `useEffect`\-based storage hydration unambiguous.

---

## You asked

which file were you given for this analysis?

---

## ChatGPT Replied

Thought for 15s

I was given `hooks.md` (containing the code for `src/hooks/useFileLoader.ts` and `src/hooks/useSessionStorage.ts`) plus the project governance file `agents-nested-example_instructa-starter-min.md` to evaluate those hooks against the relevant AGENTS.md rules.

---
