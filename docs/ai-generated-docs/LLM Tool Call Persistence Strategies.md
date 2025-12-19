# LLM Tool Call Persistence Strategies

## Storage models
- **Relational schema**: tables for `chat_messages`, `tool_events`, `tool_event_payloads`. Pros: strong consistency, easy joins, reporting. Cons: requires migrations for schema evolution. Works well with Prisma/Drizzle.
- **Document/JSON store**: each conversation doc contains message array + embedded tool calls. Pros: easy to snapshot, good for append-only logs. Cons: large documents, tricky partial updates, complex filtering.
- **Hybrid**: relational metadata + blob/object storage for heavy payloads; embed summarized refs back into chat messages.

## Key fields per tool event
- `toolCallId`, `chatMessageId`, `sessionId`, `threadId`.
- `toolName`, `arguments`, `output`, `status`, `error`, `startedAt`, `completedAt`, `latencyMs`.
- `approvalState`, `approvedBy`, `approvalAt` (if applicable).
- `contextRefs` (e.g., timeline indices, file paths) for quick lookup.

## Implementation notes (TypeScript/TanStack Start)
- Use Prisma/Drizzle models with JSON columns for args/output.
- Stream results through TanStack AI `ToolCallManager`, persist log rows when tool starts and when it completes.
- Store `contextEvents` references in `chat_messages` for quick hydration without duplicating full payloads.
- Emit telemetry (e.g., `tool.invocation`, `tool.success`, `tool.failure`) with trace IDs.

## Frontend rendering
- Map stored tool events to UI components showing tool name, status, summary, and “View details” actions that fetch the payload lazily.
- Show context chips/badges for any chat message linked to tool references (timeline IDs, repo files, etc.).
- Provide audit trail views (filter by tool, time, status) separate from the chat transcript.

## Compliance & retention
- Keep full payloads only as long as necessary, but retain minimal audit logs indefinitely.
- Support redaction workflows (mask secrets before storage, or encrypt payloads).
- Log every access/edit of tool data for compliance.
