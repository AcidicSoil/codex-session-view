Context
- Session explorer cards currently offer "Copy ID" and "Load session" actions but lack a direct path to hand an asset to the ChatDock.
- Timeline items also need an "Add to chat" affordance below their Message badge so events can be attached to conversations.
- A MagicUI ShimmerButton component is available; we just pulled it into the codebase and need to integrate it into both surfaces.

Success criteria
- ShimmerButton renders next to the existing Copy ID action within the session explorer card actions.
- Timeline message badges display a ShimmerButton labeled "Add to chat" with styling consistent with surrounding UI.
- Buttons pass sufficient metadata via props/callbacks so ChatDock can consume attachments later (even if handlers are stubbed now).
- No regressions to layout responsiveness on desktop or mobile breakpoints.

Deliverables
- Updated viewer components (session explorer card + timeline item renderer) wiring the new button and placeholder `onAddToChat` props.
- Optional prop plumbing (e.g., event/session data) to surface attachments to parent components.
- Snapshot or unit tests updated/added if components are covered.

Approach
1) Introduce `onAddToChat` handler props in the relevant components (`SessionCard`, timeline render tree) and ensure parents can pass data; default to no-op when undefined.
2) Import `ShimmerButton` from `~/components/ui/shimmer-button` and render it adjacent to “Copy ID” within session explorer actions, matching spacing and accessibility semantics.
3) Update `renderTimelineItem` (or nested UI) to place the ShimmerButton beneath the Message badge, ensuring layout doesn’t collapse on non-message events; hide/disable when data missing.
4) Thread placeholder callbacks up to `UploadSection`/`TimelineWithFilters` (and possibly `ChatDock`) so wiring is ready for future attachment logic.
5) Smoke-test layout responsiveness and run component/unit tests (or add ones) to guarantee rendering stability.

Risks / unknowns
- ShimmerButton’s animation may conflict with current dark theme or contrast requirements—may need overrides.
- Timeline virtualization might re-render frequently; ensure the new button doesn’t trigger expensive reflows.
- ChatDock attachment API isn’t defined yet; assumptions about data shape may change.

Testing & validation
- `pnpm vitest run` for any affected component tests (add new tests if coverage exists for SessionList/Timeline).
- Manual UI verification in the viewer page across light/dark themes and narrow widths.

Rollback / escape hatch
- Revert component changes while keeping the ShimmerButton component available for future use if integration causes issues.

Owner/Date
- Codex / 2025-02-14
