Context
- Hook Gate UI + Rule Inspector still lack the integrated inspector, evidence formatting, persistence, and routing described in BUGFIX/Hook-Gate_rule-inspector.md and users-original-response.md, so blocked sessions remain hard to diagnose.
- PENDING/ visual + logic notes call for data-dense, retro-industrial treatments plus Timeline/Event upgrades (meteors background, dotted glow, expanders, traced scroll fix, misalignment links, tool-call parsing) that remain unimplemented after the last overhaul.
- Future auth + DB work is planned but not yet available, so the current plan must deliver client-side persistence + bookmark scaffolding that can later plug into server-backed storage without redesigning the UI.

Success criteria
- “Jump to event” always auto-loads sessions before focusing the timeline; button visible on both sides of expanded evidence cards.
- Evidence/rule text renders via a shared formatter so bullets, emphasis, and spacing stay legible across Hook Gate surfaces.
- Evidence cards expand + flip to reveal event context (user/assistant messages, metadata) with smooth motion, scrollable content, and dual jump controls.
- UI configs (filters, inspector state, sessions) persist across refresh for authed users (API placeholder) and degrade to localStorage for guests; reset obeys persistence rules.
- Bookmarks exist for sessions/events/chats/rules with toggle UI and storage hook ready for later DB wiring.
- “Review rules” reliably opens a global Rule Inspector surface (sheet/route) with tabs for Gate/Rules/Events/Inventory; inspector integrates the component stack outlined in BUGFIX docs and PENDING guidance (Resizable panels, Timeline upgrades, evidence cards, backgrounds, badges, etc.).

Deliverables
- Updated React components (`HookGateNotice`, `RuleInspectorSheet`, Evidence cards, session explorer/timeline surfaces) and supporting stores/hooks (session store, settings store, bookmark store, inspector store).
- Shared `FormattedContent` (or equivalent) utility to prettify all textual evidence/rule bodies.
- Persistence + bookmark scaffolding, plus API stubs or adapters for future DB/auth integration.
- Visual upgrades demanded by PENDING/visual/* (timeline glow, background treatments, hover reveals, expandable cards) and logic upgrades from PENDING/logic/* (tool-call parsing → `FileChange`, misalignment linking, traced scroll fixes).
- Tests updated/added (component/unit + integration via pnpm test) and documentation entries (CHANGELOG, relevant docs) referencing new capabilities.

Approach
1) Audit current Hook Gate + viewer components vs BUGFIX + PENDING requirements; catalogue gaps for jump-to-event, evidence formatting, persistence, bookmarks, inspector routing, and pending visual instructions.
2) Implement session auto-load + focus flow (zustand store or existing session model) and wire `JumpToEventButton` usages (HookGateNotice, EvidenceCard, timeline) to the new flow.
3) Build the shared `FormattedContent` formatter and refactor evidence/rule surfaces (EvidenceCard, RuleInspectorSheet tabs, ChatDock evidence list, SessionRuleSheet) to use it; ensure typography + spacing align with retro-industrial aesthetic.
4) Redesign Evidence cards with motion-based expand/flip behavior, dual jump buttons, scrollable context, and background/pattern updates per PENDING/visual guidance; integrate hover reveals for timeline items + dotted glow backgrounds while touching related components.
5) Create unified persistence + bookmark stores (settings + inspector + filters + bookmarks) with client/localStorage persistence now and server endpoints stubs; expose reset behavior and integrate across Session Explorer, Timeline Filters, Hook Gate inspector, bookmarks UI.
6) Implement the Rule Inspector shell (Sheet or route) that hosts Gate/Rules/Events/Inventory tabs, resizable panels, evidence timeline upgrades, misalignment-to-event linking, tool-call parsing, and inventory search/filter controls; update HookGateNotice “Review rules” to open/target this inspector and ensure router/store sync.
7) Update docs (CHANGELOG + plan linkage), run `pnpm test` (unit + vitest) and any viewer-specific tests, fix regressions, and capture follow-up work (auth/DB persistence) as TODO comments.

Risks / unknowns
- Persistence + bookmark APIs not defined yet; need clear stubs + future integration plan without blocking UI.
- Motion-heavy cards + tracing beams may impact performance on large evidence lists; may require virtualization or reduced effects under load.
- Ensuring retro-industrial aesthetic parity across existing + new components could require broader styling refactors than scoped.
- Tool-call parsing + misalignment linking rely on timeline data fidelity; edge cases (malformed tool call args, missing metadata) must degrade gracefully.

Testing & validation
- `pnpm test` (unit + component) after major checkpoints; add targeted tests for formatter logic, stores, and transformed timeline events.
- Manual verification in viewer: load sessions, trigger Hook Gate, expand/toggle inspector tabs, flip evidence cards, persistence reset (guest + simulated authed), bookmark toggling.
- Visual QA against PENDING/visual specs (timeline glow, backgrounds, hover reveals) in both light/dark themes if supported.

Rollback / escape hatch
- Feature flags or environment toggles to disable the new inspector and persistence layers, reverting to existing Hook Gate behavior if regressions emerge.

Owner/Date
- Codex / 2025-12-04
