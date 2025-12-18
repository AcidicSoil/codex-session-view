Context
- Chat Dock now resolves timeline references implicitly, but the assistant still can’t on-demand fetch more events or clarify context mid-conversation.
- Analysts have no visual indication which event slices are already in scope, so “Add to chat” actions feel opaque.
- We need first-class tools wired through TanStack AI plus UI affordances so Session Coach can invoke them and users can verify context.

Success criteria
- LLM can call typed tools (`getTimelineEvent`, `listEventRange`) via TanStack AI during a chat turn; logs show tool usage tied to session IDs.
- Tool responses stream back into Chat Dock and appear as assistant messages referencing the retrieved events.
- Chat Dock surfaces context-event chips/badges per message, showing which timeline IDs are in scope and highlighting when data goes stale.
- E2E test proves user asks “show #15,” model triggers tool, and response cites that event without manual uploads.

Deliverables
- TanStack AI tool definitions, server functions, and persistence wiring for session event retrieval and range queries.
- Client-side tool execution plumbing (ToolCallManager integration, approval UX if needed).
- Chat Dock UI updates for context-event chips and transcript entries showing tool outputs.
- Telemetry/docs updates (CHANGELOG, architecture notes) describing the new workflow plus test coverage.

Approach
1) Tool contracts & storage: design Zod schemas for `getTimelineEvent` + `listTimelineRange`, add server functions that call `loadSessionSnapshot`, sanitize events, and write audit rows to a new `chat_tool_events` store (metadata, args, outputs, status, latency). Export typed TanStack AI tool definitions referencing these handlers.
2) Authorization & telemetry: gate tools behind session binding/feature flags, emit structured logs with `toolCallId`/session/thread IDs, and integrate with future Postgres/Electric persistence so fixture + DB-backed sessions share the same API path.
3) Streaming + server runtime: swap `/api/chatbot/stream` over to AI SDK `streamText` with tool support (or manually parse `fullStream` chunks) so tool-call events trigger the new server functions. Ensure partial tool results stream to the client and that assistant replies fall back gracefully when tools fail.
4) Client controller integration: extend `useChatDockController` to consume SSE chunks (text, tool-call start, tool-result) rather than raw text only, drive optimistic UI states (pending/approved/executing), and persist `contextEvents` references on both user prompts and tool summaries.
5) Chat Dock UI: add tool-call cards/rows referencing assistant-ui’s Tool UI patterns (status badges, retry/approve controls), show per-message context chips linking timeline IDs back to Inspector, and surface audit/log affordances. Ensure “Add to chat” invokes the same pipeline so chips stay in sync.
6) Docs + tests: unit tests for tool schemas/resolvers + audit store, integration tests covering streaming/tool flows, and Playwright e2e proving the assistant can resolve `#15` via tools. Update architecture docs/CHANGELOG and trace logging guides.

Risks / unknowns
- Model/tool token overhead may increase latency; need budgets + backoff strategy.
- Approval UX: do we auto-run tools or require user confirmation for large ranges?
- Session snapshot availability when Electric/Postgres work isn’t finished; may need interim caching.
- Security: ensure tools cannot read sessions the user hasn’t loaded/bound.

Testing & validation
- Unit: tool schema validators, session resolver functions, ToolCallManager helpers.
- Integration: simulate tool-call streaming through `/api/chatbot/stream` + storage, verify persisted context events.
- E2E (Playwright) scenario: load session, reference event ID, confirm assistant uses tool + displays chip.

Rollback / escape hatch
- Feature flag the tool-calling pipeline; fall back to existing static prompts if tool execution fails.

Owner/Date
- Codex (ChatGPT) / 2025-12-18
