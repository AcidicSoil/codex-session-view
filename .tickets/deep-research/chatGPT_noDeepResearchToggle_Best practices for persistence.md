## You asked

src.md

File

deep-research the following query for the users code base. "best practices" OR "architecture" AND ("LLM tool call" OR "function calling" OR "agent tool") AND (storage OR persistence OR logging OR audit trail) AND (chat OR conversation) AND (transcript OR "message history")

---

## ChatGPT Replied

Thought for 1m 20s

What your codebase is doing today (relevant to tool-call persistence)
---------------------------------------------------------------------

* Chat history is persisted as **JSON snapshots on local disk** (`/data/chat-messages.json`, `/data/chat-threads.json`) via `fs.readFile` → hydrate into a TanStack DB `localOnlyCollection`, then `fs.writeFile(JSON.stringify(...))` on every change.

* “Viewer session snapshots” are persisted to **browser localStorage** using TanStack DB `localStorageCollectionOptions`.

* Your transcript/event model already recognizes **tool-like events** (e.g., `FunctionCall`, `CustomToolCall`, `WebSearchCall`, `LocalShellCall`) and renders/exports them explicitly.

* You use **Vercel AI SDK (`ai`)** for model calls (`streamText`, `generateText`).

    src

Implication: you already have the concept of “tool calls in the transcript”, but your persistence layer for chat/tool activity is currently a **snapshot file**, not a durable **append-only event log / database**.

* * *

Best-practice architectures for storing tool-call activity in chat/agent apps
-----------------------------------------------------------------------------

### 1) Treat the conversation as an **event stream**, not “messages with some metadata”

**Pattern:** store a single ordered stream of immutable events:

* `user_message`

* `assistant_message`

* `model_request` / `model_response`

* `tool_call_started`

* `tool_call_succeeded` / `tool_call_failed`

* `moderation_decision` / `policy_block`

* `error`

Then derive:

* “Chat messages” (for UI)

* “Conversation list” (threads sidebar)

* “Audit trail” (immutable)

* “Analytics/telemetry” (aggregations)

This avoids the common failure mode where tool calls are shoved into “assistant content” and you later can’t reliably reconstruct which tool ran, with what args, and what result.

