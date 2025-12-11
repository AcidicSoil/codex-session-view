Context
- The Session Viewer nav (`ViewerNavbar` in `src/features/viewer/viewer.navbar.tsx`) already wraps the ScrollX-inspired `NavbarFlow` component but still scrolls away or flashes because its sticky styles and parent containers (`NeuralGlow`, `main`) were never hardened for long inspector timelines.
- Product request in `todo-navbar-flow-sticky-w-scroll-effect.md` asks for a glassy sticky experience that keeps the "Session Flow" controls visible while users inspect logs, including backdrop blur, translucent background, and a consistent border with high z-index.
- Repo-wide guidelines (single-responsibility files, TanStack Start SSR rules, hide-on-scroll behavior via `useHideOnScroll`) mean the sticky treatment must live in the presentation layer without introducing loader side effects or DOM hacks.

Success criteria / acceptance
- `viewer-navbar` root stays affixed at the top of the scroll container using `position: sticky; top: 0`, paired with `z-index` and backdrop styles so it never dips behind content across breakpoints.
- Glassmorphism styles (background token, blur, subtle border) apply consistently on desktop and mobile states without mutating unrelated CSS and without layout shifts during hide/show transitions.
- Sticky behavior coexists with `useHideOnScroll`: nav hides only when intended, reappears smoothly, and automated Playwright specs confirm data attributes / transforms match expectations.
- Parent containers avoid `overflow: hidden` conflicts, ensuring keyboard and screen-reader navigation remain unaffected.
- `pnpm lint`, `pnpm test`, and relevant e2e specs pass, proving there are no regressions in navigation, Review Rules CTA, or viewport sizing.

Deliverables
- Refined `NavbarFlow` styles or companion CSS module encapsulating sticky/backdrop/border tokens referenced by `ViewerNavbar`.
- Optional wrapper (e.g., `ViewerNavbarShell`) or layout adjustments in `ViewerWorkspaceChrome` to guarantee compatible scroll context and spacing.
- Documentation snippet (under `docs/components` or `docs/tasks/log`) describing how sticky props/classNames are configured for Session Flow.
- Updated automated tests (component + e2e) covering the sticky-on-scroll visibility contract and ensuring `data-testid="viewer-navbar"` stays rendered while scrolling.

Approach
1) **Audit structure & constraints**: Inspect `NeuralGlow`, `main` container, and `NavbarFlow` root classes to catalog existing overflow, padding, and z-index rules; confirm whether sticky should apply at the `NavbarFlow` div or an outer shell and capture assumptions about scroll parents.
2) **Design sticky tokens**: Define background variable (prefer theme token, fallback `#05060f/90`), blur amount, and border color inside a dedicated style module or Tailwind class helper so desktop/mobile variants reuse the same values; ensure tokens account for dark/light themes.
3) **Implement sticky container**: Update `ViewerNavbar` (or a new `viewer.navbar.shell.tsx`) to wrap `NavbarFlow` in a `sticky` section that sets `top`, `z-index`, backdrop blur, and border while preserving existing padding/margins; guard against parent `overflow` issues by adjusting layout wrappers if needed.
4) **Coordinate with hide-on-scroll**: Ensure the sticky shell reads `isHidden` state to translate/opacity animate without toggling `position`; add regression tests or Storybook docs to validate threshold behavior and no jumpiness when switching routes.
5) **Validate & document**: Refresh Playwright flow to scroll the viewer and assert nav visibility, add a quick unit test (e.g., `ViewerNavbar.test.tsx`) asserting the sticky classes, capture the configuration in docs, and run `pnpm lint` + `pnpm test`.

Risks / unknowns
- Parent components (`NeuralGlow`, `main`, or intermediate divs) might later reintroduce `overflow: hidden`, breaking sticky unless accounted for.
- Hide-on-scroll translations may conflict with `position: sticky` (e.g., double transforms) causing jitter on Safari; may require tuning thresholds or using `transform: translate3d`.
- Backdrop blur and high z-index could impact performance on low-end devices; may need reduced-motion or blur fallback.
- Need clarity on whether other routes (e.g., marketing pages) also rely on `NavbarFlow`; shared changes must remain opt-in via props/className to avoid regressions.

Testing & validation
- Manual verification across Chrome, Safari, Firefox, Edge and responsive breakpoints to ensure nav stays pinned, blur renders correctly, and transitions remain smooth.
- Playwright scenario that scrolls long inspector content, asserts `data-testid="viewer-navbar"` bounding box remains at viewport top, and checks `data-visibility` toggling when hiding.
- Unit test for `ViewerNavbar` (or snapshot) confirming sticky classnames and `z-index` props; run `pnpm lint` and `pnpm test` before submission.

Rollback / escape hatch
- Keep sticky styling guarded behind a prop/class toggle so reverting only requires removing the wrapper or flipping the prop without touching navigation logic.
- Document previous className set so we can revert by reapplying the legacy non-sticky styles if bugs surface.

Owner / date
- Codex / 2025-12-11
