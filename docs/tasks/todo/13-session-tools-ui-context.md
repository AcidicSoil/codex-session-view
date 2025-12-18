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
1) Tool contract & API: define `getTimelineEvent`/`listTimelineRange` schemas (inputs: sessionId + event indexes; outputs: normalized payload). Implement server functions that authorize, load snapshots, and return sanitized event data. Wire them into TanStack AI tool definitions.
2) Streaming/tool execution integration: extend chat runtime (server + `useChatDockController`) to manage ToolCallManager lifecycle, execute tools, inject tool result messages, and persist context references alongside chat messages.
3) Chat Dock UI/UX: render context chips per message, show tool-call progress (pending/executing/completed), provide controls (approve/deny) if needed, and ensure “Add to chat” runs through the same tool pipeline. Document telemetry + logging.
4) Testing & docs: write unit tests for tool schemas/resolvers, integration specs for tool-call flows, and e2e test proving the model can answer event-ID prompts via tools. Update README/architecture + CHANGELOG.

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
