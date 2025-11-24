1. Overview

---

### Problem Statement

You have a TanStack Start–based Codex Session Viewer with an embedded chatbot component, but AI behavior is currently ad hoc: model selection, tools, and context are not unified, AGENTS.md rules are not enforced, and there is no structured visibility into misalignment or guardrail behavior.

This limits the platform’s ability to act as a durable coding-agent surface: interactions can drift away from AGENTS constraints, misaligned behavior is not systematically logged, and you cannot analyze or improve agent behavior over time.

### Target Users

* Repository-oriented engineer

  * Works inside Codex sessions against real repos.
  * Needs a session-aware chat/agent that respects AGENTS.md and can act safely with tools.

* AI / developer-experience owner

  * Configures models, tools (e.g., Composio), and AGENTS rules.
  * Needs guardrails, observability, and analytics over agent behavior and violations.

* AI reliability / ops engineer

  * Monitors alignment events and violation trends.
  * Uses the alignment log to adjust AGENTS.md, models, and policies.

### Success Metrics

* ≥90% of Codex-session chats run through the new orchestrator and session-scoped chatbot surface (instrumented).
* ≥95% of AGENTS.md-relevant violations in test suites are correctly flagged as warn/block by the linter.
* ≤10% of alignment events are labeled as false positives after manual review.
* Chat latency increase from inline guardrails ≤150 ms p50 compared to baseline (measured in staging).
* At least one internal team actively uses the alignment log page for monthly AGENTS.md updates and agent tuning.

---

2. Capability Tree (Functional Decomposition)

---

### Capability: Multi-Provider AI Orchestration

Centralize chat, tools, and context routing across providers (OpenAI-compatible, LM Studio, Gemini CLI, in-browser models via `built-in-ai`) using Vercel AI SDK.

#### Feature: Provider and Model Registry (MVP)

* **Description**: Unified registry mapping logical model IDs to concrete AI SDK providers and configs.
* **Inputs**:

  * Environment config (API keys, base URLs, default models)
  * Logical model ID (e.g., `openai:gpt-4.1`, `lmstudio:local`, `gemini:code`, `browser:llm`)
* **Outputs**:

  * Concrete AI SDK model instance and provider options
* **Behavior**:

  * Resolve logical IDs to provider definitions.
  * Validate availability based on environment (dev/staging/prod).
  * Expose list of allowed models for UI selection and policy checks.

#### Feature: Chat Orchestrator with Streaming (MVP)

* **Description**: Server-side chat function that handles streaming responses, tools, and context uniformly.
* **Inputs**:

  * User message(s) and prior conversation history
  * Selected model/provider ID
  * Optional context attachments (Codex session metadata, code snippets)
  * Optional tool enablement flags
* **Outputs**:

  * Streaming response tokens
  * Final assistant message object with metadata (model, tools used, latency)
* **Behavior**:

  * Call Vercel AI SDK (`streamText` or equivalent) with model, messages, tools.
  * Stream tokens to client; on completion, persist message and metadata.
  * Surface tool call requests to tool adapter layer.

#### Feature: Tool Invocation via Composio (Post-MVP, but planned)

* **Description**: Execute LLM-requested tools through Composio, with strong validation and logging.
* **Inputs**:

  * Tool call request (name, arguments) from model
  * Session/user identity and environment (dev/staging/prod)
* **Outputs**:

  * Tool execution result payload
  * Tool call event log entry
* **Behavior**:

  * Map AI SDK tool definitions to Composio tool schemas.
  * Validate args against schema and allowed tools list.
  * Execute tool via Composio SDK and return result back into chat stream.

#### Feature: Context Attachment Pipeline (MVP)

* **Description**: Attach Codex session and repo context to AI calls in a structured way.
* **Inputs**:

  * Session context object (session ID, messages summary, repo/branch, files)
  * User intent (e.g., “Analyze current session”, “Explain diff”)
* **Outputs**:

  * Structured context blob used in system prompt or separate context channel
* **Behavior**:

  * Build concise prompts or context structures from session data.
  * Enforce size limits and redaction rules.
  * Tag chat messages with which context sources were used.

---

### Capability: Session-Scoped Chat for Codex Session Viewer

Bind the existing chatbot component to specific Codex sessions and viewer state.

#### Feature: Session Context Wiring (MVP)

* **Description**: Connect Codex session viewer to chatbot, passing structured session context.
* **Inputs**:

  * Selected session ID from viewer
  * Session metadata (repo, branch, timestamps, AGENTS location)
* **Outputs**:

  * Chat session-scoped configuration object
  * Initial chat message context (e.g., summary, key errors)
* **Behavior**:

  * Use TanStack Start loader/server function to fetch session context.
  * Provide context to chatbot via props or context provider.
  * Ensure SSR-safe, no client-side data fetch via `useEffect`.