Practical constraint that reinforces this: many providers require that tool-call messages be followed by corresponding tool-result messages to keep history valid. [LangChain Docs](https://docs.langchain.com/oss/python/langgraph/add-memory?utm_source=chatgpt.com)

### 2) Split **product persistence** vs **operational observability**

You want two parallel records:

* **Product record (your DB):** canonical transcript + tool calls/results (what the user can export/replay).

* **Observability record (tracing/logging):** spans/metrics for latency, token usage, errors, tool timings.

OpenTelemetry’s GenAI semantic conventions explicitly model GenAI requests (including tool calling) and agent/tool spans/events. [OpenTelemetry+2OpenTelemetry+2](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/?utm_source=chatgpt.com)
Vercel AI SDK has first-class OpenTelemetry-based telemetry hooks for its calls. [AI SDK+1](https://ai-sdk.dev/docs/ai-sdk-core/telemetry?utm_source=chatgpt.com)

### 3) Use an **append-only log + compaction** (or just SQLite) for durability

Snapshot files are simple but fragile at scale:

* crash during write → corrupted JSON

* no atomicity unless you temp-write + rename

* no partial durability guarantees

* O(n) reads + in-memory filtering for every query once it grows

Best practice for chat/tool transcripts is:

* **Append-only events** (NDJSON/WAL-like) for durability and auditability

* Periodic **compaction** into a snapshot/materialized view

SQLite gives you this out of the box (WAL, transactions, indexes) without inventing your own.

### 4) Store tool I/O safely: **redaction + hashing + tiered retention**

Tool inputs/outputs can contain secrets/PII and can be huge.
Common pattern:

* Store a **structured summary** in the main row (tool name, status, timings, truncated preview)

* Store **raw payload** in a separate blob table/object with:

  * encryption at rest

  * redaction pipeline (keys like `Authorization`, `apiKey`, cookies)

  * configurable retention / per-tool policy

* Store **content hashes** to support integrity/audit (“this output existed”) without always storing raw content (you already do hashing for hookify decisions).

    src

### 5) Make tool calls replayable: stable IDs + parent links + idempotency keys

For each tool call event:

* `toolCallId` (stable across retries)

* `parentEventId` (the model response / assistant turn that requested it)

* `attempt` number

* `idempotencyKey` (so the tool runner can dedupe)

This is what makes “audit trail” and “replay” real.

* * *

Real-world / open-source patterns worth copying (closest to your stack)
-----------------------------------------------------------------------

### Vercel AI SDK: tool calls + telemetry via OpenTelemetry

* `streamText` / `generateText` are the core primitives you’re already using. [AI SDK](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text?utm_source=chatgpt.com)

* AI SDK exposes **Telemetry (OpenTelemetry)** integration paths, intended for production tracing. [AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/telemetry?utm_source=chatgpt.com)

* Turnkey integrations show how to capture prompts, outputs, tool calls, latency, etc. (examples: Braintrust, Langfuse; both integrate directly with AI SDK). [Braintrust+1](https://www.braintrust.dev/docs/cookbook/recipes/VercelAISDKTracing?utm_source=chatgpt.com)

### OpenTelemetry GenAI semantic conventions: standard schema for model + tool/agent traces

If you want your traces to be portable across vendors/tools, align with these conventions for spans/events/attributes. [OpenTelemetry+2OpenTelemetry+2](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/?utm_source=chatgpt.com)

### LangGraph (LangChain): built-in persistence/checkpointing for “threads”

Even if you’re not using LangGraph, their persistence model is a clean reference:

* “threads” as durable containers

* checkpoint per step for time travel/fault tolerance

* explicit concept of resuming a conversation/agent run [LangChain Docs](https://docs.langchain.com/oss/python/langgraph/persistence?utm_source=chatgpt.com)

### Observability platforms (open source) that treat tool calls as first-class trace events

Langfuse positions “structured logs of every request… and any tools… in between” as the core tracing artifact. [Langfuse](https://langfuse.com/docs/observability/overview?utm_source=chatgpt.com)

* * *

Recommended target architecture for _your_ codebase (TanStack Start + TanStack DB + AI SDK)
-------------------------------------------------------------------------------------------

### A) Promote tool calls into the same persisted “conversation event stream” as messages

You already parse/render `FunctionCall` / `CustomToolCall` / `WebSearchCall`.
Make that structure **canonical** in storage, not just in exports.

**Minimal event record shape (DB row / collection record):**

* `id`

* `threadId` (your `ChatThreadRecord.id`)

    src

* `sessionId` + `mode` (already present)

    src

* `seq` (monotonic per thread)

* `type` (`user_message`, `assistant_message`, `tool_call`, `tool_result`, `model_usage`, `error`, …)

* `timestamp`

* `payload` (structured, versioned; small)

* `payloadRef` (optional pointer to large raw blob)

### B) Replace snapshot JSON with one of these durability options

**Option 1 (best for local-first, simplest correctness): SQLite**

* Use SQLite as the persistence layer for:

  * threads

  * messages

  * events

  * tool calls/results

* Keep TanStack DB as your reactive client model, but let SQLite be the source of truth.

**Option 2 (if you insist on files short-term): NDJSON append-only log + compaction**

* Per-thread file: `data/threads/<threadId>.ndjson`

* Append event lines atomically

* Periodically compact to a snapshot (or rebuild indexes)

This fixes the biggest weaknesses of your current snapshot approach (atomicity/audit/replay), while keeping “local file” semantics.

### C) Add OpenTelemetry traces for _operations_, not just transcripts

* Turn on AI SDK telemetry for model calls. [AI SDK+1](https://ai-sdk.dev/docs/ai-sdk-core/telemetry?utm_source=chatgpt.com)

* Emit nested spans for tool execution, aligning attributes to GenAI semantic conventions. [OpenTelemetry+1](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/?utm_source=chatgpt.com)

* Store only trace IDs in your product DB; keep detailed timings/tokens in tracing backend.

### D) Align “history validity” with tool-call sequencing rules

Enforce invariant in persisted event stream:

* if an assistant event includes tool calls, corresponding tool results must exist (or an explicit `tool_call_failed`) before continuing. This matches provider constraints and avoids “cannot resume conversation” bugs. [LangChain Docs](https://docs.langchain.com/oss/python/langgraph/add-memory?utm_source=chatgpt.com)

* * *

Key gaps in the current persistence approach (specific to your implementation)
------------------------------------------------------------------------------

* **Snapshot writes are not an audit trail.** Reconstructing “what happened” across time is impossible once a later snapshot overwrites earlier states.

    src

* **Tool-call integrity is not enforced at the persistence layer.** Tool calls exist in your parsed/export domain, but chat persistence is message-based and snapshot-driven.

* **Scaling issues:** `toArray.filter(...).sort(...)` over an ever-growing in-memory collection will degrade; indexing requires a real DB or log index.

* * *

Concrete “best-practice” outcome for your app
---------------------------------------------

1. One canonical persisted stream per thread: `ConversationEvent[]` containing messages + tool calls + tool results.

2. Materialized views for UI: threads list, message list, tool timeline.

3. SQLite (or append-only log) for durability + replay + audit.

4. OpenTelemetry traces for runtime observability, using GenAI conventions, with AI SDK telemetry enabled. [AI SDK+2OpenTelemetry+2](https://ai-sdk.dev/docs/ai-sdk-core/telemetry?utm_source=chatgpt.com)

---
