Q1: Which other clients (if any) rely on the legacy preset-based `/api/sessions/search` payload, and can they migrate on the same timeline?

* Answer: In this repo there is currently no `/api/sessions/search` route or handler at all; the only API routes under `src/routes/api` are `/api/test` and `/api/chatbot/$sessionId` / `/api/chatbot/general`.
  The Session Explorer UI reads from the local discovery snapshot (`viewerDiscovery`) and filters/sorts entirely client-side via `useSessionExplorerModel` and `sessionExplorerUtils`, without any network call to a search API.
  Within this codebase, there are therefore zero consumers of a preset-based `/api/sessions/search` payload today; any other clients would live in a different service and cannot be inspected here. Whether they exist and can migrate on the same timeline is not answerable from this repository and requires external product/infra knowledge.

Q2: Should the new Filters popover persist selections via route search params so deep links are possible, or is session-scoped state sufficient?

* Answer: The intended direction in this repo is to persist shareable viewer state in route search params, not only in session-scoped UI state. The main viewer route already validates and hydrates timeline state (event range and command filter) from `search` via `parseViewerSearch` / `viewerSearch` and pushes changes back with `applyViewerSearchUpdates`.
  Session Explorer filter state today is persisted only in `UiSettingsSnapshot.sessionExplorer` via `useUiSettingsStore`, which is per-profile stored UI state, not URL-addressable.
  The task plan explicitly calls out “hydrate state from route loaders/search params” for the refactored Session Explorer.  Together with the AGENTS rule “Belongs in URL → typed search params” for user-visible state,  the correct choice for this implementation is:

  * Persist the new Filters popover selections in typed route search params so that deep links and reloads round-trip the sort/filter state.
  * Mirror that into `useUiSettingsStore.sessionExplorer` as a persistence/cache layer, but treat the URL search object as the canonical source for the explorer’s visible filter state.

Q3: Are Duration and Name sorting fully supported by the backend today, or do we need additional indexing/data work before surfacing them?

* Answer: There is no `/api/sessions/search` backend in this repo at all, so there is no existing server-side sort support to rely on.
  On the client side, Session Explorer sorting is purely in-memory and limited to `SortKey = 'timestamp' | 'size'`. `sortSessions` only consults `session.size` and `session.sortKey`, with `sortKey` derived from the asset path (timestamp-ish) in `viewerDiscovery`.
  There is no concept of a “Duration” sort in the explorer types or utilities, and no precomputed duration field on `DiscoveredSessionAsset`. “Name” exists only implicitly via `session.displayLabel` / `path`, not as a configured sort key.
  Conclusion for this codebase: Duration and Name sorting are not supported anywhere on the backend (because the endpoint doesn’t exist here) and not modeled as sort keys on the frontend. Implementing the plan’s `{ sort: { field, direction } }` contract with `Duration` and `Name` will require new data/queries on whatever service actually implements `/api/sessions/search`, plus corresponding changes to the shared types used by this viewer.

Q4: What accessibility expectations (keyboard traps, focus management, screen-reader copy) must the new Filters popover meet?

* Answer: The baseline in this repo is the shared `Popover` primitive in `src/components/ui/popover.tsx`, which is built on `react-aria` overlays (`useOverlayTriggerState`, `usePopover`, `DismissButton`, `usePreventScroll`) and already encodes the accessibility model. It exposes a `modal` flag that toggles `isNonModal: !context.modal` in `usePopover`, controlling focus trapping and aria-modal behavior.
  For the new Session Explorer Filters popover, the expectations are:

  * Use the shared `Popover`/`PopoverTrigger`/`PopoverContent` components from `~/components/ui/popover` rather than custom overlays, with `modal={true}` for this filter UI so focus is contained while open and background content is inert.
  * Trigger must be a real button (or `asChild` button) with visible label or `aria-label` (e.g., the existing “Filters” trigger in `ViewerFilterDropdown` is the pattern).
  * On open, initial focus moves into the popover (first interactive control or the main heading), and focus is trapped inside until the user closes it via Escape, the close affordance, or clicking the underlay; on close, focus returns to the trigger. This behavior is provided by `usePopover` + `DismissButton` when used correctly.
  * All filter controls (sort dropdown, range inputs, checkboxes, apply/reset actions) must be reachable and operable with keyboard alone (Tab/Shift+Tab order, Enter/Space activation, arrow keys where applicable), using semantic elements (`button`, `input`, `select`) rather than clickable divs.
  * Screen-reader copy must clearly describe the popover and its sections: an accessible name for the dialog (e.g., “Filter sessions”), labels for each field (size range, timestamp range, recency, tags, repositories), and text that makes the effect of each control obvious. Where the visual UI uses icons or compressed badges, add text or `aria-label` equivalents.
  * No keyboard traps: the only “trap” is the intentional focus containment while the modal is open; user must always be able to exit via Escape or a close button, with no hidden states that require a mouse to recover.
