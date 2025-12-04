Context
- Hook Gate / Rule Inspector UX currently blocks reviews: “Jump to event” fails when the target session is not preloaded, review button closes the gate, and dense markdown dumps overload users.
- Evidence + rule cards lack formatting/structure, making severity, context, and actions (jump, review) hard to parse inside the neon-lime inspector aesthetic defined in HookGateNotice/MisalignmentBanner.
- State such as filters, inspector tab, and bookmarks does not persist reliably across refresh/login states, limiting power users who triage many sessions.

Success criteria
- “Jump to event” always loads the required session (if missing) before focusing the event and keeps the inspector visible.
- All text surfaces (rules, evidence, chat context) render through a formatter that enforces spacing, inline emphasis, and scrollable regions without raw markdown clutter.
- Evidence/rule cards support flip + expand interactions (front/back w/ user+assistant context) with dual “Jump to event” buttons, smooth motion, and scroll-safe layouts.
- Authenticated users retain inspector settings (filters, active tab, selection) across refreshes/logouts while guests reset cleanly; reset honors auth vs guest behaviors.
- Users can bookmark sessions/events/chats/rules with backend persistence and helper UI affordances.
- “Review rules” reliably opens a dedicated inspector surface/route with Gate/Rules/Events/Inventory tabs instead of dismissing the notice.

Deliverables
- Updated client components (`HookGateNotice`, evidence/rule cards, inspector sheet/tabs, shared text formatting component) plus tests/story coverage.
- State management modules for session loading, inspector control, settings persistence, and bookmarks (zustand or TanStack DB collections + server APIs).
- Server/API changes to persist settings + bookmarks, plus loader/route wiring so inspector tabs hydrate correctly.
- Documentation updates (BUGFIX notes and/or README snippet) describing UX changes and persistence guarantees.

Approach
1. **Product + aesthetic alignment**: Reaffirm the inspector’s retro-futuristic neon direction (HookGateNotice, MisalignmentBanner) and enumerate which shadcn/registry components (Sheet, Tabs, ResizablePanelGroup, HighlightedText, etc.) power each surface so UI work stays cohesive.
2. **Session loading + navigation**: Introduce/extend a zustand session store with `loadSession`, `focusEvent`, and inspector hooks; wire “Jump to event” buttons to await loading, focus the event, and open the sheet without collapsing the gate.
3. **Text formatting pipeline**: Ship a shared formatter (`FormattedContent`) that handles markdown-ish line breaks, bullet lists, emphasized text, and code; integrate across evidence cards, rule details, inventory rows, and chat transcripts.
4. **Evidence/rule card interactions**: Implement flip/expand motion cards (Framer Motion or CSS) with scroll areas, dual action buttons, BorderBeam/ShimmerButton cues, and highlight blocks for user/assistant context.
5. **Persistence + reset logic**: Define `UiSettings` schema, storage hook (server-backed for authed, localStorage for guests), API endpoints, and reset behavior; hydrate on load and ensure inspector/search params stay URL-aligned per AGENTS.md.
6. **Bookmarks + inspector routing**: Add CRUD endpoints/collections for bookmarks, surface toggle buttons per entity, expose bookmarks in the inspector inventory tab, and implement a Rule Inspector sheet/route triggered by “Review rules.”

Risks / unknowns
- Hydration + Suspense: new stores and transitions must avoid client-only divergence (wrap potentially suspending updates in `startTransition`).
- Session loading order: ensuring `loadSession` resolves idempotently without race conditions or duplicate fetches when multiple jumps trigger quickly.
- Persistence security: distinguishing guest vs authenticated storage without leaking settings between users or causing stale caches after logout.
- Bookmark schema scope: clarifying which metadata (labels, tags) is required to make the feature valuable without overbuilding.

Testing & validation
- Unit tests for session store helpers, formatter, settings persistence, and bookmark hooks (pnpm test targeted files).
- Integration/UI tests for inspector navigation, card flipping, and bookmark toggling (e.g., Playwright / Vitest component tests) plus manual regression through the Hook Gate flow.
- Manual verification with multiple sessions/repos to ensure neon inspector styling remains crisp and state persists/falls back as expected.

Rollback / escape hatch
- Feature-flag new inspector behaviors (e.g., `HOOK_GATE_V2`) so the old gate UI can be reinstated quickly by toggling env/config if regressions appear.

Owner/Date
- Codex / 2025-12-04
