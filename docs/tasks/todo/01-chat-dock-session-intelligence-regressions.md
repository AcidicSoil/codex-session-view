Context

* Chat Dock workflows regress: Add to Chat only seeds Session Coach, tabs lose active session context, and chat history sometimes vanishes or resurrects after tab changes.
* Instruction Source, rule selection, and layout remain fixed-width/hardcoded, so cross-repo sessions display the wrong guidance and long chats truncate.
* Session Intelligence crashes with `Unexpected 'className' prop`, and related surfaces (Logger route) lack scroll bounds, signaling deeper renderer/state coupling issues.

Success criteria

* General and Session Coach share the same active session/event context, persist it through tab switches, and mirror indicators + rule sources for any repo.
* Chat history renders immediately for loaded threads, maintains chronological ordering with repeatable IDs, and new/cleared chats behave deterministically.
* Session Intelligence Summary + Hook Discovery run without error boundaries, showing rendered output; Logger route log view stays scrollable without page growth.
* Layout accommodates long chat content while keeping Instruction Source accessible via responsive or collapsible UI.

Deliverables

* Shared session/event context model plus updated Add to Chat handlers, tab containers, and Instruction Source wiring.
* Deterministic chat thread lifecycle (new/clear/history side panel) with persistence aligned to product storage.
* Refined chat/message renderer enforcing chronological ordering and immediate hydration-safe rendering.
* Session Intelligence renderer fix (className issue), plus Logger route scroll container adjustments.
* Automated test coverage: store/message unit tests and end-to-end coverage for Add to Chat, tab switching, Session Intelligence, and Logger interactions.

Approach

1. **Discovery:** Trace current Chat Dock architecture (stores, routes, Instruction Source, Session Intelligence, Logger) to document ownership boundaries and existing persistence.
2. **Shared context model:** Define a single source of truth (session id, repo id, event ids, label) and refactor Add to Chat + tab entry points to read/write it, ensuring hydration-safe storage (e.g., TanStack DB collection or Zustand slice above the tabs).
3. **Tab + history stabilization:** Decouple tab views from context/thread stores, implement explicit New/Clear/History flows, and guarantee switching tabs never mutates thread history unless user action demands it.
4. **Message rendering + layout:** Normalize/sort messages on ingestion, audit virtualization/suspense triggers for immediate render, and rework Chat Dock layout so chat pane flexes while Instruction Source becomes collapsible or header-mounted.
5. **Repo-aware Instruction Source:** Replace hardcoded rule data with lookups based on active context repo; invalidate on context change and show active repo indicators.
6. **Session Intelligence + Logger fixes:** Identify renderer violating `className` contract, wrap or adjust component to accept props safely, and bound Logger logs in a scrollable container with pagination/backpressure if volume is high.
7. **Validation:** Write regression unit tests covering the shared context store, message ordering helpers, and renderer props; add Playwright cases for Add to Chat, tab switching, Session Intelligence, Logger, and chat history persistence.

Risks / unknowns

* Unknown persistence strategy (server vs client) for chat history may constrain history panel scope and requires confirmation.
* Session Intelligence crash root cause might live in an external shared renderer or dependency, possibly necessitating broader upgrades.
* Ensuring deterministic ordering may require backend timestamps; if missing, a monotonic sequence generator must be added without breaking existing data.

Testing & validation

* Unit: shared context store transitions, message normalization/sorting, history lifecycle reducers, Session Intelligence renderer props.
* Component/integration: Chat Dock tabs displaying identical context indicators, Instruction Source repo switch rendering, Session Intelligence output rendering, Logger scroll container.
* E2E (Playwright): Add to Chat from Session Explorer and Timeline Inspector, repeated tab switching without context loss, chat history new/clear/resume, Session Intelligence Summary/Hook Discovery runs, Logger scroll behavior under large log volume.

Rollback / escape hatch

* Feature-flag the new shared context/history model and Instruction Source UI so the legacy behavior can be restored quickly if regressions appear.
* Keep renderer fixes isolated (wrapper component) and allow toggling back to the prior renderer while investigating.

Owner / date

* Codex Assistant / 2025-12-15
