Context
- The Codex Session Viewer currently behaves like a single long document, causing critical panes (Chat Dock, Session Explorer, Hook Gate inspector) to disappear, overlap, or become unreachable depending on viewport height or DevTools usage.
- Rule-centric UI is duplicated (in-page table plus Review Rules side sheet), filters/sorting are disconnected from data sources, and state resets whenever tabs/layouts change because it lives in ephemeral local component state.
- Timeline-specific affordances (scroll beam, scrollbar) are bound to the global window instead of the timeline container, breaking the intended progress indicator and preventing direct scroll interactions.
- Layout polish gaps (overflowing upload paths, truncated controls, non-sticky Eject Session CTA, confusing Persist toggle, unclear Instruction Source placement) create cognitive overload and obscure core actions.
- The user wants to split the experience into clear routes (Home/Explorer, Chat, Inspector) that follow TanStack Start best practices (route loaders, typed search params, minimal effects) while retaining the ability to open the same inspector context from alerts like "Review Rules".

Success criteria / acceptance
- Navigation exposes dedicated routes (e.g., `/`, `/chat`, `/inspector`) with consistent TanStack Router loaders; the "Review Rules" button navigates directly to the inspector context instead of spawning redundant sheets.
- Inspector view adopts an IDE-style grid so Timeline, Rule Inventory, Hook Gate, and Upload tools are simultaneously accessible with independent scrolling and a sticky toolbar (Eject Session always visible).
- Filters/search/sorting in Session Explorer, Rule Inventory, and Timeline function correctly and persist via URL search params (validated with `Route.useSearch`) and/or hydrated query cache so refreshes and layout changes maintain context.
- Timeline scroll beam listens to the timeline container, and its scrollbar is fully interactive (no overlay interception, pointer events corrected).
- Long text elements (upload paths, event payloads, dropdown labels) use middle truncation or expandable detail states so nothing bleeds outside its container; event rows expose a secondary interaction to read the entire payload.
- Chat Dock and Instruction Source are relocated per new routing/architecture without duplicated components; redundant on-page copies are removed.

Deliverables
- Architecture brief detailing the three-route split, shared loader contracts, and navigation updates (tabs/header, Review Rules entry points).
- Layout spec (grid/flex map) for the Inspector workspace covering Timeline, Hook Gate, Rule Inventory, Upload, and supporting scroll behaviors, including sticky toolbar requirements.
- Interaction spec for filters/sorting/state persistence outlining query param schemas, default loader behaviors, and fallback storage (localStorage/zustand) consistent with AGENTS.md.
- Engineering checklist for Timeline instrumentation (scroll beam refactor, scrollbar accessibility, gradient overlays, pointer events) and log readability affordances.
- Polish backlog covering upload path truncation, Session Explorer row densification (hide raw paths), removal of Persist toggle, relocation/rename of Instruction Source.

Approach
1) **Audit & mapping** — catalog all components currently rendered on the session view page, noting data dependencies (TanStack Query keys, server functions, loaders) and duplicate renderings (Rule Inventory, Hook Gate, Instruction Source). Identify which pieces belong to Home, Chat, or Inspector routes.
2) **Route architecture** — define new TanStack Router routes (with SSR considerations per AGENTS.md), route loaders, and shared contexts. Update nav/header to include links or tabs for Home, Chat, Inspector; wire "Review Rules" CTA to navigate with typed search params describing the active session/rule focus.
3) **Inspector layout blueprint** — redesign the inspector route using CSS Grid/Flex to create fixed header + dual-pane content (timeline stack with split Explorer vs. Chat/Config). Specify sticky toolbar actions (Eject Session, filters) and ensure each pane manages its own scrolling (`overflow-y: auto`).
4) **State & persistence plan** — lift filter/sort/search state into parent contexts or zustand stores scoped per AGENTS.md, serialize critical state into URL search params (`validateSearch`, `Route.useSearch`), and ensure loaders seed TanStack Query caches so refreshes hydrate correctly.
5) **Timeline interaction fixes** — scope UI tasks for binding the tracing beam to the container scroll position, exposing scroll controls without overlay conflicts, and adding expandable detail affordances/tooltip modals for long event payloads.
6) **Polish & cleanup** — document CSS/UX fixes (middle truncation, dropdown sizing, removal of Persist toggle, Instruction Source relocation, path display simplification) and ensure QA covers both desktop variations (DevTools open, narrow viewports) and hydration constraints (avoid new useEffect fetching per AGENT rules).
7) **Implementation sequencing** — outline incremental rollout (feature flags or hidden routes) so teams can ship Home/Chat/Inspector routes independently, followed by timeline fixes and final polish without regressing current functionality.

Risks / unknowns
- Splitting the page into routes may require duplicating or refactoring server loaders; shared state (selected session, active rule) must remain synchronized without over-fetching or violating AGENT loader rules.
- Moving filters into URL search params increases URL length and may expose sensitive identifiers unless properly sanitized; need guardrails for shareable links.
- Timeline/tracing beam fixes depend on reliable refs and container measurements; virtualization or incremental rendering could complicate scroll math.
- Removing components (e.g., Persist toggle) assumes silent auto-save/localStorage is acceptable; confirm no enterprise requirements for explicit user opt-in.

Testing & validation
- Add integration tests (Playwright or equivalent) per route to verify navigation, sticky controls, and filter persistence (refresh + back/forward) following TanStack loader hydration patterns.
- Unit or component tests for filter utilities, search-param serializers, and timeline scroll progress calculations.
- Manual QA matrix covering multiple viewport heights, DevTools open/closed, and hydration (SSR) flows to ensure no Suspense fallback regressions occur when state updates happen during hydration.
- Accessibility checks: ensure keyboard focus order works across routes, scrollable regions have visible focus, truncated text includes accessible expansion.

Rollback / escape hatch
- Implement the new routes and layouts behind feature flags or route guards so traffic can be directed back to the legacy single-page layout rapidly if regressions appear.
- Maintain the existing components in parallel until the new architecture is verified; keep the previous navigation entry points available (hidden) for quick re-enable.
- Version query param handling so older shared links still resolve by falling back to legacy behavior when unsupported params are detected.

Owner / date
- Frontend Platform Team / 2025-12-04

Assumptions / open points
- User authentication/persistence layer will eventually exist, but near-term persistence can rely on URL params + localStorage without violating product requirements.
- Upload & Stream tooling belongs on the Inspector route unless future requirements dictate a dedicated `/upload` route.
- Session data and rule inventories can be fetched via existing server loaders without introducing new data providers.
