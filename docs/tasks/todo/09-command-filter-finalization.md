Context
- The current ToolCommandFilter uses a temporary dropdown so the dev server runs, but it still lacks the finished taki-ui combobox behavior (multi-family selection, search, robust overlay interactions) promised in plan 07.
- Event range controls remain tall and redundant, still showing buggy "0–NaN / undefined" summaries instead of the compact horizontal design (side-by-side inputs + slider) discussed in commands-filter_bug-todo.md.
- Timeline metadata improvements landed (badges + command tokens), so the remaining work must align the UI with the new metadata, search-param syncing, and AGENTS.md constraints (no useEffect fetching, routing-driven state).

Success criteria
- ToolCommandFilter uses the taki-ui combobox with chip previews, supports unlimited family selections + ad-hoc query text, and closes correctly via outside click or explicit affordances.
- Command filter state persists via uiSettingsStore + URL search params, survives reloads, and correctly narrows events (verified with command families git/sed/rg/apply_patch/etc. and free-text queries).
- Event range panel adopts the horizontal layout: two inline numeric inputs (start/end) + slider tied to router search params with no NaN states and immediate store updates.
- Badges + summaries stay consistent with command metadata; no regressions in timeline rendering, keyboard navigation, or accessibility.
- pnpm lint and pnpm test (invoked through the mandated webapp-testing workflow) both pass.

Deliverables
- Updated `src/components/viewer/ToolCommandFilter.tsx` (and supporting UI primitives) using the official taki-ui combobox and query chips.
- Refactored `TimelineRangeControls` (and related store/query helpers) implementing the compact inline inputs + slider, fixing NaN calculations.
- Adjusted docs (plan 07 references, commands-filter_bug-todo.md) describing the finished UX and how command filters/range behave.
- Automated tests covering combobox selection, command filter matching, and range serialization.

Approach
1) **Rebase + audit current state** – Confirm recent metadata/badge changes, identify all places still importing the temporary combobox, and document target props/events for the taki-ui replacement.
2) **Integrate taki-ui combobox** – Run `pnpm dlx taki-ui@latest add combobox`, wire the component into ToolCommandFilter with multi-select support, chip previews, and close controls; ensure query typing updates `value.query` without interfering with selection toggles.
3) **Hook filter state + URL syncing** – Verify `applyViewerSearchUpdates` and `useUiSettingsStore` read/write the new combobox data, update `matchesCommandFilter` tests if needed, and ensure router navigation preserves selections.
4) **Redesign event range controls** – Implement the inline inputs, slider, and "Showing N events" summary; keep start/end synced bidirectionally with search params, timelinePreferences, and loader defaults while preventing NaN/undefined values.
5) **Validation + docs** – Update docs/tasks + README snippets to describe the finished UX, run lint + full tests via webapp-testing skill, and perform manual/Playwright smoke tests on command filtering and range adjustments.

Risks / unknowns
- Taki-ui combobox API differences may require additional state adapters or portal adjustments in our layout.
- Large sessions (thousands of events) could make slider updates expensive without debouncing—need to monitor performance.
- Router search-param churn from rapid typing/slider moves could spam history unless we batch updates inside transitions.

Testing & validation
- `pnpm lint` and `pnpm test` (triggered through the webapp-testing skill per repo rules).
- Vitest unit tests for command filter logic + range serialization; RTL/component tests for combobox chip removal and slider/input sync.
- Manual viewer walkthrough (keyboard + screen reader basics) to ensure combobox focus/escape behavior and slider accessibility.

Rollback / escape hatch
- Keep the previous toggle/input implementation reachable via git so we can revert quickly if the taki-ui combobox or new range control introduces regressions.

Owner/Date
- Codex / 2025-12-11
