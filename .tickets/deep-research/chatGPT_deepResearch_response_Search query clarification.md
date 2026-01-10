
Persisting LLM Tool-Call Activity in Chat Applications
======================================================

Event Sourcing for Conversation History
---------------------------------------

One robust pattern is **event sourcing**, which treats each conversational action as an immutable event. Instead of storing only the latest state, the system appends every **user message**, **assistant response**, **tool invocation**, and **tool result** to an event log[graphapp.ai](https://www.graphapp.ai/blog/understanding-the-event-sourcing-pattern-a-comprehensive-guide#:~:text=At%20its%20core%2C%20event%20sourcing,oversight%20of%20the%20data%20lifecycle). These events form a complete, time-ordered transcript of the session, providing a clear audit trail of all changes[graphapp.ai](https://www.graphapp.ai/blog/understanding-the-event-sourcing-pattern-a-comprehensive-guide#:~:text=At%20its%20core%2C%20event%20sourcing,oversight%20of%20the%20data%20lifecycle). In practice, this means every function call the LLM makes (and its outcome) is captured as an event in the history. The benefit is that you can **reconstruct or replay** any past conversation by replaying its events, which greatly aids debugging and auditing. This event-sourced approach aligns well with audit requirements – the log of events is immutable and comprehensive, enabling full traceability of how the model arrived at a given answer. It’s a pattern you can implement in TypeScript/Node (e.g. using an append-only database table or even a message queue/Kafka topic as an event store) and then reconstruct state by reducing over these events.

Relational Schema: Conversations, Messages, and Tool Calls
----------------------------------------------------------

Many real-world systems persist chat history in a relational database with a clear schema for conversations and their messages. A common design is to have a **Conversation** (or Session) table and a **Message** table linked by conversation ID. Each message record stores the role (user/assistant/system), text content, timestamp, etc. Tool invocations can be represented as special message types or in a separate **ToolCall** table linked to the message. For example, the open-source RubyLLM framework persists tool usage by saving _both the function call and its result as messages_ in the conversation log[rubyllm.com](https://rubyllm.com/rails/#:~:text=,What%27s%20the%20weather%20in%20Paris). In their design, when the AI decides to use a tool, an assistant message is recorded representing the function call, and then another message is recorded for the tool’s output[rubyllm.com](https://rubyllm.com/rails/#:~:text=,What%27s%20the%20weather%20in%20Paris). The details of the tool call (function name and arguments) are stored in a separate ToolCall record associated with that assistant message[rubyllm.com](https://rubyllm.com/rails/#:~:text=,Paris). This means the conversation history in the database might look like: (1) User message, (2) Assistant message indicating a tool was called (with a pointer to a ToolCall entry for, say, `Weather` with `{"city":"Paris"}` args), and (3) Assistant message with the tool’s result. Notably, OpenAI’s own conversation API follows a similar model – it treats messages, function calls, and function outputs all as first-class conversation “items” to be stored under a session[platform.openai.com](https://platform.openai.com/docs/guides/conversation-state#:~:text=devices%2C%20or%20jobs). Designing your schema this way ensures that each tool invocation is tracked and can be later queried or reconstructed. In a Node/TypeScript stack, this could translate to tables (or collections) for sessions, messages, and tool\_call details, or using an ORM to map these relationships. The key is that **every function call the LLM makes is recorded in the transcript**, either as a message entry (possibly with a JSON payload for arguments/results) or as a linked child record, creating a persistent audit trail in your database.

Logging Middleware and Observability Tools
------------------------------------------

Integrating logging at the application level is essential for capturing tool-call events in real time. In a TypeScript/Node app, you can introduce middleware or callback hooks around your LLM agent to intercept each tool call and log it. For instance, frameworks like LangChain provide callback handlers that fire events whenever the LLM starts or ends a tool invocation, which you can use to persist those details (to a log file or database) or print them for debugging[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=For%20Agents%2C%20log%3A). When building your own chat system, you might implement a similar callback pattern – e.g. wrap the function that executes tools to log the tool name, inputs, and output every time it’s called. It’s recommended to capture **what tool was triggered, with which arguments, and what output was returned** for each step of an agent’s reasoning[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=For%20Agents%2C%20log%3A). This information can be logged in structured form (JSON), making it easy to search or analyze later. In fact, many observability solutions have emerged to assist with this in a TS/Node stack.

**OpenTelemetry** is one approach – you can instrument your code so that each LLM call and tool usage emits an OTEL trace event. Projects like _Langfuse_ and Traceloop’s _OpenLLMetry_ build on this to provide out-of-the-box LLM tracing. For example, **Langfuse (open-source)** can automatically capture a structured log of each request, including the exact prompt, the model’s response, and any tool/retrieval steps in between[langfuse.com](https://langfuse.com/docs/observability/overview#:~:text=The%20core%20of%20this%20is,or%20retrieval%20steps%20in%20between). These tools typically provide a dashboard where you can see a **trace** of a conversation with nested events for each function call (e.g. a user query triggers the LLM, which calls Tool A, then Tool B, etc., all visualized in sequence). Using such middleware in a Node/React application is straightforward: Langfuse has a JS/TS SDK, and OpenLLMetry wraps standard OpenAI API calls to emit events. There are also SaaS offerings like **PromptLayer** that log your OpenAI API calls (including function calls) for later inspection[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=Use%20Case%20%20%20,OpenDevin%2C%20LangGraph%2C%20CrewAI%20logs). The advantage of these observability integrations is the ability to search and filter logs (e.g. “find all sessions where the `Weather` tool was called with `city=Paris`”) and to correlate usage with performance metrics (latency, token counts, etc.). When implementing logging, consider where to store the data: a **structured database** (like PostgreSQL or ClickHouse) is great if you need to query logs by fields and run analytics, whereas high-volume apps might send events to a log indexer (ELK, Datadog, etc.) for scalability[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=Storage%20Type%20%20%20,TimescaleDB). In some cases, developers even vectorize and store embeddings of conversations or tool inputs in a **vector DB** to enable semantic search through past dialogues[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=Log%20Indexers%20%20%20,Fast%2Cscalable%20%20Logstash%2C%20Loki) (though this is optional for the logging problem). For most cases, a combination of _persisting to a database_ for permanent record + _streaming to an analytics tool_ for real-time monitoring works well.

Replayable Sessions and Audit Trails
------------------------------------

A key benefit of diligently storing conversation and tool-call data is the ability to **replay or audit entire chat sessions**. Because each message and tool action is saved in order, you can take a stored transcript and feed it back into an LLM or test harness to reproduce the conversation. This is useful for regression testing (e.g. after updating your prompts or tool logic, you can rerun old sessions to see if outputs change) and for debugging complex agent behaviors step-by-step. Some open-source platforms explicitly support replay: for example, Langfuse and PromptLayer allow you to inspect and replay the sequence of prompts and tool calls in their UIs[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=Use%20Case%20%20%20,OpenDevin%2C%20LangGraph%2C%20CrewAI%20logs). Even without a special tool, having the data means you could write a script to iterate through each event (user message -> LLM response -> function call -> function result -> next LLM response, etc.) to simulate the conversation flow for verification. Additionally, an **audit trail** is invaluable for compliance and analysis – you can demonstrate exactly which external actions the AI took on a user’s query and why. Storing logs in an **append-only format** (like an audit log table or even line-delimited JSON files) ensures tamper-proof records of all tool invocations. For example, an audit log entry might include metadata like timestamp, user/session ID, model used, the prompt or question, which tool was invoked with what parameters, and the tool’s result[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=%7B%20%22timestamp%22%3A%20%222025,This%20contract%20means)[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=,0.042). Such a record tells a “story” of the AI’s decision process for each query. By designing your system to preserve this information, you gain the ability to not only debug and improve your chat application over time, but also to **prove** what actions were taken during any conversation – a crucial feature for trustworthy AI systems[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=Layer%20%20%20%20,Rating%2C%20thumbs%2C%20edits). In summary, combining event-sourced storage, a solid database schema, and logging middleware yields chat session data that can be reliably persisted, analyzed, and replayed as needed for a TypeScript/React+Node based LLM application.

**Sources:** Real-world frameworks and references illustrate these patterns, including RubyLLM’s Rails integration for chat persistence[rubyllm.com](https://rubyllm.com/rails/#:~:text=,What%27s%20the%20weather%20in%20Paris)[rubyllm.com](https://rubyllm.com/rails/#:~:text=,Paris), OpenAI’s conversation state documentation[platform.openai.com](https://platform.openai.com/docs/guides/conversation-state#:~:text=devices%2C%20or%20jobs), and expert guides on AI audit logging[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=Tools%20triggered%2C%20args%2C%20outputs)[langfuse.com](https://langfuse.com/docs/observability/overview#:~:text=The%20core%20of%20this%20is,or%20retrieval%20steps%20in%20between), among others. These demonstrate strategies like storing function calls as part of message history, using event logs for complete history, and leveraging tools (Langfuse, OpenLLMetry, etc.) for tracing and replaying LLM tool usage. Each of these can be adopted or translated to a Node/TypeScript stack (e.g. using a SQL/NoSQL database plus Node logging libraries or telemetry SDKs) to build a robust, auditable chat history subsystem. [graphapp.ai](https://www.graphapp.ai/blog/understanding-the-event-sourcing-pattern-a-comprehensive-guide#:~:text=At%20its%20core%2C%20event%20sourcing,oversight%20of%20the%20data%20lifecycle)[medium.com](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b#:~:text=Storage%20Type%20%20%20,TimescaleDB)

![](https://www.google.com/s2/favicons?domain=https://langfuse.com&sz=32)

![](https://www.google.com/s2/favicons?domain=https://medium.com&sz=32)

![](https://www.google.com/s2/favicons?domain=https://platform.openai.com&sz=32)

![](https://www.google.com/s2/favicons?domain=https://rubyllm.com&sz=32)

![](https://www.google.com/s2/favicons?domain=https://www.graphapp.ai&sz=32)

Sources

---

## You asked

src.md

File

I’m after implementation strategies and design recommendations for storing tool-call activity in chat-style LLM apps—ideally real-world or open-source examples we can learn from. The stack of interest is TypeScript/TanStack Start (or similar React + Node setups), but general patterns that can translate to this environment are fine.

---

## ChatGPT Replied

Thought for 1m 45s

Storage model for tool-call activity
------------------------------------

**Use an append-only event log as the source of truth.** Treat _every_ step (user msg, assistant msg, tool call request, tool execution start/end, tool result, errors) as an ordered event in a single timeline per thread. This matches the shape you already have in `ResponseItemParsed` with tool-related event types like `FunctionCall`, `LocalShellCall`, `WebSearchCall`, and `CustomToolCall`.

src

**Keep “messages” and “tool calls” as projections derived from the event log.** A message is a view over contiguous events; a tool call is a view over `{tool_call_requested → tool_call_started → tool_call_finished}` with references back to the parent assistant step.

**Make tool calls first-class entities.** Store a `tool_invocations` record keyed by `toolInvocationId` and reference it from events. This avoids bloating message rows and makes partial/streaming states explicit.

Minimum fields that stay useful in production debugging and audit:

* Identity: `toolInvocationId`, `threadId`, `runId` (one agent run), `parentMessageId` or `parentEventId`

* Tool selection: `toolName`, `toolVersion` (or code hash), `provider` (if tools proxy to models/services)

* I/O: `arguments` (JSON), `result` (JSON), `error` (code/message/stack if allowed)

* Timing: `requestedAt`, `startedAt`, `finishedAt`, `durationMs`

* Outcome: `status` (`success|error|timeout|canceled`), `retryCount`

* Cost/usage when applicable: tokens, bytes, external API cost estimate

* Privacy: `redactionLevel`, `containsSecrets` flag, `storageClass` (`inline|blobRef`)

Persistence strategy in a TanStack Start + Node setup
-----------------------------------------------------

**Do not persist application state under the project working directory.** Your current chat persistence writes JSON snapshots to `process.cwd()/data` (for example `data/chat-messages.json` and `data/chat-threads.json`).

src

This risks repo pollution, multi-workspace collisions, and accidental commits; move persistence to a user-scoped app-data directory or a real database.

**Local-first baseline (single device):**

* Store the event log + tool invocation table in a local DB (SQLite is the standard choice) and optionally mirror to TanStack DB collections for reactive UI.

* Keep large tool outputs as content-addressed blobs on disk and store only `blobRef` + hash in DB.

**Multi-user / scalable baseline (server-backed):**

* Use Postgres with:

  * `events` table (append-only, indexed by `threadId, sequence`)

  * `tool_invocations` table (indexed by `runId, toolName, status`)

  * JSONB columns for arguments/results plus strict metadata columns for indexing

* Add row-level ownership (`userId`, `workspaceId`) and retention policies (TTL for raw payloads, longer TTL for metadata).

**Atomicity rule:** persist the assistant step and any tool-call state transitions in a single DB transaction, so UI never shows “tool result without tool request” or vice versa.

Your code already has the right separation boundaries for this: TanStack Start server functions for mutations (example patterns in `createServerFn`) and local persistence modules for stores.

src

Implementation pattern for capturing tool calls
-----------------------------------------------

**Centralize tool execution through a single “tool runner.”** Every tool is invoked via one wrapper that:

1. emits `tool_call_requested` as soon as the model proposes it

2. emits `tool_call_started` immediately before execution

3. emits `tool_call_finished` with result or error

4. links all three to the same `toolInvocationId` and the parent assistant step

**Propagate context across async boundaries.** In Node, use `AsyncLocalStorage` (or equivalent) so every nested call can attach the same `runId`, `traceId`, `threadId`, `toolInvocationId`.

Observability-grade tracing that translates directly to storage
---------------------------------------------------------------

**Adopt OpenTelemetry spans for model calls and tool calls, and persist/export them.** The Vercel AI SDK already supports OpenTelemetry-based telemetry. [AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/telemetry?utm_source=chatgpt.com) The OpenTelemetry GenAI semantic conventions explicitly cover spans for model requests that may request tool calls. [OpenTelemetry](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/?utm_source=chatgpt.com)

Two practical outcomes:

* Your internal DB schema can mirror span structure (`traceId`, `spanId`, `parentSpanId`) for easy correlation.

* You can export traces to any OTLP backend without re-instrumenting later.

Real-world / open-source examples to learn from
-----------------------------------------------

* **Langfuse (open source, self-hostable):** models the agent run as a trace with nested observations/spans including tool executions, capturing timing and input/output. [Langfuse+1](https://langfuse.com/docs/observability/overview?utm_source=chatgpt.com)

* **Traceloop OpenLLMetry (open source):** provides OpenTelemetry instrumentations for LLM providers and related components, producing standard OTel data you can route into your stack. [GitHub](https://github.com/traceloop/openllmetry?utm_source=chatgpt.com)

* **Helicone (open source):** proxy-based logging/observability that captures requests/responses and associated metadata without deep in-app instrumentation. [GitHub](https://github.com/Helicone/helicone?utm_source=chatgpt.com)

* **LangChain JS callbacks (pattern worth copying even if you do not use LangChain):** structured lifecycle hooks exist specifically for tool runs (start/end with output and run IDs). [LangChain](https://v03.api.js.langchain.com/classes/_langchain_core.callbacks_manager.CallbackManagerForToolRun.html?utm_source=chatgpt.com)

Security and audit trail constraints that matter in production
--------------------------------------------------------------

* **Immutable log + redactable payloads:** keep event ordering immutable; allow payload redaction by replacing `arguments/result` with `{redacted: true, hash, blobRef}` while retaining timing, tool name, and status.

* **Deterministic replay:** store tool version identifiers and environment hints; without this, “why did the agent do that” becomes unreproducible.

* **Retention split:** short TTL for raw tool payloads; long TTL for metadata (tool name, duration, status, cost).