#### Feature: ChatDock Integration (MVP)

* **Description**: Reuse existing chatbot UI as the primary front-end for session-scoped chat.
* **Inputs**:

  * Session-scoped configuration and context
  * Chat orchestrator client API
  * User inputs (messages, actions like “Analyze session”)
* **Outputs**:

  * Rendered message list with streaming updates
  * User actions (e.g., buttons) mapped to orchestrator calls
* **Behavior**:

  * Replace any direct AI calls inside the component with orchestrator client.
  * Maintain current UX and streaming behavior while adding model/tool toggles.

---

### Capability: AGENTS Rules Management

Expose AGENTS.md as structured guidance for guardrails.

#### Feature: AGENTS Loader and Resolver (MVP)

* **Description**: Locate and load the relevant AGENTS.md (root + nested) for a given session.
* **Inputs**:

  * Repo root path and optional subpath from session metadata
* **Outputs**:

  * Normalized AGENTS ruleset object (sections, bullets, metadata)
* **Behavior**:

  * Resolve AGENTS.md path according to spec (root + overrides).
  * Read content via server-side file/DB interface.
  * Parse into sections: commands, testing, PR rules, project-specific constraints.
  * Cache per repo/path for performance.

#### Feature: AGENTS Rule Taxonomy (MVP)

* **Description**: Provide a stable internal taxonomy for AGENTS rules used by the linter.
* **Inputs**:

  * Parsed AGENTS content
* **Outputs**:

  * List of rule entries `{id, section, text, severityHint}`
* **Behavior**:

  * Assign stable IDs or paths to each rule bullet/section.
  * Derive default severity (info/warn/blockable) from content or configuration.

---

### Capability: AGENTS Alignment Linting and Remediation

Evaluate each message for AGENTS alignment and generate remediation prompts.

#### Feature: Message Classification (MVP)

* **Description**: Classify each user/assistant message as aligned/warn/block vs AGENTS rules.
* **Inputs**:

  * AGENTS ruleset
  * Candidate message (text + metadata)
  * Minimal session context (file paths, command targets, environment)
* **Outputs**:

  * Alignment result `{status, violatedRules[], reasonSummary}`
* **Behavior**:

  * Run deterministic heuristics (e.g., forbidden commands, file paths).
  * Optionally call a small LLM classifier for ambiguous cases.
  * Return stable status enum and violated rule references.

#### Feature: Remediation Prompt Generator (MVP)

* **Description**: Generate a corrective prompt that re-aligns the session with AGENTS.
* **Inputs**:

  * Alignment result
  * AGENTS ruleset
  * Last few messages of context
* **Outputs**:

  * Remediation prompt text suitable for insertion into chat input
* **Behavior**:

  * Summarize violation and proposed compliant path.
  * Emphasize key AGENTS bullets to follow next.
  * Keep prompts short and actionable.

#### Feature: Non-Blocking Inline Guardrail Pipeline (MVP)

* **Description**: Run alignment checks alongside chat streaming without blocking core interaction.
* **Inputs**:

  * Chat messages as they are sent/received
  * Linter configuration (enabled, severity thresholds)
* **Outputs**:

  * Alignment results delivered to UI and logging pipeline
* **Behavior**:

  * Trigger linting alongside orchestrator calls.
  * Update UI with notifications when result arrives.
  * Never block streaming or persistence on linter completion.

---

### Capability: Alignment Event Logging and Analytics

Persist alignment outcomes and expose them for review/analysis.

#### Feature: Alignment Event Schema and Persistence (MVP)

* **Description**: Represent each alignment check as a structured event and store it.
* **Inputs**:

  * Alignment result
  * Session metadata (sessionId, repoId, branch)
  * Message metadata (actor, messageId, excerpt)
* **Outputs**:

  * `AlignmentEvent` record in DB and optional telemetry log
* **Behavior**:

  * Construct events with stable IDs, timestamps, rule references, severity.
  * Write to `alignment_events` collection/table.
  * Handle failures best-effort, non-blocking.

#### Feature: Alignment Log Query API (MVP)

* **Description**: Provide server-side query surface for alignment events.
* **Inputs**:

  * Filter parameters (time range, repo, session, actor, status, rule)
  * Pagination parameters
* **Outputs**:

  * Paginated list of events + summary aggregates (counts by status, rule, actor)
* **Behavior**:

  * Build indexed queries over `alignment_events`.
  * Enforce access control and environment scoping.

#### Feature: Alignment Log Viewer Page (MVP)

* **Description**: UI surface to explore alignment events and details.
* **Inputs**:

  * Query results from Alignment Log API
* **Outputs**:

  * Interactive table/list and detail panel, plus basic metrics tiles
