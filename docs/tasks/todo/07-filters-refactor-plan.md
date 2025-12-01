Context
- `src/components/ui/filters.tsx` is 2,137 LOC and bundles i18n config, context wiring, operator/value helpers, and every visual control for the Filters UI, violating the 150–250 LOC soft target and 600 LOC cap.
- The Filters builder powers viewer-wide filtering, so the API (`Filters`, `FiltersContent`, `FilterFieldConfig`, `createFilter`, etc.) and behaviors like grouped fields, multiselect defaults, and i18n fallbacks must remain intact while we reorganize the code.

Success criteria
- Split the monolithic file into a dedicated folder of focused modules (types/i18n, context, helpers, subcomponents, root) so no single `.tsx` exceeds 300 LOC and UI vs logic responsibilities are clearly separated.
- Preserve the existing public exports and runtime behavior (field grouping, value validation, add-filter popover flows, operator defaults) so downstream consumers make zero code changes.
- Add targeted unit tests for helper utilities (`flattenFields`, `createFilter`, operator selection, etc.) to lock in edge cases for grouped and multiselect fields.
- Provide developer-facing documentation (brief README or doc entry) that explains the new module layout and extension points (how to add fields, override i18n, plug custom renderers).
- Ensure the refactor honors TanStack Start rules (no new `useEffect` data fetching, keep SSR-safe state updates) and keeps TypeScript definitions accurate.

Deliverables
- Restructured Filters directory (e.g., `src/components/ui/filters/`) containing: `types.ts`, `i18n.ts`, `context.tsx`, `filter-utils.ts`, `hooks.ts`, `FilterInput.tsx`, `FilterOperatorDropdown.tsx`, `FilterValueSelector.tsx`, `AddFilterPopover.tsx`, `FiltersContent.tsx`, `Filters.tsx`, and an `index.ts` barrel preserving current exports.
- New Vitest coverage under `src/components/ui/filters/__tests__/filter-utils.test.ts` (and additional specs as needed) verifying utility logic and operator/value behaviors.
- Short documentation file such as `docs/components/filters.md` (or README within the folder) describing usage, customization, and file map.

Approach
1. **Responsibility audit** – Map every major section of the current file (i18n config, operators, flattening helpers, context/provider, UI subcomponents, root entrypoints) to a target module and capture the planned folder structure.
2. **Foundational modules** – Create `types.ts`, `i18n.ts`, and `filter-utils.ts` that house interfaces, defaults, helper functions, and operator factories; update imports so logic files share these sources instead of duplicating definitions.
3. **Context & hooks** – Extract `FilterContext`, provider props, and shared callbacks (e.g., `useFilterContext`, `useFiltersActions`) into `context.tsx`/`hooks.ts`; ensure generics remain intact and context still exposes `getOperators`.
4. **Presentational components** – Break `FilterInput`, `FilterOperatorDropdown`, `FilterValueSelector`, `FilterRemoveButton`, and the add-filter popover flow into standalone `.tsx` files that accept explicit props and import shared context/helpers.
5. **Composition layer** – Rebuild `FiltersContent` and `Filters` components to orchestrate the smaller pieces, keeping API compatibility while simplifying state management (e.g., extracted `useFilterList` hook) and exposing everything via an `index.ts`.
6. **Docs & tests** – Write Vitest specs for utilities/operator selection, add doc describing the new structure + extension hooks, and update any import paths in the app/tests.
7. **Verification & cleanup** – Run lint/tests, double-check LOC per file, remove the old monolithic file, and ensure there are no accidental regressions in Storybook/e2e fixtures referencing filters.

Risks / unknowns
- Generics and inferred types are tightly coupled today; splitting files could expose TypeScript circular dependencies or require rethinking exported types.
- Consumers may rely on deep imports from the current file; ensuring the barrel re-exports everything without circular build issues is critical.
- The add-filter popover logic intertwines UI state with filter mutation; extraction must avoid introducing duplicated state or hydration issues.
- No automated coverage exists yet, so behavior regressions (operator defaults, multi-select value merging) are easy to miss without carefully written tests.

Testing & validation
- `pnpm test filters` (or targeted `pnpm vitest src/components/ui/filters`) to run the new unit specs.
- Existing viewer integration/e2e suites (`pnpm test viewer`, `pnpm test e2e --filter filters`) to confirm filter interactions still pass.
- Manual verification in the viewer page to ensure multiselect, grouped fields, and i18n overrides behave identically post-refactor.

Rollback / escape hatch
- Keep the original `filters.tsx` history intact so we can revert via `git checkout -- src/components/ui/filters.tsx` (or revert the commit) if regressions surface.

Owner/Date
- Codex / 2025-12-01
