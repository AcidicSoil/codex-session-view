Context
- Hookify Analysis Results panel inside Session Intelligence workflow is clipped at bottom when rendered in Hook Discovery results area, hiding the Summary and lower content.
- Scrollable container height currently exceeds viewport, forcing awkward inner scrolling and reducing readability for users reviewing analysis details.
- Session Coach spec + `CoachScrollRegion` rules already define viewport-relative max-heights (`--coach-panel-max-height-*`) and sticky headers; Hookify tab currently violates this because the dialog shell (`h-[85vh]`) + stacked headers consume more height than the scroll body allows.

Success criteria
- Results container height dynamically respects viewport limits (e.g., max-height via CSS or viewport-aware layout) so no content is permanently clipped.
- Summary section and bottom actions are visible without overlapping the viewport edge; user can reach bottom via primary page scroll if needed.
- Layout adapts across common desktop viewports without regressions to other dashboard panels or other Coach scroll regions.
- Lint/tests pass and visual regression risk is covered by updated tests/docs as applicable.

Deliverables
- Updated layout/component code ensuring Hookify Analysis Results panel uses responsive sizing (modal/panel with flexible height, fixed header/footer as needed).
- Any new utility hooks/styles required to compute viewport height safely.
- Documentation notes (CHANGELOG, relevant docs) describing the fix and behavior expectations.
- Tests (unit/visual/e2e snapshot) that cover the expected visibility or layout constraints where feasible.

Approach
1) Inspect existing Session Intelligence Hook Discovery results components/styles to understand how Hookify Analysis Results panel is mounted, along with current container constraints. ✅
2) Define sustainable layout adjustments (e.g., convert to modal with fixed header/footer, apply `max-height: calc(100vh - offset)` or responsive flexbox) that ensure full visibility while preserving design system rules. ✅ — Use Coach scroll tokens + dialog height offsets derived from spec.
3) Implement responsive container logic, ensuring the panel header/footer remain fixed while the body scrolls if necessary; keep Summary accessible.
4) Update styles/tests/docs to reflect new behavior and verify no other panels are affected; add regression tests or visual checks if possible.
5) Validate in multiple viewport sizes, run lint/tests, and document changes in CHANGELOG.

Risks / unknowns
- Specific breakpoints that trigger clipping are unknown; may need to test across sizes and ensure no regressions on very small viewports.
- Potential interactions with surrounding layout (dashboard grid, other modals) might require coordinated changes; need to confirm no shared styles depend on current behavior.
- Lack of provided design spec for modal sizing; may require assumptions or follow-up clarifications from design.

Testing & validation
- Run `pnpm lint` and relevant component/unit tests.
- Execute UI/e2e tests covering Session Intelligence Hook Discovery flow if available, focusing on viewport height behavior.
- Manual verification in local dev across representative desktop widths (e.g., 1280px, 1440px) and smaller laptops (~1024px height).

Rollback / escape hatch
- Revert component/style changes to previous commit if unexpected regressions occur; feature flagged if necessary though not currently planned.

Owner/Date
- Codex / 2025-12-18