* **Behavior**:

  * Render events with filters and search.
  * Show details: original message excerpt, AGENTS rule text, remediation used, links back to Codex session view.

#### Feature: Baseline Metrics and Trends (Post-MVP)

* **Description**: Summarize key guardrail metrics (violation rates, top rules, actor distribution).
* **Inputs**:

  * Alignment events over chosen time window
* **Outputs**:

  * Aggregated metrics and simple charts
* **Behavior**:

  * Compute counts/groupings on server.
  * Surface metrics on Alignment Log page.

---

### Capability: Observability, Flags, and Safeguards

#### Feature: Feature Flags and Configuration (MVP)

* **Description**: Toggle orchestrator, AGENTS linting, and logging behaviors per environment.
* **Inputs**:

  * Environment config (env vars, config files)
* **Outputs**:

  * Runtime flags used across modules
* **Behavior**:

  * Enable/disable AGENTS linting and logging independently.
  * Configure warn-only vs blocking behavior.

#### Feature: AI Diagnostics View (Post-MVP)

* **Description**: View recent conversations, tool calls, and errors mapped to sessions.
* **Inputs**:

  * Chat and alignment logs
* **Outputs**:

  * Diagnostics UI for debugging and tuning
* **Behavior**:

  * List conversations with model/provider, tool, and error summaries.

---

3. Repository Structure + Module Definitions

---

High-level structure (indicative):

```txt
project-root/
├── src/
│   ├── lib/
│   │   ├── config/
│   │   │   └── ai-config.ts
│   │   ├── ai/
│   │   │   ├── providers.ts
│   │   │   ├── orchestrator.ts
│   │   │   ├── context-codex-session.ts
│   │   │   └── composio-tools.ts
│   │   ├── agents/
│   │   │   ├── agents-rules.ts
│   │   │   ├── agents-linter.ts
│   │   │   ├── alignment-events.ts
│   │   │   └── alignment-metrics.ts
│   │   └── observability/
│   │       └── logging.ts
│   ├── routes/
│   │   ├── codex/session-viewer.route.tsx
│   │   └── agents/alignment-log.route.tsx
│   └── features/
│       ├── chatbot/ChatDock.tsx
│       └── agents/AlignmentNotification.tsx
├── tests/
└── docs/
    ├── architecture/ai-stack.md
    ├── agents/agents-alignment-flow.md
    └── agents/agents-alignment-analytics.md
```

### Module: ai-config

* **Maps to capability**: Multi-Provider AI Orchestration (Provider and Model Registry)

* **Responsibility**: Centralized AI-related configuration and environment resolution.

* **File structure**:

  ```txt
  src/lib/config/ai-config.ts
  ```

* **Exports**:

  * `getAiConfig(env): AiConfig` – load and validate AI-related config.
  * `listAvailableModels(env): ModelDescriptor[]` – list allowed models by environment.

---

### Module: ai-providers

* **Maps to capability**: Multi-Provider AI Orchestration

* **Responsibility**: Map logical model IDs to concrete AI SDK provider/model instances.

* **File structure**:

  ```txt
  src/lib/ai/providers.ts
  ```

* **Exports**:

  * `resolveModel(id: ModelId, env: AiConfig): ResolvedModel` – resolve logical ID.
  * `getDefaultModel(env: AiConfig): ResolvedModel` – default per environment.

---

### Module: ai-orchestrator

* **Maps to capability**: Multi-Provider AI Orchestration

* **Responsibility**: Single entry point for chat streaming, tools, and context.

* **File structure**:

  ```txt
  src/lib/ai/orchestrator.ts
  ```

* **Exports**:

  * `streamChat(request: ChatRequest): ChatStream` – server-side streaming with tools.
  * `runChatOnce(request: ChatRequest): Promise<ChatResult>` – non-streaming API.

---

### Module: ai-context-codex-session

* **Maps to capability**: Session-Scoped Chat for Codex Session Viewer

* **Responsibility**: Build context payloads from Codex session data.

* **File structure**:

  ```txt
  src/lib/ai/context-codex-session.ts
  ```

* **Exports**:

  * `buildSessionContext(session: CodexSession): SessionContext` – normalized context.
  * `createContextPrompt(context: SessionContext, intent: ContextIntent): string` – prompt text.

---

### Module: ai-composio-tools

* **Maps to capability**: Multi-Provider AI Orchestration (Tool Invocation via Composio)

* **Responsibility**: Bridge AI SDK tool definitions to Composio SDK.

* **File structure**:

  ```txt
  src/lib/ai/composio-tools.ts
  ```

* **Exports**:

  * `getChatTools(env: AiConfig): ToolDefinition[]` – tool schemas for AI SDK.
  * `executeToolCall(call: ToolCall, context: ToolContext): Promise<ToolResult>` – execute via Composio.

