Context
- Chat Dock cannot read the session data already loaded in the Codex Session Viewer, so users must re-share context manually.
- Inspector timeline events (with IDs) and "Add to chat" items never reach the assistant, breaking Session Coach workflows.
- We need a sustainable mechanism that grants the assistant read access to any active session and event-level details.

Success criteria
- Loaded sessions automatically become available as assistant context without extra uploads.
- Referencing an event ID in chat returns the correct event content (messages, tool invocations, outputs).
- "Add to chat" reliably injects the selected timeline slice into the assistant context without duplication prompts.
- Assistant responses cite the correct session name/ID to prove it is reading the active session.

Deliverables
- Implementation that exposes loaded session/timeline data to Chat Dock (UI + backend wiring as needed).
- Updated documentation covering the new context-sharing model and any UX affordances.
- Automated tests (unit + e2e) verifying event ID queries and Add-to-chat flows.

Approach
1) Audit current data flow: confirm Viewer loader → `fetchChatbotState` is the single source for session snapshots, misalignments, and chat threads; document gaps where Chat Dock drops metadata during “Add to chat.”
2) Design a shared session context service/API (likely TanStack AI tools backed by server functions) that exposes timeline lookups (`getEventById`, range queries) and persists event references alongside chat turns.
3) Implement backend plumbing: extend TanStack AI tool definitions + ToolCallManager handlers so Chat Dock can invoke the new session tools, while updating server persistence (Postgres/Electric plan) to store event metadata and chat-to-event links.
4) Update frontend flows: “Add to chat” should send structured event references (ID/index + payload hash) into the new API, hydrate Chat Dock messages with those references, and display when context is available or needs refreshing.
5) Expand tests: unit coverage for tool definitions, session snapshot resolvers, and chat message metadata; e2e tests covering event-ID queries, multi-event Add-to-chat, and tool-calling success/error paths.
6) Refresh docs/CHANGELOG and instrument telemetry to log unresolved event ID lookups, tool-call failures, and session-binding issues.

Risks / unknowns
- Unknown storage source (local file, indexedDB, in-memory) may limit how the assistant process can read session data.
- Large sessions could cause performance issues if eagerly injected into chat context; may need pagination or capped payloads.
- Permissions/privacy: ensuring only authorized sessions are exposed to the assistant.

Testing & validation
- pnpm test (unit) for new selectors/services.
- pnpm e2e with a fixture session verifying event ID referencing and Add-to-chat flow.
- Manual exploratory pass covering multi-session switching and very large session files.

Rollback / escape hatch
- Feature flag the shared session context access; toggle off to revert to current behavior if regressions appear.

Owner/Date
- Codex (ChatGPT) / 2025-12-18
