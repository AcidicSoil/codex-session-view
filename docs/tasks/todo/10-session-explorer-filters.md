Context
- Session Explorer currently exposes overlapping filter controls (All/Recent/Large toggle, sort dropdown, Advanced accordion) that confuse users and waste above-the-fold real estate.
- There is no `/api/sessions/search` implementation inside this repo—the explorer runs entirely off the local discovery snapshot—so there are zero in-repo callers and any backend schema changes depend on external services that must be audited first.
- The viewer already treats other state (timeline/search) as URL-driven, so the explorer filters must also move to typed search params to stay canonical and sharable per AGENTS guidance.
- Duration and Name sorting are not implemented anywhere (no server data, no front-end sort keys), so exposing those controls in the UI is gated on a future data/infra contract.

Success criteria
- A documented caller inventory (or confirmation that none exist in this repo) plus a named external owner + migration window for `/api/sessions/search`.
- A signed-off API contract enumerating sortable fields/directions, duration/name data guarantees, and pagination behavior so the UI knows when Duration/Name sorting can launch.
- A typed Session Explorer search schema that captures sort field/direction and deep-linkable filter facets, with backward-compatible handling for any legacy params or store snapshots.
- Session Explorer UI surfaces one dropdown plus a Filters popover/panel that hydrate from router search, emit the normalized payload, and meet accessibility expectations (modal focus trap, labeled controls). Tests/docs reflect the new flow.

Deliverables
- Updated Session Explorer UI components implementing the unified dropdown and Filters popover (or inline panel) tied to router search.
- Documented `/api/sessions/search` dependency findings (no internal callers, external owner contact) plus the normalized payload contract once agreed.
- Typed search schema + helper utilities, automated unit/e2e coverage, and refreshed docs/changelog describing behavior and accessibility guarantees.

Approach
1) Document today’s state: confirm (and record) that this repo lacks `/api/sessions/search`, identify the external system/owner, and agree on a migration window or compatibility plan for any downstream consumers.
2) Partner with that owner to define the normalized payload contract (sortable fields/directions, duration/name data guarantees, pagination/order semantics) and capture blockers that prevent exposing Duration/Name sort immediately.
3) Design and implement the typed Session Explorer search schema + helpers so router search becomes the canonical state while mirroring to `useUiSettingsStore` for persistence/back-compat.
4) Implement the Session Explorer UI refactor per the schema: remove All/Recent/Large + Advanced UI, add the unified sort dropdown and accessible Filters popover/panel, and ensure state changes navigate via router search.
5) Ship validation + docs: backend contract/unit tests (in the owning service) plus frontend unit/e2e coverage, documentation updates, changelog entry, and a rollback/feature-flag strategy.

Risks / unknowns
- External `/api/sessions/search` consumers might not be ready to migrate, forcing dual payload support or phased rollout.
- Duration/name sorting requires new backend data/indexes; delays there block the UI work for those sort modes.
- Range validation (units, timezone alignment) may surface edge cases that require backend normalization.
- Ensuring the popover remains accessible and responsive could require new shared components.

Testing & validation
- Backend contract/unit tests for `/api/sessions/search` verifying valid/invalid payloads and preset equivalence.
- Frontend unit/e2e tests covering dropdown sorting, filter popover interactions, and loader/search-param wiring.
- Manual regression on Session Explorer to confirm performance and analytics tracking remain intact.

Rollback / escape hatch
- Keep a feature flag or environment toggle that allows serving the legacy UI and accepting preset payloads until the new flow proves stable.

Owner/Date
- Codex / 2025-12-12