---

### Module: agents-rules

* **Maps to capability**: AGENTS Rules Management

* **Responsibility**: Locate, load, and parse AGENTS.md into a structured ruleset.

* **File structure**:

  ```txt
  src/lib/agents/agents-rules.ts
  ```

* **Exports**:

  * `loadAgentsRules(repoRef: RepoRef, path?: string): Promise<AgentsRuleset>`
  * `getRuleById(rules: AgentsRuleset, id: RuleId): AgentsRule | undefined`

---

### Module: agents-linter

* **Maps to capability**: AGENTS Alignment Linting and Remediation

* **Responsibility**: Classify messages vs AGENTS rules and generate remediation templates.

* **File structure**:

  ```txt
  src/lib/agents/agents-linter.ts
  ```

* **Exports**:

  * `lintMessage(input: LintInput): Promise<AlignmentResult>`
  * `buildRemediation(result: AlignmentResult, rules: AgentsRuleset): string`

---

### Module: alignment-events

* **Maps to capability**: Alignment Event Logging and Analytics

* **Responsibility**: Define alignment event schema and handle persistence.

* **File structure**:

  ```txt
  src/lib/agents/alignment-events.ts
  ```

* **Exports**:

  * `createAlignmentEvent(event: NewAlignmentEvent): Promise<AlignmentEvent>`
  * `listAlignmentEvents(filter: AlignmentFilter): Promise<Page<AlignmentEvent>>`
  * `getAlignmentEvent(id: AlignmentEventId): Promise<AlignmentEvent | null>`

---

### Module: alignment-metrics

* **Maps to capability**: Alignment Event Logging and Analytics (Metrics)

* **Responsibility**: Provide pre-aggregated guardrail metrics for UI.

* **File structure**:

  ```txt
  src/lib/agents/alignment-metrics.ts
  ```

* **Exports**:

  * `computeAlignmentMetrics(filter: AlignmentFilter): Promise<AlignmentMetrics>`

---

### Module: observability-logging

* **Maps to capability**: Observability, Flags, and Safeguards

* **Responsibility**: Lightweight logging abstraction for AI and alignment flows.

* **File structure**:

  ```txt
  src/lib/observability/logging.ts
  ```

* **Exports**:

  * `logInfo(event: LogEvent)`
  * `logError(event: LogEvent)`

---

### Route Module: codex-session-viewer.route

* **Maps to capability**: Session-Scoped Chat for Codex Session Viewer

* **Responsibility**: Loader and UI for Codex session viewer with embedded ChatDock.

* **File structure**:

  ```txt
  src/routes/codex/session-viewer.route.tsx
  ```

* **Exports**:

  * `Route` – TanStack route with loader providing `CodexSession` and `SessionContext`.

---

### Route Module: alignment-log.route

* **Maps to capability**: Alignment Event Logging and Analytics

* **Responsibility**: Alignment log page UI and data loader.

* **File structure**:

  ```txt
  src/routes/agents/alignment-log.route.tsx
  ```

* **Exports**:

  * `Route` – TanStack route serving `/agents/alignment-log` with filters + events.

---

### Feature Module: ChatDock

* **Maps to capability**: Session-Scoped Chat, Multi-Provider AI Orchestration

* **Responsibility**: Chat UI component wired to orchestration client and alignment notifications.

* **File structure**:

  ```txt
  src/features/chatbot/ChatDock.tsx
  ```

* **Exports**:

  * `ChatDock(props: ChatDockProps)` – React component used by session viewer.

---

### Feature Module: AlignmentNotification

* **Maps to capability**: AGENTS Alignment Linting and Remediation

* **Responsibility**: Banner/toast + inline indicators for alignment status and remediation.

* **File structure**:

  ```txt
  src/features/agents/AlignmentNotification.tsx
  ```

* **Exports**:

  * `AlignmentBanner(props: { result: AlignmentResult })`
  * `MessageAlignmentBadge(props: { result: AlignmentResult })`

---

4. Dependency Chain

---

### Foundation Layer (Phase 0)

No dependencies.

* **observability-logging**: Basic logging utilities for AI and guardrails.
* **ai-config**: AI config and environment resolution.
* **core-types** (implicit): Shared domain types for sessions, messages, rules (can be folded into `src/lib/core/types.ts`).

### AI Provider Layer (Phase 1)

* **ai-providers**

  * Depends on: [core-types, ai-config]
  * Provides: resolved models and provider abstractions.

### AGENTS Rules and Events Layer (Phase 1)

* **agents-rules**

  * Depends on: [core-types, observability-logging]
* **alignment-events**

  * Depends on: [core-types, observability-logging]

### Core Service Layer (Phase 2)

