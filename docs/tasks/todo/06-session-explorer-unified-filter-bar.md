Context
- Screenshot `public/screenshots/Screenshot 2025-11-24 154905.png` shows redundant session explorer controls (dropdown + manual size inputs + duplicate sort buttons) that confuse users.
- We need a single shadcn-based filter bar: Input(+icon), Select for "Sort by", compact sort-direction control, and Filters/Reset buttons, with a right-side Sheet for advanced options.
- Filter/search/sort state must be unified so the bar, sheet, and badge chips stay perfectly in sync.

Success criteria
- One visible filter bar replaces the old dropdowns/min-max fields/buttons; no duplicated controls remain in the explorer.
- The primary search input, sort select, direction control, Filters button, Reset button, chip row, and sheet all read/write the same state object.
- Filters button opens a right-side sheet containing advanced controls (size min/max with units, timestamp range, other filters); closing it preserves state until Reset.
- Active filters render as removable Badge chips (e.g., "Size: 10–100 MB") beneath the bar; clicking each chip clears that constraint and updates the shared state immediately.
- Styles align with shadcn Input/InputGroup, Select, ToggleGroup/Button, Sheet, Badge patterns and remain responsive on mobile/desktop.

Deliverables
- Updated `SessionList` (and related components/hooks) implementing the unified filter bar, sheet surface, badges, and shared filter/sort state.
- New/updated UI primitives wiring (InputGroup, Select, ToggleGroup/Icon button, Sheet, Badge components) if not already imported.
- State management utilities/types describing the filter object plus helper functions for serialization/reset/defaults.
- Tests (unit/component) covering the new filter bar interactions, sheet toggling, and badge clearing logic.
- Screenshot or doc snippet noting the new UX (optional but recommended for design review).

Approach
1) **State modeling**: design a consolidated `SessionFilterState` (search text, sort key, sort dir, size min/max+units, timestamp range, other filters). Implement helpers for default state, updating individual fields, detecting active filters, and mapping to query predicates.
2) **UI composition**: replace the existing inline controls with a single flex bar: Input (with search icon/input group), Select for sort key, ToggleGroup or icon button for direction, Buttons for Filters (primary) and Reset (secondary). Introduce a badge row under the bar that enumerates active filters from the state helpers.
3) **Sheet & advanced filters**: build a right-side Sheet triggered by the Filters button; move advanced controls (size min/max w/ unit Selects, timestamp range pickers, any extra toggles) into the sheet, binding them to the shared state. Ensure closing the sheet keeps state, and Reset clears everything.
4) **Integration & cleanup**: wire the unified state into existing filtering logic (search text, size filtering, sort). Remove all legacy controls and ensure analytics/logging still fire with the new structure.
5) **Testing & documentation**: add/adjust tests for the new bar (search filtering, sort select, badge clearing, sheet toggling). Capture a reference screenshot or add doc notes summarizing the new UX for future contributors.

Risks / unknowns
- Need to confirm the full set of advanced filters (besides size/timestamp) and whether any future ones need placeholders in the sheet.
- Chip row could overflow on narrow viewports; may require horizontal scrolling or wrapping strategy.
- Filter state resets must remain compatible with telemetry/logging; verify existing logging expectations.

Testing & validation
- `pnpm vitest run tests/SessionList.test.tsx` (and any new tests) to cover filter state, chip clearing, sheet interactions.
- Manual QA in the viewer route across desktop/mobile breakpoints to confirm responsive layout, sheet behavior, and badge UX.
- Optional screenshot comparison/test plan update to capture the new bar.

Rollback / escape hatch
- Keep legacy filtering logic helpers (pre-state refactor) behind a feature flag or in git history so we can revert to the previous UI if the sheet/bar experience regresses key metrics.

Owner/Date
- Codex / 2025-11-24
