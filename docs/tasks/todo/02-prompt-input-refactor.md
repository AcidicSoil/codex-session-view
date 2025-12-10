Context
- `src/components/ai-elements/prompt-input.tsx` has grown past 1k LOC combining provider state, attachment management, input form, textarea behavior, action menus, and misc UI primitives, violating the 150-250 LOC target and 400 LOC warning cap.
- The monolithic structure makes logic reuse difficult (provider vs local modes) and complicates maintenance, testing, and future enhancements such as speech input or new attachment types.
- Need a structured refactor that splits responsibilities into cohesive files/hooks while preserving existing functionality and following the AGENTS component guidelines.

Success criteria
- No PromptInput-related file exceeds 400 LOC, with major sections (provider, attachments UI, input form, utility components) isolated into focused modules with clear boundaries.
- PromptInput continues to support both provider-managed and local attachment modes, drag/drop, paste detection, error handling, and speech input with existing public API unchanged.
- Automated lint/test suite passes without regressions; developer docs updated to reflect new module map.

Deliverables
- Refactored PromptInput module tree (likely under `src/components/ai-elements/prompt-input/`) containing provider context, attachment components, main form, textarea, speech controls, action menu primitives, etc.
- Updated `src/components/ai-elements/prompt-input.tsx` exporting the reorganized components or re-export barrel.
- Documentation snippet (docs or story) that explains new structure and how to import/use subcomponents.
- Passing lint/tests evidence (pnpm lint, pnpm test) recorded in task notes/PR.

Approach
1) Inventory and categorize current responsibilities (provider/context, attachment rendering, form logic, textarea behaviors, speech button, UI primitives). Decide target files/hooks per category.
2) Extract shared context/hooks into `prompt-input/context.ts` (or similar) ensuring provider + optional hooks remain accessible; write unit tests if feasible.
3) Move provider-specific state management into `prompt-input/provider.tsx`, ensuring cleanup of blob URLs and registration logic remains intact.
4) Split UI pieces: attachments list/card, form wrapper, textarea, tools/buttons, action menu, select/hover-card wrappers, speech button, etc., each in their own file or grouped logically (e.g., `attachments.tsx`, `inputs.tsx`). Keep presentational components lean with clear props.
5) Update `prompt-input.tsx` to compose the pieces, removing redundant imports; ensure exports remain backward-compatible (re-export components from new modules as needed).
6) Run `pnpm lint` and `pnpm test` to confirm no regressions; fix any issues. Update docs referencing new import paths and explain provider usage.

Risks / unknowns
- Potential hidden coupling between sections (e.g., attachments + textarea) could break during extraction; need thorough regression testing.
- Lack of existing automated coverage around drag/drop and speech functionality may necessitate manual verification.
- Consumers might rely on deep imports; confirm final export surface remains stable (assumption: only default exported API from `prompt-input.tsx` is used).

Testing & validation
- `pnpm lint` for formatting/types; `pnpm test` for unit/integration coverage.
- Manual smoke test of PromptInput in story/page: typing, Enter submission, shift-enter newline, attachments via button/drag-drop/paste, removal, speech button, select/action menus.
- Verify blob URL cleanup by adding/removing attachments repeatedly (memory leak prevention).

Rollback / escape hatch
- Keep refactor on dedicated branch; if regressions found, revert to previous monolithic file via git. Optionally keep old file history for quick reversion.

Owner/Date
- Codex Assistant / 2025-12-10