* **ai-orchestrator**

  * Depends on: [ai-providers, observability-logging]
* **ai-context-codex-session**

  * Depends on: [core-types, observability-logging]
* **agents-linter**

  * Depends on: [agents-rules, ai-providers (optional for LLM-based checks), observability-logging]
* **alignment-metrics**

  * Depends on: [alignment-events]

Optional:

* **ai-composio-tools**

  * Depends on: [ai-config, observability-logging]

### Integration & UI Layer (Phase 3+)

* **codex-session-viewer.route**

  * Depends on: [ai-context-codex-session, agents-rules, ai-orchestrator (for initial chat bootstrap)]
* **ChatDock**

  * Depends on: [ai-orchestrator (client wrapper), agents-linter (via results), AlignmentNotification]
* **AlignmentNotification**

  * Depends on: [agents-linter types]
* **alignment-log.route**

  * Depends on: [alignment-events, alignment-metrics]

No cycles: higher layers only depend on layers below; AGENTS linter and orchestrator share providers but do not depend on each other mutually.

---

5. Development Phases

---

### Phase 0: Foundation

**Goal**: Establish shared types, config, and logging needed by all higher layers.

**Entry Criteria**: Existing TanStack Start app with Codex viewer + chatbot component in place.

**Tasks**:

* [ ] Implement `core-types` (depends on: none)

  * Acceptance: Types for `ChatMessage`, `SessionContext`, `AgentsRuleset`, `AlignmentResult`, `AlignmentEvent` defined and used in type-safe manner in at least one module.
  * Test strategy: Type-only compilation tests and minimal unit tests verifying basic constructors/guards.

* [ ] Implement `observability-logging` (depends on: none)

  * Acceptance: `logInfo`/`logError` usable from server modules; logs visible in local dev.
  * Test strategy: Unit tests with logger mocked/sinked; ensure no throws on logging failures.

* [ ] Implement `ai-config` (depends on: none)

  * Acceptance: Config loads from env, validates required keys for at least one provider, and exposes default model.
  * Test strategy: Unit tests with env override; failure paths for missing/invalid config.

**Exit Criteria**: Other modules can import shared types, config, and logger without errors.

**Delivers**: Stable base for AI and guardrail modules.

---

### Phase 1: Providers, AGENTS Rules, and Events

**Goal**: Build AI provider registry, AGENTS rules loader, and alignment event persistence schema.

**Entry Criteria**: Phase 0 complete.

**Tasks**:

* [ ] Implement `ai-providers` (depends on: [ai-config, core-types])

  * Acceptance: Can resolve at least `openai`-compatible and one local provider (LM Studio or Gemini CLI) into AI SDK models.
  * Test strategy: Unit tests with mocked SDK; check invalid ID handling.

* [ ] Implement `agents-rules` (depends on: [core-types, observability-logging])

  * Acceptance: Given repo + path, returns parsed `AgentsRuleset` with sections and rule IDs.
  * Test strategy: Unit tests with synthetic AGENTS.md files; path resolution and caching behavior.

* [ ] Implement `alignment-events` schema and basic persistence (depends on: [core-types, observability-logging])

  * Acceptance: `createAlignmentEvent` writes records; `listAlignmentEvents` returns filtered/paginated results.
  * Test strategy: Unit tests with in-memory or test DB; index usage verified by query plans where possible.

**Exit Criteria**:

* Models can be resolved and used by services.
* AGENTS rules and alignment events can be read/written from server code.

**Delivers**: Foundation for orchestrator, linter, and log viewer.

---

### Phase 2: Core Services (Orchestrator, Context, Linter)

**Goal**: Implement core AI and guardrail services used by UI layers.

**Entry Criteria**: Phases 0–1 complete.

**Tasks**:

* [ ] Implement `ai-orchestrator` with streaming (depends on: [ai-providers, observability-logging])

  * Acceptance: Server function `streamChat` streams responses from at least one model and returns final message metadata.
  * Test strategy: Integration tests with mocked SDK or test model; verify streaming and error handling.

* [ ] Implement `ai-context-codex-session` (depends on: [core-types, observability-logging])

  * Acceptance: Given a Codex session, returns `SessionContext`; context prompt is bounded in size.
  * Test strategy: Unit tests with synthetic sessions; boundary and redaction checks.

* [ ] Implement `agents-linter` (classification + remediation) (depends on: [agents-rules, ai-providers (optional), observability-logging])

  * Acceptance: For test AGENTS content and message samples, returns deterministic status and remediation text for known patterns.
  * Test strategy: Unit tests for rule-based checks; optional tests for LLM-based classification; snapshot tests for remediation text.

* [ ] Integrate linter with alignment-events (depends on: [agents-linter, alignment-events])

  * Acceptance: Every linted message creates an `AlignmentEvent` with correct metadata.
  * Test strategy: Integration tests from lint input → DB event.

