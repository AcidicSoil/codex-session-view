* Affected files:

  * tests/SessionList.test.tsx: all 6 tests fail with “Maximum update depth exceeded”
  * tests/DiscoveryPanel.test.tsx: both tests fail with the same error
  * src/components/viewer/session-list/useSessionExplorerModel.ts: creates an unstable `currentSearch` fallback (`?? {}`) and has an effect that unconditionally calls `setExpandedGroupIds`, which can form a render→effect→state-update loop
  * src/components/viewer/SessionList.tsx: renders based on `useSessionExplorerModel`; also calls `onFiltersRender(filterToolbarNode)` in an effect, which can amplify churn if the toolbar node changes every render
  * src/components/viewer/DiscoveryPanel.tsx: thin wrapper around `SessionList`, so it inherits the loop
  * src/features/viewer/sessionExplorer.search: parse/apply helpers determine how “empty search” is represented; `useSessionExplorerModel` passes an object even when search is absent, so referential stability matters

* Root cause:

  * `useSessionExplorerModel` sets `currentSearch` to `(locationState?.search ?? {})`. When `locationState.search` is `undefined` (common in unit-test router setups), that `{}`
    is a new object every render .
  * Because `filters` is memoized on `[currentSearch]`, a new `{}` forces a new `filters` object each render . That in turn causes `filteredGroups` to be recomputed, which retriggers the “prune expanded groups” effect.
  * The prune effect always calls `setExpandedGroupIds((current) => current.filter(...))` without checking if the result is identical; `[].filter(...)` returns a new array reference, so React treats it as a state change and re-renders, repeating indefinitely .
  * The thrown stack points into Radix ref composition because the loop forces repeated mount/update cycles through Radix-based UI used in the filters/sheet path; the ref callback is where React detects the nested update depth .
  * Environmental factor: React 19 + current Radix packages are in the failing stack, but they are not the primary cause; they are where the infinite updates surface .

* Proposed fix:

  * Steps/patch outline:

    1. Make the “empty search” fallback referentially stable in `useSessionExplorerModel`.

       * Add a module-level constant:

         * `const EMPTY_SEARCH: Record<string, unknown> = {}`
       * Replace:

         * `const currentSearch = (locationState?.search as Record<string, unknown> | undefined) ?? {}`
       * With:

         * `const currentSearch = (locationState?.search as Record<string, unknown> | undefined) ?? EMPTY_SEARCH`

    2. Make the expanded-group pruning effect a no-op when it would not change state.

       * Replace:

         * `setExpandedGroupIds((current) => current.filter((id) => visibleIds.has(id)));`
       * With a guarded setter:

         * compute `next = current.filter(...)`
         * if `next.length === current.length` and every element matches, return `current`; else return `next`

    3. Optional hardening (not required to stop the loop, but prevents extra churn when `onFiltersRender` is used):

       * Split `SessionList`’s `onFiltersRender(null)` cleanup so it only runs on unmount, not on every toolbar-node update (current effect cleanup runs before re-run) .
  * Side effects:

    * State pruning still works, but no longer triggers redundant renders when the pruned list is identical.
    * `currentSearch` is treated as immutable; code must not mutate it (same expectation as before).
  * Tests:

    * Existing failing tests in `tests/SessionList.test.tsx` and `tests/DiscoveryPanel.test.tsx` should pass once the infinite loop is removed .
    * Add a regression test that renders `SessionList` with a router location where `search` is `undefined` and asserts render completes without throwing (this specifically covers the `?? {}` trap in `useSessionExplorerModel`) .
    * Add a regression test that ensures the “prune expanded groups” effect does not update state when `expandedGroupIds` is already consistent with `filteredGroups` (covers the unconditional `filter()` state update) .

* Documentation gaps:

  * AGENTS.md (add a short rule under “Search params as state”): avoid `?? {}` (or other object literals) in render when the value is used as a dependency; use a shared constant to preserve referential stability .
  * Viewer/session explorer internal docs (create a short section near the search-param helpers): “`location.search` may be undefined; treat empty search as a stable constant; never trigger state updates in effects unless the next state differs.” This aligns with the existing guidance to avoid effect-driven derived-state loops

* Open questions/assumptions:

  * Assumption: in the test router setup, `locationState.search` is `undefined` (or otherwise unstable), triggering the `?? {}` allocation path .
  * Assumption: no code mutates `locationState.search` or the empty-search fallback; the fix relies on immutability conventions.
