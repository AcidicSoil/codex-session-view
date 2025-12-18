Context

- Session Coach (per `README.md` + `docs/agents/viewer-architecture.md`) anchors the Chat Dock, AI Analysis pop-outs, and Hook Discovery fabrics inside the viewer route, yet each panel presently clips overflow so analysts cannot review full conversations, analysis narratives, or discovery lists.
- UX feedback highlights that scrolling the Chat Dock currently drags the entire Session Coach column, causing AI Analysis text to jump and making side-by-side analysis impossible.
- Hook Discovery’s result grid also truncates long runs and its header needs to stay locked so filters/actions remain visible while scrolling.
- The remediation must stay within the current Session Coach shell (no wholesale layout changes) but adopt a confident aesthetic direction (industrial brutalist with bespoke scrollbars) consistent with the frontend-design skill to reinforce the product identity.

Success criteria

- Chat Dock vertically scrolls with overflowed threads while the parent column remains fixed; wheel/trackpad/touch input captured over the dock never propagates upward, and keyboard navigation (`PageUp`, `PageDown`, `Home`, `End`) respects the dock focus trap.
- AI Analysis vertically scrolls independently with identical focus/keyboard affordances, matching Chat Dock widths and respecting defined min/max heights for desktop (≥1024px), laptop (768–1023px), and tablet (640–767px) breakpoints.
- Hook Discovery results gain their own scroll region with the header + action row locked to the top; long result sets remain accessible without moving Chat Dock or AI Analysis columns.
- Custom scrollbars (4px rail, high-contrast thumb, hover-intensified accent) are implemented consistently across all three panels with reduced-motion fallbacks and WCAG-compliant contrast ratios.
- An explicit interaction spec documents simultaneous-overflow behavior: hovered panel captures scroll, Shift+scroll cycles focus, and focus outlines + aria-live cues describe the active scroll region.

Deliverables

- Updated layout/CSS/JS for Chat Dock, AI Analysis, and Hook Discovery wrappers enforcing `overflow-y: auto`, min/max heights, and sticky headers without regressing TanStack Start data loading.
- Design tokens + SCSS/Tailwind variables for the brutalist-industrial scroll aesthetic (charcoal rails, acid green accent, typographic scale) plus documentation in `/docs/` describing focus, keyboard, and responsive behavior.
- Interaction spec (Markdown or Figma extract) outlining simultaneous-overflow focus rules, header locking, scrollbar visuals, and touch vs. desktop gestures.
- Automated regression assets: React Testing Library coverage for overflow props that snapshot each scrollable state, and Playwright smoke verifying independent scroll contexts.

Approach

1) **Research & mapping:** Inventory the DOM/CSS hierarchy for `ChatDockPanel`, `AIAnalysisPanel`, and Hook Discovery containers (referencing `docs/agents/viewer-architecture.md`) to spot flexbox constraints, sticky headers, or virtualization code that may resist overflow changes; document existing sizes per breakpoint.
2) **Design direction + tokens:** Apply the frontend-design skill by committing to an industrial brutalist look—e.g., matte charcoal backgrounds (#0f1318), acid-lime highlights (#b1ff00), mono display typography for headers, and textured borders/noise overlays. Define CSS variables (`--coach-scroll-rail`, `--coach-scroll-thumb`, `--coach-panel-max-height-*`) and specify motion (subtle translateY reveal on scroll start) plus custom scrollbar styling.
3) **Interaction spec:** Draft the simultaneous-overflow behavior: hovered panel traps wheel/touch input, `Tab` cycles focus order Chat Dock → AI Analysis → Hook Discovery, `Shift+Scroll` reassigns focus, Hook Discovery header locked via `position: sticky`, and aria labels describe “Focused scroll region: <panel>”. Circulate spec for sign-off.
4) **Implementation:** Update component wrappers (likely under `src/components/chatbot` + `src/features/viewer`) to enforce `overflow-y: auto`, `min-height`, `max-height`, and sticky headers; ensure Hook Discovery header uses `top: 0`. Introduce custom scrollbar styles via global CSS or scoped modules with `@layer components` and guard with `prefers-reduced-motion` and `forced-colors` fallbacks.
5) **Validation + polish:** Populate fixtures (long chats, verbose AI outputs, 50+ Hook Discovery rows) to confirm no layout shift; capture responsive screenshots, run automated tests, and tune focus rings/accessibility copy. Update docs + changelog and handoff manual QA steps.

Risks / unknowns

- Keyboard and focus choreography across multiple scroll traps could confuse users if not communicated; spec/practical demos must ensure predictable tab order and screen reader copy.
- Flex/grid constraints or virtualization layers might override `overflow` properties; we may need to adjust container composition or add shim wrappers to isolate scroll contexts.
- Custom scrollbar styling must degrade gracefully in Firefox, Safari, and forced-colors/high-contrast modes to avoid accessibility regressions.
- Touch/trackpad kinetic scrolling could fight sticky headers unless we debounce `overscroll-behavior` and supply generous padding/mask gradients.

Testing & validation

- Manual QA script capturing desktop (1440×900), laptop (1280×800), and tablet widths with mouse, trackpad, and touch inputs; verify each panel’s scroll, sticky behavior, and focus cues individually and simultaneously.
- React Testing Library snapshot asserting `overflow-y: auto`, sticky header classes, and aria attributes toggle correctly; if virtualization is mocked, ensure sentinel elements exist for scroll height.
- Playwright scenario: seed long chat/analysis/discovery data, scroll each panel, assert other panels remain static, verify custom scrollbar visibility on hover, and confirm keyboard navigation/responsiveness.
- Run `pnpm lint`, `pnpm test`, and targeted Playwright suite (or `pnpm test:e2e viewer-scroll`) before sign-off.

Rollback / escape hatch

- Encapsulate scroll styling behind dedicated classnames/tokens so a simple git revert or feature-flag flip (e.g., `SESSION_COACH_SCROLL_FIX`) restores prior behavior without collateral damage.
- Maintain pre-change screenshots to compare quickly if regressions reported; document manual steps to disable the new scroll styles per panel if only one surface misbehaves.

Owner / Date

- Codex / 2025-12-18
