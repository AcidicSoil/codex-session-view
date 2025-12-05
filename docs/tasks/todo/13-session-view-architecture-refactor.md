Context
- Current Codex Session Viewer crams Timeline, Uploads, Rule Inventory, Chat, and inspectors into one scrollable column, making chat unreachable and duplicating the "Review Rules" drawer content in multiple places.
- Layout bugs (non-scrollable Gate tab, hidden Session Explorer, sticky header regression, floating filter controls) plus non-functional filters/sorting leave users unable to explore sessions or rules reliably.
- Timeline-specific issues (unreadable long events, scroll beam tied to window scroll, blocked scrollbar interaction) and overflow glitches (upload path truncation, severity dropdown width) erode usability.
- Stakeholders want either an IDE-style split layout or fully separate routes (Home, Chat, Inspector) so navigation is clear, clutter is removed, and the "Review Rules" entry point is universally accessible.

Success criteria / acceptance
- Navigation exposes dedicated spaces (e.g., Home, Chat, Inspector) where Rule Inventory, Hook Gate, Upload/Stream, and Chat live in intentional panels without redundant copies.
- Rule Inventory filters/search/sorting work, persist across tab/route changes and refreshes (via lifted state or URL search params), and Review Rules button routes users directly to that view.
- Timeline scroll beam reflects container scroll progress, its scrollbar is usable, long events/props expand for full readability, and Gate tabs/other panels have reliable overflow behavior.
- High-priority controls (Eject Session, Filters) remain visible via fixed headers; cluttered toggles (Persist) are removed or replaced by automatic preference storage.

Deliverables
- Information architecture + layout spec describing the target route structure and panel responsibilities (with wireframes or annotated diagrams).
- Component migration matrix mapping current sections (Chat Dock, Instruction Source, Rule Inventory, Uploads, Hook Gate, Timeline) to their new homes and interaction contracts.
- Functional requirements doc covering filter/search persistence, sorting, timeline progress binding, overflow handling, and accessibility expectations.
- QA checklist outlining viewport scenarios, scroll behaviors, and interaction flows to verify once the refactor ships.

Approach
1. Audit the existing Session Viewer to catalog components, their data dependencies, duplicate surfaces, and broken behaviors (filters, scroll beam, overflow) to establish baseline requirements.
2. Define the target navigation IA (Home/Chat/Inspector or IDE grid) with stakeholders, capturing which workflows live on each route/pane and how deep links like "Review Rules" resolve.
3. Design the persistence strategy for tabs/filters (lifted state + URL search params or future auth-backed prefs), specifying removal of the "Persist" toggle and location for contextual filter controls.
4. Produce layout and component refactor specs: relocate Chat + Instruction Source to `/chat`, consolidate Rule Inventory and Hook Gate inside `/inspector`, reshape Timeline + Session Explorer into scrollable containers with CSS Grid/Flex, and ensure Eject Session sits in a fixed inspector header.
5. Document detailed UI fixes (middle truncation for upload paths, width rules for inputs, timeline event expansion, Gate tab overflow, scroll beam logic bound to container refs, pointer-events on overlays) plus Review Rules navigation changes.
6. Sequence implementation with feature flags or preview routes, then run responsive + regression testing per the QA checklist before enabling the new layout by default.

Risks / unknowns
- Splitting routes may break existing bookmarks or internal navigation patterns unless redirects and shared state hydration are planned.
- Persisting filters via URL/localStorage could conflict with upcoming authenticated preference storage; requirements for cross-user behavior are unclear.
- Chat, Upload, and Inspector features might share context/state today; separating them could introduce synchronization bugs if APIs aren’t modularized first.
- Rebinding scroll/animation logic and heavy DOM reorganizing could introduce performance regressions or hydration issues without careful testing.

Testing & validation
- Manual end-to-end runs on each route verifying navigation, sticky headers, filters, Review Rules button behavior, and timeline scrolling/beam visuals on varying viewport heights and with DevTools open.
- Automated/unit tests for filter/search persistence, table sorting, and routing logic to ensure state survives tab and page reloads.
- Accessibility + usability spot checks (keyboard scrollability, readable truncation, expandable events) and responsive layout verification across breakpoints.

Rollback / escape hatch
- Keep the current single-page layout behind a router flag or feature toggle so traffic can revert instantly if regressions surface.
- Version shared components so UI modules can be swapped back without rewriting logic; document steps to re-enable the old navigation and header if KPIs dip.

Owner / date
- Frontend Platform / 2025-12-04
