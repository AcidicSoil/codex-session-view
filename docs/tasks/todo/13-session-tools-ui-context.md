Context
- Chat Dock now resolves timeline references implicitly, but the assistant still can’t on-demand fetch more events or clarify context mid-conversation.
- Analysts have no visual indication which event slices are already in scope, so “Add to chat” actions feel opaque.
- We need first-class tools wired through TanStack AI plus UI affordances so Session Coach can invoke them and users can verify context across both fixture snapshots and future Postgres/Electric sessions.

Success criteria
- LLM can call typed tools (`getTimelineEvent`, `listEventRange`) via TanStack AI during a chat turn; logs show tool usage tied to session IDs.
- Tool responses stream back into Chat Dock and appear as assistant messages referencing the retrieved events.
- Chat Dock surfaces context-event chips/badges per message, showing which timeline IDs are in scope and highlighting when data goes stale.
- Storage interface works for local fixture snapshots and DB-backed sessions with identical tool outputs.
- E2E test proves user asks “show #15,” model triggers a tool, and the reply cites that event without manual uploads.

Deliverables
- TanStack AI tool definitions, server functions, and persistence wiring for session event retrieval and range queries (backed by a swappable storage adapter for JSON fixtures vs Postgres/Electric).
- Client-side tool execution plumbing (ToolCallManager integration, approval UX if needed).
- Chat Dock UI updates for context-event chips and transcript entries showing tool outputs.
- Telemetry/docs updates (CHANGELOG, architecture notes) describing the new workflow plus test coverage, including a brief reference to TanStack AI’s tools guide for future developers.

Approach
1) Tool contracts & storage: finish the existing `timelineTools` definitions by expanding their Zod schemas, make `ChatToolEventRecord` capture `toolCallId` + latency, and introduce a repository interface the JSON file adapter implements today while keeping a path for Postgres/ElectricSQL. Add snapshot regression tests that confirm sanitized payloads match Inspector outputs.
2) Authorization & telemetry: keep tools scoped to the active session/thread, enforce feature flags, and record every status transition (requested, executing, succeeded, failed) through the new storage interface so both fixture and DB-backed sessions emit identical audit rows.
3) Streaming + server runtime: migrate `/api/chatbot/stream` to TanStack AI’s `chat({ tools, agentLoopStrategy })` API (per docs/guides/tools) and use `toStreamResponse` so `tool_call`/`tool_result` chunks, including partial outputs, propagate to the client while preserving today’s message completion behavior.
4) Client controller integration: teach `useChatDockController` to handle the richer stream—track `ToolCallManager` state, keep optimistic “pending/approved/executing” flags, and persist `contextEvents` on both user prompts and tool result chunks; ensure fixture and DB sessions share the same client pipeline.
5) Chat Dock UI: render tool-call cards with status badges, approval affordances, and links back to Inspector timeline IDs; surface per-message context chips so users know which events are in scope and when the data is stale. Reuse this pipeline for “Add to chat” so chips stay aligned.
6) Docs + tests: add unit coverage for the tool repository + sanitizers, stream-level tests proving tool chunks update telemetry, and a Playwright e2e case (“show #15”) that exercises fixture snapshots. Update CHANGELOG plus architecture docs to cite TanStack AI’s tool-calling best practices and the new storage contract.

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
