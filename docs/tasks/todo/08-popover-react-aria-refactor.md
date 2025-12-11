Context
- Running the shadcn CLI replaced our shared `~/components/ui/popover` with a React Aria variant that only exports `<Popover>`, breaking every consumer that still imports `PopoverTrigger`/`PopoverContent` and blocking the dev server.
- Viewer features (MultiSelector, Filters, SelectOptionsPopover, FallbackOptionsPopover, DateTimeInput, etc.) rely on Radix behaviors such as `asChild` triggers, custom align/offset values, dark-theme styling, and controlled open state—all of which must be preserved during the React Aria migration.
- We need a single React Aria–based popover implementation that satisfies accessibility goals, removes duplicate Radix copies (e.g., `components/website/ui/popover.tsx`), and complies with AGENTS.md (no ad-hoc effects, state lifted via stores/search) without adding compatibility shims.

Success criteria / acceptance
- `~/components/ui/popover` exposes a React Aria–backed API (root + trigger/content helpers or slots) that supports keyboard focus management, portals, `modal` toggles, `align`/`sideOffset`, and `asChild`-style composition for existing trigger components.
- Every consumer imports only the new API, opens/closes popovers correctly (including controlled state for MultiSelector/date pickers), and retains their current layout/styling requirements.
- There are no duplicate Radix implementations in the repo; website-specific popovers either reuse the shared module or explicitly document why they diverge.
- Story/component tests plus `pnpm lint` and `pnpm test` (run via the required skill) all pass, and manual smoke tests confirm focus trapping, arrow key navigation, and pointer interactions in at least MultiSelector + Filters.

Deliverables
- Refactored `src/components/ui/popover.tsx` exporting the new React Aria API (root, trigger, content, optional close component) plus supporting utilities (slot helpers, offset logic, dark/light variants).
- Updated consumer components (MultiSelector, DateTimeInput, Filters, SelectOptionsPopover, FallbackOptionsPopover, any other `PopoverContent` imports) using the new API with consistent props.
- Targeted component tests (React Testing Library) covering popover trigger interactions for MultiSelector and Filters, and refactored unit tests/mocks if prior Radix-specific behavior existed.
- Documentation entry (docs/components.md or README UI section) describing how to use the React Aria popover, including trigger composition and styling conventions.

Approach
1) **Audit usage + requirements** – Use `rg 'Popover'` to catalog every consumer, noting alignment controls, width/theming expectations, controlled vs uncontrolled state, and `asChild` scenarios; document gaps (e.g., DateTimeInput needing nested popovers) before coding.
2) **Design React Aria API** – Define the exported surface (e.g., `PopoverRoot`, `PopoverTrigger`, `PopoverContent`, optional `PopoverClose`) built on `react-aria-components` + `Slot` patterns to emulate `asChild`, include offset/align props, modal toggles, and arrow support; document the contract in the component doc stub.
3) **Implement shared popover** – Build the new module with Tailwind Variants for styling, ensure focus ring + portal behavior matches product needs, and delete any redundant Radix wrappers (migrating website popovers to the same implementation or clearly separating them if necessary).
4) **Refactor consumers** – Update each component to the new API, replacing Radix-specific props (`sideOffset`, `align`, `asChild`) with the React Aria equivalents, and adjust local state (e.g., MultiSelector`s `open` state) to drive `isOpen`/`onOpenChange` on the new popover root without violating AGENTS.md data-placement rules.
5) **Testing + accessibility review** – Expand/adjust relevant component tests (MultiSelector panel opens, Filters popover alignments, DateTimeInput calendar toggles), run `pnpm lint` + `pnpm test` via the mandated `webapp-testing` workflow, and perform manual keyboard/assistive checks to confirm focus trapping + escape handling.
6) **Docs + cleanup** – Update the UI component guide with the new API, note removal of Radix shims, and capture any remaining edge cases as follow-up tasks rather than leaving silent TODOs.

Risks / unknowns
- React Aria’s slot model may not support `asChild` exactly; we may need to wrap triggers with `Slot` utilities or adjust consumer markup, risking churn in styling and test snapshots.
- Components that rely on imperative `ref` access or custom focus management (e.g., DateTimeInput) might need additional adapters, increasing scope.
- Removing the Radix-based website popover could expose styling differences; we must decide whether to fully consolidate or accept temporary duplication (documented) to avoid regressions.

Testing & validation
- Component/unit tests for MultiSelector, Filters, SelectOptionsPopover, and DateTimeInput verifying trigger interactions, focus management, and prop-driven alignment.
- Manual walkthrough validating keyboard navigation and escape-to-close on both light and dark surfaces.
- Repository-wide `pnpm lint` + `pnpm test` executed via the `webapp-testing` skill to comply with project testing standards.

Rollback / escape hatch
- If accessibility or performance regressions appear, revert the popover module + dependent commits to the last known good Radix version and re-open the follow-up plan with scoped remediation tasks.

Owner / date
- Codex / 2025-12-11
