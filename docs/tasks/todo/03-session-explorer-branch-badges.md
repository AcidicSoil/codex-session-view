Context
- Session explorer cards currently show total session counts per repo/branch grid but don’t indicate how many branches each repo spans.
- Stakeholders want a “branches” badge next to the session count so reviewers can gauge coverage at a glance.
- Screenshot reference (public/screenshots/Screenshot 2025-11-24 161953.png) shows desired placement adjacent to the session count text.

Success criteria
- Every repo entry in the session explorer header shows both “sessions” and “branches” counts with clear labels and consistent styling.
- Counts accurately reflect the number of unique branches represented in each repo group.
- Layout remains responsive (badges wrap gracefully on narrow widths) and accessible (ARIA labels/text).

Deliverables
- Updated `SessionList` (or child components) to compute/display branch counts.
- Any supporting utility changes (e.g., ensuring branch aggregation returns unique counts).
- Screenshot or Storybook snippet optional; no new docs unless styling rules need recording.

Approach
1. Extend the repository group model in `SessionList` to expose `branchCount` (already tracked but ensure it counts unique branches).
2. Update the repo header UI to render an additional badge/chip labeled “Branches: X” next to the existing session count, matching the screenshot placement.
3. Verify mobile/desktop layout and adjust spacing so the badges align cleanly with existing typography.
4. Update tests (e.g., `DiscoveryPanel.test.tsx`) to assert the new text is rendered for sample repos.

Risks / unknowns
- Need to confirm whether “branch count” should include empty branches or only those with visible sessions.
- Additional badge might crowd space on very long repo names; may require responsive stacking.

Testing & validation
- `pnpm vitest run tests/DiscoveryPanel.test.tsx` (and any other relevant viewer tests) to ensure counts render.
- Manual visual check in browser for both light/dark themes.

Rollback / escape hatch
- Revert the `SessionList` UI changes; branch aggregation logic is already present so the revert is straightforward.

Owner/Date
- Codex / 2025-02-14
