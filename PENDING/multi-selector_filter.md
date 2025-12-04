````md
## Repo-specific application: codex-session-view

When this skill runs inside `AcidicSoil/codex-session-view`, apply a very opinionated, data-dense discovery aesthetic for the Session Explorer:

- Purpose: accelerate “find the right session” workflows; assume the user is an expert debugging or reviewing AI runs.
- Tone: industrial, utilitarian, slightly brutalist. Dense controls, sharp edges, visible structure. No playful or whimsical elements.
- Differentiator: the filter surface feels like an instrument panel: multi-select chips, explicit state, zero ambiguity about what is active.

### Target surface: Session Explorer filters

Primary targets:

- `src/components/viewer/session-list/SessionFiltersToolbar.tsx`
- `src/components/viewer/session-list/AdvancedFilterAccordion.tsx`
- `src/components/viewer/ViewerFilterDropdown.tsx`
- `src/components/viewer/session-list/useSessionExplorerModel.ts`
- `src/components/viewer/session-list/sessionExplorerTypes.ts`
- `src/components/viewer/session-list/sessionExplorerUtils.ts`

Goal:

- Replace the current ad-hoc filter controls with a structured multi-selector pattern inspired by:
  - `https://www.ui-layouts.com/components/multi-selector`
- Preserve existing filter semantics and wiring (search params, loader contracts, types) while giving the UI a clear, compact multi-select interaction model.

### Multi-selector design direction

Adopt the multi-selector as the primary filter control in the Session Explorer toolbar:

- Form:
  - A single, wide “Filters” control in the toolbar that opens a panel/popover.
  - Inside the panel, filters appear as vertical stacks of labeled groups with checkable items.
  - Selected items render as tight pills/chips in the trigger, with a count and a “clear” affordance.
- Aesthetic:
  - Dark neutral background for the panel (`#05060a` to `#101218`).
  - Low-saturation accent for selected states (e.g. electric cyan or acidic green) used sparingly.
  - Strong 1px borders and subtle inner shadows to create a “hardware” feel.
  - Typography: use the existing project font stack, but increase weight for labels (600) and keep filters themselves at 13–14px for density.
- Motion:
  - Panel open/close: short, crisp scale + opacity transition (120–160ms).
  - Chip hover: micro-translate on hover (`translateY(-1px)`) and subtle shadow.
  - No gratuitous animations in scroll containers; prioritize responsiveness.

### Component architecture

Implement a dedicated, reusable multi-selector UI in `src/components/ui/multi-selector`:

- `MultiSelector.tsx`
  - Headless-ish container that controls:
    - open/close state
    - keyboard bindings (Esc closes, Tab cycles within, Enter/Space toggles items)
    - selected value bookkeeping
  - Props (example shape, adapt to repo types):

    ```ts
    export type MultiSelectorOptionId = string;

    export interface MultiSelectorOption {
      id: MultiSelectorOptionId;
      label: string;
      description?: string;
      groupId: string;
      icon?: React.ReactNode;
      disabled?: boolean;
    }

    export interface MultiSelectorGroup {
      id: string;
      label: string;
      description?: string;
      allowMultiple?: boolean; // false → radio-like behavior within group
    }

    export interface MultiSelectorValue {
      [groupId: string]: MultiSelectorOptionId[];
    }

    export interface MultiSelectorProps {
      groups: MultiSelectorGroup[];
      options: MultiSelectorOption[];
      value: MultiSelectorValue;
      onChange: (value: MultiSelectorValue) => void;
      placeholder?: string;
      triggerLabel?: string;
      maxVisibleChips?: number;
      className?: string;
    }
    ```

- `MultiSelectorTrigger.tsx`
  - Renders:
    - label (“Filters”)
    - selected chip summary
    - active count badge
    - “Reset” icon when any filter is active
  - No logic beyond callbacks; all state lives in parent (`MultiSelector`).