**Exit Criteria**:

* Orchestrator and linter callable from a single server entry point.
* Alignment events produced for linted messages.

**Delivers**: Back-end AI + guardrail engine ready to be wired to UI.

---

### Phase 3: Session-Scoped Chat Integration (MVP UX)

**Goal**: Wire Codex session viewer and existing ChatDock UI to the orchestrator and linter.

**Entry Criteria**: Phases 0–2 complete.

**Tasks**:

* [ ] Extend `codex-session-viewer.route` with session context loader (depends on: [ai-context-codex-session, agents-rules])

  * Acceptance: Session viewer route loader returns `CodexSession` and `SessionContext` including AGENTS rules reference.
  * Test strategy: Integration tests loading viewer with sample session; check server-side data.

* [ ] Refactor `ChatDock` to use orchestrator client (depends on: [ai-orchestrator])

  * Acceptance: ChatDock uses orchestrator API; no direct AI SDK calls or `useEffect` fetches.
  * Test strategy: Component tests with mocked client; streaming behavior preserved.

* [ ] Integrate inline linting and notifications in ChatDock (depends on: [agents-linter, AlignmentNotification])

  * Acceptance: Misaligned user or assistant messages show banner/toast with remediation suggestion.
  * Test strategy: UI tests simulating misaligned messages; verify notifications, no blocked streaming.

**Exit Criteria**:

* End-to-end flow: open Codex session → open chat → send misaligned instruction → receive warning + remediation prompt.

**Delivers**: First usable MVP: session-scoped, guardrailed chat in Codex viewer.

---

### Phase 4: Alignment Log Viewer and Analytics

**Goal**: Expose logged alignment events via a dedicated page with basic metrics.

**Entry Criteria**: Phases 0–3 complete.

**Tasks**:

* [ ] Implement `alignment-metrics` (depends on: [alignment-events])

  * Acceptance: Computes counts grouped by status, rule, and actor for a given filter.
  * Test strategy: Unit tests with predefined events; verify aggregates.

* [ ] Implement `alignment-log.route` (depends on: [alignment-events, alignment-metrics])

  * Acceptance: Route returns filtered events and metrics; UI page renders table + metrics with filters.
  * Test strategy: Integration tests hitting route; UI tests for filter interactions.

* [ ] Wire feature flags for logging and log viewer (depends on: [ai-config, observability-logging])

  * Acceptance: Logging and viewer can be enabled/disabled per environment without breaking chat.
  * Test strategy: Config-based tests; verify behavior with flags flipped.

**Exit Criteria**:

* Alignment Log page usable for inspection and initial analysis.
* Logging path demonstrably non-blocking for chat.

**Delivers**: Analytics surface for AGENTS alignment and trend analysis.

---

### Phase 5: Advanced Tools and Diagnostics (Post-MVP)

**Goal**: Add Composio tools, AI Diagnostics view, and advanced metrics.

**Entry Criteria**: Phases 0–4 complete and stable in production-like environment.

**Tasks** (high-level):

* Implement `ai-composio-tools` and integrate tool definitions into orchestrator.
* Implement AI Diagnostics view route and UI consuming chat + alignment logs.
* Expand metrics in Alignment Log to include model/provider comparisons and rule tuning support.

**Exit Criteria**:

* Tools-enabled workflows demonstrably safe and observable.
* Diagnostics view in regular use by reliability/ops stakeholders.

---

6. User Experience

---

### Personas

* **Engineer inside Codex**

  * Works on a repo and uses Codex Session Viewer.
  * Needs fast, contextual help and automated actions that obey project rules.

* **DX / AI owner**

  * Configures AGENTS.md, tools, and models.
  * Uses log viewer and diagnostics to adjust prompts and policies.

### Key Flows

1. **Session-Scoped Chat**

   * User opens Codex Session Viewer.
   * User opens ChatDock inside viewer.
   * ChatDock shows that it is bound to current session (repo, branch).
   * User asks questions or issues commands; orchestrator handles responses with streaming.

2. **AGENTS Violation and Remediation**

   * User or assistant sends a message conflicting with AGENTS.md.
   * Inline linter returns warn/block.
   * Chat UI displays a banner and highlights offending message, along with remediation prompt prefilled in input.

3. **Alignment Review and Analysis**

   * DX owner opens `/agents/alignment-log`.
   * Filters events by repo, status, actor over a time range.
   * Inspects details and uses insights to update AGENTS.md and model choices.

### UI/UX Notes

* ChatDock should preserve existing ergonomics; new controls (model selection, tools toggle) remain secondary.
* Alignment banners must be visible but not disruptive; provide direct remediation action without forcing the user into a modal.
* Alignment log page should prioritize clarity of rule text and context; message excerpts truncated but linkable back into the original Codex session.

