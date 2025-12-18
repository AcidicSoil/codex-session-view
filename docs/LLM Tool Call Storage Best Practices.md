# LLM Tool Call Storage Best Practices

- **Separate chat vs. tool collections.** Keep conversational turns (user/assistant/system) in one table/collection and log each tool execution in a dedicated `chat_tool_events` store keyed by `toolCallId`, `chatMessageId`, `sessionId`, and `threadId`. This prevents bloated transcripts and enables retention policies or redaction rules targeting just tool data.
- **Capture structured metadata.** Persist arguments, outputs, execution status, latency, approval state, and error payloads as JSON columns (or typed columns when indexing is required). Include normalized fields (event indexes, repo IDs, etc.) so reporting doesn’t require parsing freeform text.
- **Normalize large payloads.** Store primary tool outputs in object storage (or compressed blobs) when they exceed size limits; keep only references + summaries in the tool log, with checksum/versioning to detect reuse.
- **Telemetry + audit hooks.** Emit log events/metrics on tool invocation, completion, and failure. Attach trace IDs so distributed traces (frontend → server → provider) can reconstruct timelines.
- **Retention + redaction.** Apply automated TTL policies to sensitive payloads while retaining thin audit rows (ids, timestamps, tool names). Redact user PII before persistence or store encrypted payloads with scoped access tokens.
- **Replay support.** Store raw argument/output JSON plus normalized summaries so you can rehydrate tool results into chat UIs or rerun prompts for debugging.
- **Approval workflows.** Track approval decisions per tool call (who approved, when, outcome). Persist partial states (`pending`, `awaiting-input`, `executing`, `succeeded`, `failed`) for UI progress bars and compliance logs.
- **Indexing & compaction.** Index by `sessionId`, `toolName`, `status`, `createdAt` for quick lookups; periodically compact old rows or move them to archive tables to keep hot datasets small.
