Context

* Session Explorer layout currently wastes >200px with a static upload box that blocks proximity between search, filters, and the session list.
* Expanded filters expose every control simultaneously, overwhelming users and pushing primary data below the fold.
* Product request mandates adopting Cult UI FamilyDrawer patterns for upload + filters to restore spatial logic and keep the dashboard focused on reading data.

Success criteria

* Upload action becomes a single primary button that opens the Cult UI FamilyDrawer file-upload flow with scrim + modal semantics.
* Filters collapse into a secondary button that opens a custom-view drawer containing existing filter capabilities; main viewport remains dedicated to session list.
* Search bar and Session List sit directly adjacent with no intervening permanent blocks; layout responsive across desktop breakpoints.
* Drawer interactions preserve accessibility (focus trap, keyboard navigation) and do not regress existing upload/filter functionality.

Deliverables

* Refactored Session Explorer UI components implementing new button + drawer workflow.
* Cult UI FamilyDrawer integration (upload flow + filters) with any necessary adapter modules or theme tokens.
* Updated documentation (viewer architecture, component docs) and changelog entry describing the new interaction model.
* Automated tests (component/unit or e2e) covering drawer open/close, upload trigger wiring, and filter application persistence.

Approach

1. Audit current Session Explorer structure (Upload container, filter toolbar, list) to document dependencies, shared state, and styling constraints.
2. Design new layout hierarchy: Zone A navigation toolbar (search, Upload primary button, Filters secondary button), Zone B data list flush with header, Zone C drawers for overlays.
3. Implement Cult UI FamilyDrawer wrappers for both Upload and Filters, each with dedicated modules (e.g., `UploadDrawer`, `FiltersDrawer`) to avoid god components.
4. Move upload logic into drawer content: reuse existing upload form, ensure state + TanStack Start server functions remain intact, and add focus/scroll management tests.
5. Port filter controls into drawer; connect to Session Explorer search state (URL params) so drawer changes immediately reflect in list while UI remains uncluttered.
6. Polish styling (responsive spacing, tokens) and update docs/changelog; rerun regression + cross-browser testing.

Risks / unknowns

* Cult UI FamilyDrawer may require additional theming or licenses; integration constraints need confirmation.
* Upload + filter logic might rely on shared context assuming inline placement; moving into drawers could surface hidden coupling.
* Need to ensure drawers coexist with other overlays/modals without scroll conflicts.

Testing & validation

* Automated component tests for drawer triggers, focus trapping, and state synchronization with Session Explorer filters/upload actions.
* Manual regression across Chrome/Firefox/Safari ensuring drawers open/close, uploads succeed, filters apply, and layout holds on narrow widths.
* If available, run e2e flows (Playwright) for “upload session” and “apply filters” scenarios.

Rollback / escape hatch

* Keep legacy upload/filter components behind a feature flag or branch so we can revert quickly if Cult UI integration blocks release.

Owner/Date

* Codex / 2025-12-14