---

7. Technical Architecture

---

### System Components

* **TanStack Start Application Shell**

  * Routing (TanStack Router), loaders, server functions, SSR/streaming.

* **AI Orchestration Layer**

  * Vercel AI SDK–based orchestrator and provider registry.
  * Optional integration with Composio tools, LM Studio, Gemini CLI, `built-in-ai`.

* **AGENTS Guardrail Layer**

  * AGENTS loader/parser.
  * Linter service with deterministic rules and optional LLM classifier.
  * Remediation generator.

* **Alignment Logging & Analytics**

  * Alignment event persistence (likely TanStack DB or relational DB).
  * Query APIs and metrics computation.
  * Alignment log route and UI.

* **Codex Session Viewer + ChatDock UI**

  * Session route loader providing `CodexSession` and `SessionContext`.
  * Reused ChatDock with orchestrator client and alignment notifications.

### Data Models (key)

* `ChatMessage`: `{ id, sessionId, role, text, createdAt, modelId, toolCalls? }`
* `SessionContext`: `{ sessionId, repoId, branch, summary, keyEvents[], files[] }`
* `AgentsRuleset`: `{ repoRef, sections[], rules[] }`
* `AlignmentResult`: `{ messageId, status, violatedRules[], reason, remediationText? }`
* `AlignmentEvent`: `{ id, createdAt, sessionId, repoId, messageId, actor, status, ruleId?, severity, messageExcerpt, agentsSection?, remediationSuggested, remediationText?, tags[], schemaVersion }`

### Technology Stack

* TypeScript + React
* TanStack Start (Router/Start/Query)
* Vercel AI SDK (`ai`) with multiple providers including OpenAI-compatible, LM Studio, Gemini CLI, `built-in-ai` for in-browser models.
* Composio SDK for external tools (post-MVP).
* TanStack DB or equivalent for persistence of sessions and alignment events.

### Example Decisions

**Decision: TanStack Start + Constructa as app framework**

* **Rationale**: Align with existing AGENTS-first rules and avoid mixing Next.js idioms with TanStack patterns.
* **Trade-offs**: Smaller ecosystem and fewer ready-made AI templates vs Next.js; more manual porting of AI patterns.
* **Alternatives**: Next.js AI Chatbot template, LangChain + Next.js starter.

**Decision: Inline AGENTS linting vs asynchronous audit-only**

* **Rationale**: Immediate feedback to keep sessions aligned while still logging for later analysis.
* **Trade-offs**: Potential latency impact; more careful optimization required.
* **Alternatives**: Offline periodic audits or external guardrail services only.

**Decision: Structured alignment events with versioned schema**

* **Rationale**: Enable evolving analytics, guardrails, and external integrations without schema lock-in.
* **Trade-offs**: Slightly more complexity in event construction and migrations.
* **Alternatives**: Raw text logs only; would limit analytics and structured querying.

---

8. Test Strategy

---

## Test Pyramid

```txt
        /\
       /E2E\       ← ~10%
      /------\
     /Integration\ ← ~30%
    /------------\
   /  Unit Tests  \ ← ~60%
  /----------------\
```

## Coverage Requirements

* Line coverage: ≥80% for AI, AGENTS, and logging modules.
* Branch coverage: ≥70% for linter and orchestrator decision logic.
* Function coverage: ≥85% for exported functions in `ai-*` and `agents-*`.
* Statement coverage: ≥80% overall for new codepaths.

## Critical Test Scenarios

### ai-orchestrator

**Happy path**:

* Chat with no tools, single provider; streaming response completes successfully.

**Edge cases**:

* Long context truncated correctly.
* Model ID not configured → fallback to default with logged warning.

**Error cases**:

* Provider error (network/API) → error surfaced cleanly, no crash.

**Integration points**:

* Correct invocation of AI SDK with tools enabled; compatibility with Composio adapter (post-MVP).

### agents-rules

**Happy path**:

* AGENTS.md at repo root loaded and parsed into ruleset.

**Edge cases**:

* Nested AGENTS file overriding root for subpath.
* Missing AGENTS.md → fallback to “no rules” but system remains functional.

**Error cases**:

* File read failures → logged and handled gracefully.

### agents-linter

**Happy path**:

* Messages clearly compliant with AGENTS flagged as aligned.

**Edge cases**:

* Ambiguous instructions where deterministic rules and LLM-based classifier are combined.

**Error cases**:

* LLM classifier failure/timeouts → fallback to deterministic-only checks.

**Integration points**:

* `AlignmentResult` correctly converted into `AlignmentEvent` and UI notifications.

### alignment-events and alignment-log.route

**Happy path**:

