Context
- Session Viewer currently packs Timeline, Upload/Instruction Source, Hook Gate, Rule Inventory, and Chat Dock into one scrollable canvas, duplicating the Review Rules drawer content, hiding the chat, and forcing users to hunt for core tools.
- Layout/regression issues (missing sticky nav + Eject control, non-scrollable Gate tab, Session Explorer disappearing on certain viewports, timeline scrollbar blocked) make exploration unpredictable across screen sizes and when DevTools is open.
- Table filters/sorting/search do not function or persist; state is siloed inside tabs so navigating between Timeline/Explorer resets work, and the "Persist" toggle confuses expectations for durable preferences.
- Timeline UX defects (scroll beam tied to window scroll, unreadable long events, overlay intercepting the scrollbar) and ambiguous components (Instruction Source living outside chat) point to a needed multi-route architecture with clear responsibilities per route.

Success criteria / acceptance
- Navigation exposes explicit routes (e.g., `/` home for discovery, `/chat` for Session Coach, `/inspector` for timeline/rules) and the Review Rules CTA always links into the Inspector without duplicating UI.
- Session Explorer, Timeline, Hook Gate, and chat panels each have dedicated scroll containers so content is visible regardless of viewport height, and sticky headers keep nav + Eject Session controls accessible.
- Filters/search/sorting for rules and sessions work, persist via lifted state + typed search params across route changes/refreshes, and redundant "Persist" toggles are removed in favor of automatic storage.
- Timeline interaction bugs are resolved: tracing beam reflects container scroll progress, scrollbar is draggable, long events/props expand or open detail views, and Gate tab drawers scroll fully.

Deliverables
- Information architecture spec documenting the new route map, navigation shell, and how Review Rules/alerts deep-link into Inspector.
- Component relocation + ownership matrix mapping each current surface (Chat Dock, Instruction Source, Upload & Stream, Rule Inventory, Hook Gate, Timeline, Session Explorer) to target routes/panels.
- State persistence + filtering requirements doc covering URL search param schemas (`validateSearch`, `Route.useSearch`) and loader/query integration for inventories.
- Timeline/Gate UX remediation checklist (beam binding, scrollbar hit areas, overflow rules, event expansion strategy) plus QA scenarios for varying viewport heights and DevTools states.

Approach
1. Audit current Session Viewer implementation to catalog components, data dependencies, and the broken behaviors (filters, sticky nav, beam, scroll overlays) and note which loader/query data each piece needs.
2. Define the target TanStack Router navigation: create `/`, `/chat`, and `/inspector` routes (plus optional `/upload` if needed), decide SSR settings per AGENTS.md, and specify how Review Rules buttons/link params navigate into Inspector with validated search params.
3. Produce layout specs per route: apply CSS Grid/Flex to keep chat/coach pinned, ensure Session Explorer + Timeline split vertical space with independent scrolling, reinstate a fixed header containing tab pills, Filters CTA (contextual), and sticky Eject Session control.
4. Design the persistence layer: lift filter/search/sort state to shared parents, mirror the state into URL search params for refresh survival, remove the manual Persist toggle, and plan future auth-backed preference syncing while defaulting to localStorage fallback.
5. Detail component moves/refactors: merge Instruction Source into Chat route, confine Hook Gate + Rule Inventory to Inspector tab panels, drop redundant Rule Inventory copies, wire functional sorting/filtering in the consolidated table, and ensure Upload/Stream lives where replay workflows belong.
6. Implement timeline-specific fixes (container-based scroll beam, pointer-events on overlays, expandable event rows/tooltips) and Gate drawer overflow rules, then capture regression + responsive QA cases before rollout; gate new routing under a feature flag for staged release.

Risks / unknowns
- Splitting into multiple routes may disrupt existing deep links; redirect strategy and legacy URL handling need confirmation.
- Shared state between chat, uploads, and inspector views might rely on implicit globals; extracting them without regressions requires careful design.
- Persistence requirements beyond URL/localStorage (future authenticated preferences) remain undefined and could change storage choices.
- Timeline performance or hydration behavior could regress when rebinding scroll listeners and reorganizing DOM structure.

Testing & validation
- Manual and automated navigation tests verifying each route renders expected components, Review Rules deep links land on Inspector, and sticky headers/Eject button stay visible across viewport sizes and with DevTools open.
- Integration/unit tests for filter/search persistence (URL param roundtrip, loader hydration) and table sorting behaviors.
- Timeline/Gate interaction QA: scroll beam progress accuracy, scrollbar drag usability, expandable event visibility, Gate tab scrollability, and overflow/truncation handling on upload paths + dropdowns.

Rollback / escape hatch
- Keep the current single-page layout behind a router feature flag so traffic can revert instantly if issues arise; retain legacy routes until telemetry confirms stability.
- Version shared components (Timeline, Rule Inventory, Chat) so old and new layouts can swap implementations without code deletion, enabling quick rollback by flipping imports.

Owner / date
- Frontend Platform / 2025-12-04

Assumptions / open points
- Stakeholders agree to the three-route split (Home, Chat, Inspector) and dropping inline duplicates of Rule Inventory/Chat surfaces.
- LocalStorage + URL params are acceptable interim persistence mechanisms until auth-backed preferences exist.