- `MultiSelectorPanel.tsx`
  - Accepts the same `groups`, `options`, `value`, `onChange`.
  - Layout:
    - Left column: groups (sticky header with group labels when scrolling).
    - Right area: vertical list of options grouped, each with:
      - checkbox/radio
      - primary label
      - small secondary text (e.g. “42 sessions” count) when available.
  - Include a small inline search input at the top for fuzzy filtering by label.

- `MultiSelectorChipList.tsx`
  - Renders selected options as pills, with per-pill clear icons.
  - Collapses to `+N` summary when selection is large.

#### Implementation constraints

- No `useEffect` for data fetching; respect the repo’s “avoid useEffect for data fetching” rule. Keep filter options derived from loader data and `useSyncExternalStore` where appropriate.
- SSR-safety:
  - Avoid reading browser-only state (window size, media queries) during SSR.
  - Keep initial `value` derived from search params or loader data.
- Accessibility:
  - Use semantic `button` for trigger, `role="dialog"` or `role="menu"` for panel.
  - Ensure focus is trapped when panel is open; return focus to trigger on close.
  - Provide `aria-label` / `aria-expanded` / `aria-controls` on trigger.

### Mapping existing filters into the multi-selector

Unify the existing Session Explorer filters into groups. Use the current `sessionExplorerTypes.ts` / `sessionExplorerUtils.ts` to derive the canonical list of filterable dimensions.

Typical groups (adapt to actual types):

- `status`
  - Values like: success, failure, timeout, cancelled.
- `source`
  - Values like: cli, vscode, web, api, unknown.
- `model`
  - Distinct model identifiers observed in sessions (OpenAI, Gemini, LM Studio, etc.).
- `label`
  - User-defined tags or labels; allow multi-select.
- `time`
  - Coarse ranges: last 24h, last 7 days, last 30 days, all.
  - Represent as mutually exclusive options (`allowMultiple: false`).

Implementation rules:

- Keep the Session Explorer’s internal state model (`useSessionExplorerModel`) as the single source of truth.
- Add pure mapping helpers:

  ```ts
  // sessionExplorerFilters.ui.ts
  import type {
    SessionExplorerFilters,
    SessionExplorerFilterDimensions,
  } from './sessionExplorerTypes';
  import type {
    MultiSelectorGroup,
    MultiSelectorOption,
    MultiSelectorValue,
  } from '~/components/ui/multi-selector/MultiSelector';

  export function buildMultiSelectorConfig(
    dims: SessionExplorerFilterDimensions
  ): {
    groups: MultiSelectorGroup[];
    options: MultiSelectorOption[];
  } {
    // Map domain-specific dimensions → UI groups/options
  }

  export function toMultiSelectorValue(
    filters: SessionExplorerFilters
  ): MultiSelectorValue {
    // Map domain filters → groupId/optionId[]
  }

  export function fromMultiSelectorValue(
    value: MultiSelectorValue
  ): SessionExplorerFilters {
    // Map groupId/optionId[] → domain filters
  }
````

* Use these helpers in `SessionFiltersToolbar.tsx`; avoid duplicating mapping logic in multiple components.

### Wiring into SessionFiltersToolbar

Refactor `SessionFiltersToolbar.tsx` to center the new multi-selector:

* Replace existing discrete filter buttons/dropdowns with a single `MultiSelector` instance.

* High-level structure:

  ```tsx
  // SessionFiltersToolbar.tsx
  import { MultiSelector } from '~/components/ui/multi-selector/MultiSelector';
  import {
    buildMultiSelectorConfig,
    toMultiSelectorValue,
    fromMultiSelectorValue,
  } from './sessionExplorerFilters.ui';
  import { useSessionExplorerModel } from './useSessionExplorerModel';

  export function SessionFiltersToolbar() {
    const { filters, setFilters, filterDimensions } = useSessionExplorerModel();

    const { groups, options } = buildMultiSelectorConfig(filterDimensions);
    const value = toMultiSelectorValue(filters);

    function handleChange(nextValue: MultiSelectorValue) {
      const nextFilters = fromMultiSelectorValue(nextValue);
      setFilters(nextFilters);
    }

    function handleReset() {
      setFilters(/* domain default filters */);
    }

    return (
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <MultiSelector
          groups={groups}
          options={options}
          value={value}
          onChange={handleChange}
          placeholder="Filter sessions"
          triggerLabel="Filters"
          maxVisibleChips={4}
        />
        {/* Keep search input and sort controls as separate, adjacent elements */}
      </div>
    );
  }
  ```

* Keep the search bar (`SessionSearchBar.tsx`) visually aligned but logically separate. The multi-selector handles categorical filters; the search bar handles full-text, IDs, or filenames.

### Advanced filter panel alignment

If `AdvancedFilterAccordion.tsx` currently exposes extra/rare filters:

* Either:

  * Collapse its semantics into additional multi-selector groups (e.g. “Runtime”, “Provider”, “Flags”), or
  * Trigger it from a small “Advanced…” link within the multi-selector panel footer.
* Ensure there is a single source of truth:

  * Advanced filters still contribute to the same `SessionExplorerFilters` object.
  * The multi-selector reflects advanced selections as chips when applicable.

### ViewerFilterDropdown consistency

Unify the aesthetics of `ViewerFilterDropdown` with the multi-selector:

* Use the same panel shell (border radius, border color, shadow, backdrop).
* Use the same typography scale and spacing.
* If `ViewerFilterDropdown` is a separate domain (e.g. timeline view filters), extract shared primitives:

  * `FilterPanelShell`
  * `FilterSectionLabel`
  * `FilterChip`

Ensure both the Session Explorer and timeline filters feel like parts of a single system, not two unrelated widgets.

### CSS and Tailwind details

Use Tailwind with design tokens where possible:

* Define CSS variables at the viewer scope:

  ```css
  :root {
    --viewer-bg: #05060a;
    --viewer-panel-bg: #0b0d12;
    --viewer-border-subtle: rgba(255, 255, 255, 0.06);
    --viewer-chip-bg: rgba(255, 255, 255, 0.06);
    --viewer-chip-bg-active: rgba(70, 230, 170, 0.14);
    --viewer-accent: #46e6aa;
  }
  ```

* Apply Tailwind utility classes to bind to these variables via `bg-[color]` and `border-[color]` patterns where the config allows, or use minimal custom CSS modules if needed.

* Maintain consistent vertical rhythm:

  * 8px base unit.
  * Panel padding: 12–16px.
  * Row height for options: 28–32px.

### Behavior and UX rules

* Always show an explicit “Clear all” in the panel footer when any filter is active.
* Persist selection via search params so reloads and deep links preserve filters.
* Avoid implicit filters; everything active must be visible either as chips or as explicit labels in the panel.
* Prevent state surprise:

  * Changes inside the panel apply immediately (no “Apply” button) to keep the mental model tight.
  * Only use “Apply” if the filter update is materially expensive; in that case, visually emphasize the button.

### Review checklist

When you finish a filters-related change in the Session Explorer, verify:

* The multi-selector:

  * Correctly reflects current `SessionExplorerFilters` from URL/loader.
  * Produces valid `SessionExplorerFilters` when toggling options.
  * Is fully keyboard-accessible (open, navigate, select, close).
* Visual consistency:

  * Session Explorer toolbar, timeline filters, and any additional viewer filters share panel shells and chip styles.
  * No stray legacy buttons/dropdowns remain that duplicate filter semantics.
* SSR / hydration:

  * No browser-only APIs run during SSR.
  * Initial render matches client; no hydration warnings triggered by the filters toolbar.
* Performance:

  * Toggling filters does not trigger unnecessary full-page redraws; updates scope to the session list and dependent views.
  * Virtualized lists remain smooth under heavy filtering.

This is the concrete application of the `frontend-design` skill for `codex-session-view`: own the Session Explorer filter experience end to end, replace it with a deliberate multi-selector interface, and keep the implementation aligned with the repo’s state, SSR, and routing constraints.

```
```
