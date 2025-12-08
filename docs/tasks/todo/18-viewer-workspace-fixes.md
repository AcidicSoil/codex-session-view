Context
- Explorer and Inspector tabs crash with “useViewerWorkspace must be used within ViewerWorkspaceProvider,” indicating missing provider scope.
- Layout collapses/offflows in half-screen mode, hiding panels without horizontal scrolling.
- Logger view shows server logs instead of browser console errors/logs, defeating its debugging purpose.

Success criteria
- Explorer/Inspector render without context errors; ViewerWorkspaceProvider reliably wraps all consumers.
- At 50% viewport width (and smaller), panels remain visible/scrollable with no horizontal overflow.
- Logger view captures and displays browser console logs/errors only, excluding server-side noise.

Deliverables
- Provider/context wiring changes (routes/components) ensuring proper hook usage.
- Responsive CSS/grid updates for Explorer/Inspector/Chat surfaces at half-width.
- Logger pipeline update to source browser console output plus UI adjustments/documentation.

Approach
1) Provider audit: trace routing/component tree, wrap missing areas with ViewerWorkspaceProvider, and add guardrails for useViewerWorkspace consumers.
2) Responsive layout refactor: define breakpoints, add flex/grid adjustments, clamp widths, and ensure vertical scroll replaces horizontal overflow.
3) Logger integration: implement browser-console capture (client hook or API), adapt Logger view to render new payload, and document usage.
4) Verification: exercise all tabs at multiple widths; confirm Logger reflects browser logs and context errors are resolved.

Risks / unknowns
- Assumption: all Explorer/Inspector descendants should use the shared provider; otherwise hooks must degrade gracefully.
- Responsive fixes may require touching multiple shared components; risk of regressions elsewhere.
- Logger may need backend support to transport browser logs; unclear if infrastructure exists.

Testing & validation
- Manual QA across Viewer tabs at 50%/100% widths, verifying absence of context errors and layout overflow.
- Trigger browser console logs/errors; ensure Logger view captures them and excludes server logs.
- Regression: run existing unit/e2e suites covering chat/inspector flows after refactors.

Rollback / escape hatch
- Keep previous layout/provider wiring behind feature flag or branch; if Logger capture fails, fall back to server logs temporarily while logging missing data.

Owner/Date
- Fullstack team / 2024-05-21
