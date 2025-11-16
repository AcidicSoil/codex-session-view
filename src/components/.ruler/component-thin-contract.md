# Thin component contract - Components



You own preventing component bloat. Enforce the following contract on every React/TSX file in this codebase.

---

### Thin Component Contract

1. Single responsibility per file

   * A React component file must do one of:

     * Orchestrate high-level behavior (wire hooks + child components), or
     * Render presentational UI (receive props, no domain logic), or
     * Contain headless logic (custom hooks, pure helpers, no JSX).
   * If a file does more than one of these, split it.

2. Headless-first design

   * Any non-trivial UI behavior (filters, searches, expansions, derived lists, scroll state, animations configuration) lives in:

     * `useXxx` hooks, or
     * pure functions in `~/lib/...`
   * Components may call these hooks/functions but may not re-implement their logic inline.

3. Card/list separation

   * Lists render items; cards define their appearance:

     * `XxxList` components may only:

       * Accept data and callbacks as props
       * Map over items
       * Pass props into `XxxCard`
       * Optionally wrap items in layout/animation containers
     * `XxxCard` owns the event-specific or item-specific JSX, conditional branches, and formatting.
   * Do not embed full card markup directly in list components.

4. Filter/search separation

   * Filter meaning and evaluation are never defined in JSX files:

     * All “does this item match these filters/search?” logic lives in pure functions in `~/lib/...`
     * All filter state management and derived collections live in `useXxxFilters` hooks.
   * UI wrappers (`XxxFilters`, `XxxWithFilters`) may only:

     * Call the hook
     * Render generic filter primitives (`<Filters>`, inputs, toggles)
     * Forward state and callbacks to children.

5. No mixed concerns inside components
   Inside a React component body, disallow:

   * Defining large helper functions that can be pure (formatters, label builders, value extractors, matcher functions).
   * Writing switch/if chains over domain types when those can be moved to `renderXxx(type, data)` or a card-level helper.
   * Implementing ad-hoc state machines (multiple related booleans/indices) without extracting to a hook.

   Any helper that:

   * Takes arguments
   * Returns a value or JSX
   * Does not need hooks or closure over local component state
     must be moved out of the component body into a separate function/module.

6. Size and complexity guardrails

   * Hard caps:

     * Max ~150 lines per component file (excluding imports/types).
     * Max ~80 lines per component function.
   * If you hit these caps:

     * Extract a card, layout shell, hook, or lib function until under the limit.
   * Never add new behavior to a file already at the cap; instead introduce a new hook or child component.

7. Explicit layering
   For any feature (e.g., timeline, viewer, filters), enforce this layering:

   * `~/lib/{feature}/...`

     * Domain types, matchers, filter application, search, formatting, pure utilities.
   * `~/components/ui/...`

     * Generic, reusable primitives (lists, cards, filters, buttons, layout shells). No feature-specific domain logic.
   * `~/components/{feature}/...`

     * Thin feature compositions:

       * Call hooks from `~/lib` or `~/components/{feature}/useXxx`
       * Compose `~/components/ui` primitives and feature cards
       * Owns minimal layout/animation wiring only.

8. Animation and visual effects isolation

   * Animation libraries (`framer-motion`, custom transitions) are wired in “wrapper” components only.
   * The underlying card and list remain usable without animation.
   * Scroll gradients, fade overlays, and similar effects live in reusable components or hooks (`useScrollFade`, `ScrollFadeOverlay`), not embedded in feature lists.

9. No duplicate feature logic

   * If two components render the same conceptual object (e.g., timeline event) or behavior (filters on the same data):

     * There must be a single shared implementation (card, hook, or lib function).
   * When adding a new variant (e.g., animated vs static), extend props or add a thin wrapper; do not fork the logic.

10. Refactor-on-touch rule

    * Any time a component is modified and violates any rule above:

      * First, split or extract until it conforms.
      * Only then add or change behavior.

These rules are mandatory. When generating or editing components, always restructure code to comply with this contract before considering the task complete.