* Events written for both aligned and misaligned messages; log page shows them with correct filters.

**Edge cases**:

* Large volumes over time; pagination and date filters still performant.

**Error cases**:

* DB unavailable → chat continues; viewer displays degraded-mode message.

## Test Generation Guidelines

* Prefer small, deterministic fixtures for AGENTS.md and sessions to keep tests stable.
* Explicitly test transitions between statuses (aligned → warn after rule change).
* For any LLM-in-the-loop behavior, use mocked/stubbed classifier in tests with fixed outputs.
* E2E tests run against a test environment with sandboxed providers or mocked AI SDK.

---

9. Risks and Mitigations

---

## Technical Risks

**Risk**: TanStack Start + Constructa ecosystem maturity and fewer battle-tested AI patterns.

* **Impact**: Medium – integration bugs and streaming edge cases.
* **Likelihood**: Medium.
* **Mitigation**: Port minimal, well-understood patterns from Vercel AI templates; add integration tests for streaming and SSR.
* **Fallback**: Keep orchestrator largely framework-agnostic to ease migration if framework changes.

**Risk**: AGENTS.md natural-language variability.

* **Impact**: High – brittle parsing or misclassification.
* **Likelihood**: High.
* **Mitigation**: Use tolerant parsing; rely on rule IDs/paths instead of strict structure; incorporate human review via alignment log.
* **Fallback**: Restrict guardrail enforcement to a curated subset of rules.

**Risk**: Inline linter latency and LLM costs.

* **Impact**: Medium – degraded UX and higher costs.
* **Likelihood**: Medium.
* **Mitigation**: Prefer deterministic checks; reserve LLM classifier for rare/ambiguous cases; measure latency; add configuration to cap usage.
* **Fallback**: Switch to warn-only with deterministic rules; move some checks to offline audits.

**Risk**: Composio tool security and permissions (post-MVP).

* **Impact**: High – potential for unintended side effects in external systems.
* **Likelihood**: Medium.
* **Mitigation**: Whitelist tools; use least-privilege auth; restrict tools by environment; log all tool calls.
* **Fallback**: Disable tools via flags and run chatbot as read-only assistant.

## Dependency Risks

* Dependence on external AI providers (OpenAI-compatible, Gemini, LM Studio) for orchestration; outages or API changes could disrupt chat.

  * Mitigation: Multi-provider fallback in provider registry; local LM Studio and in-browser models as backup where possible.

* Dependence on AGENTS.md quality and maintainability; poor or outdated content reduces guardrail effectiveness.

  * Mitigation: Make alignment log a primary feedback loop for editing AGENTS.md.

## Scope Risks

* Over-extending scope into advanced analytics and diagnostics before MVP is stable.

  * Mitigation: Enforce phase boundaries; MVP defined as session-scoped chat + inline AGENTS guardrails + basic alignment log viewer.

* Trying to wire all tools and multi-modal features in one step.

  * Mitigation: Defer Composio and multi-modal features to Phase 5; keep MVP text-only.

---

10. Appendix

---

## References

* Chatbot project stack and prior planning notes.
* RPG PRD template and methodology.
* Context + PRD skeleton for broader product framing.
* Vercel AI SDK docs and elements.
* Composio docs and security advisories.
* AGENTS.md spec and community guides.

## Glossary

* **Codex Session**: Recorded AI-assisted coding session with associated repo and events.
* **AGENTS.md**: Project-local instructions file guiding agent behavior for repos.
* **Alignment**: Degree to which messages adhere to AGENTS rules and intended workflows.
* **AlignmentEvent**: Structured record of a single alignment check result.
* **Composio**: Tool execution platform integrating external services into AI workflows.

## Open Questions (to resolve during design/implementation)

* Clarification needed: which specific providers (OpenAI-compatible, LM Studio, Gemini, in-browser) must be fully supported in MVP.
* Clarification needed: allowed tools and permission model for Composio in each environment.
* Clarification needed: retention period and access control requirements for alignment events and chat transcripts.
* Clarification needed: strictness of AGENTS enforcement (warn-only vs blocking) in production vs internal environments.

---

11. Task-Master Integration Notes

---

* **Capabilities → tasks**: Each `Capability` block defines a primary Task-Master task (e.g., “Implement AI Orchestration”, “Implement AGENTS Linter”).
* **Features → subtasks**: Each `Feature` under a capability maps to a subtask with explicit inputs/outputs/behavior; MVP features should be tagged high priority.
* **Dependencies → task deps**: Dependency Chain section provides topological ordering; tasks for modules in higher layers depend on those in lower layers.
* **Phases → priorities**: Development Phases map to Task-Master priorities (Phase 0 highest, Phase 5 lowest), ensuring early delivery of a usable, guardrailed session-scoped chat MVP.
