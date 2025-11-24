# PRD.md

## v2 revision

---

## 1) Overview

Codex Session Viewer is a TanStack/React web app for replaying and analyzing captured coding/agent sessions, with a timeline, discovery tools, and a chat-like dock.

The new scope is to add first-class chatbot capabilities on top of this viewer that can:

* Consume the active session (timeline, logs, chat turns, metadata).
* Interpret it against AGENTS.md rules for your TanStack/AGENTS environment.
* Detect and surface misalignment in near-real-time.
* Propose remediation and refactor plans.
* Generate pop-out summaries and commit messages.
* Work across multiple provider ecosystems and local session logs.

### Problem

Today, Codex Session Viewer is a powerful passive analysis tool but does not actively guide users during or after a session:

* Misalignment with AGENTS rules is only discoverable through manual inspection of sessions and rules.
* Refactor and feature-planning opportunities are not surfaced at the right time.
* Summaries and commit messages must be written manually from memory or rough notes.
* Only a single capture pipeline is supported; other popular coding agents and local logs are not integrated.

This leads to:

* Slow feedback loops on architecture violations.
* Missed windows for impactful refactors.
* Repeated manual summarization and commit-writing work.
* Fragmented analysis across tools.

### Target Users

* Individual developers recording sessions from LLM coding agents or custom tooling.
* AI engineers debugging agent behavior across sessions.
* Tech leads performing code review and refactor planning driven by agent transcripts.
* Tooling authors building AGENTS-compliant TanStack apps and wanting feedback from real use.

### Success Metrics

* ≥80% of AGENTS violations in a session are auto-detected and surfaced without manual rule lookup.
* ≥50% reduction in time to identify root cause of a misaligned session (self-reported).
* ≥70% of sessions that trigger misalignment create at least one remediation plan via chatbot.
* ≥50% of post-session summaries and commit messages are generated via the tool instead of written from scratch.
* Ability to ingest session histories from at least 2 additional external coding agents within the same UI.

---

## 2) Capability Tree (Functional Decomposition)

### Capability: Chatbot Session Orchestration

High-level: Turn Codex Session Viewer into an interactive AI assistant that understands the active session and AGENTS rules.

#### Feature: ChatDock LLM Wiring

* **Description**: Connect existing ChatDock UI to a live LLM backend with session-aware context.
* **Inputs**:

  * Current session snapshot (events, metadata, chat transcript).
  * User chat messages.
  * System prompts / model configuration.
* **Outputs**:

  * Streaming assistant messages.
  * Error states (rate limits, provider failures).
* **Behavior**:

  * Construct a base prompt that includes session summary and AGENTS context stub.
  * Use Vercel AI SDK `useChat`/`streamText` wired to configured provider.
  * Maintain conversation state per session ID.
  * Support abort/retry for individual turns.
* **MVP**: Yes.

#### Feature: Session Context Builder

* **Description**: Transform raw session data into compact, model-ready context.
* **Inputs**:

  * Timeline events (actions, mutations, logs).
  * Chat turns and console/network logs.
  * Repo metadata and file paths.
* **Outputs**:

  * Structured context object (e.g., summarized timeline, key errors, AGENTS flags).
  * Token-bounded serialized prompt segments.
* **Behavior**:

  * Apply deterministic summarization and bucketing: “recent N events”, “critical errors”, “user goals inferred”.
  * Enforce token budget per provider; drop low-value sections first.
  * Cache per-session summaries for reuse across turns.
* **MVP**: Yes.

---

### Capability: AGENTS Rule Awareness and Misalignment Detection

#### Feature: AGENTS.md Parser

* **Description**: Parse AGENTS.md into a structured set of rules and anti-patterns.
* **Inputs**:

  * AGENTS.md markdown file.
* **Outputs**:

  * Normalized rule set (id, title, description, severity, tags, detection hints).
* **Behavior**:

  * Parse headings and bullet lists into rules.
  * Allow manual annotations (e.g., `<!-- rule-id: AGENTS-001 severity: high -->`).
  * Provide query API: lookup by tag, severity, or keyword.
* **MVP**: Yes.

#### Feature: Automatic Misalignment Detector

* **Description**: Detect violations of AGENTS rules from session data as the session is analyzed.
* **Inputs**:

  * Parsed AGENTS rule set.
  * Session context (events, logs, chat).
* **Outputs**:

  * List of misalignment events (rule id, evidence, severity, suggested explanation).
* **Behavior**:

  * Run a hybrid pipeline:

    * Fast heuristic checks for simple rules (e.g., “no client fetch in effects”).
    * LLM call to classify complex patterns against rules.
  * Mark misalignments with timestamps and associated events.
  * Update when new evidence appears or rules change.
* **MVP**: Yes.

#### Feature: Misalignment Notification + Remediation Prompt

* **Description**: Surface misalignment immediately in the viewer and drive a remediation chat flow.
* **Inputs**:

  * Misalignment events.
  * Active session route in UI.
* **Outputs**:

  * UI notifications (banner, toast, timeline badges).
  * Pre-filled remediation prompt in ChatDock.
* **Behavior**:

  * When a new misalignment is detected, show a non-modal notification anchored to session timeline.
  * Allow user to click “Explain & fix” to auto-send a remediation prompt that includes the rule, evidence, and user goal.
  * Track which misalignments have been acknowledged or dismissed.
* **MVP**: Yes.

---

### Capability: Refactor and Task Timing Intelligence

#### Feature: Task Opportunity Detection

* **Description**: Infer optimal times to perform specific tasks (e.g., heavy refactors) based on session structure.
* **Inputs**:

  * Session timeline and durations.
  * Refactor/task definitions and heuristics.
* **Outputs**:

  * Ranked list of “opportunity windows” with task suggestions.
* **Behavior**:

  * Analyze where the user is idle, repeatedly stuck, or wrapping up a feature.
  * Use LLM to classify whether a given window suits heavy refactor or light clean-up.
  * Attach task opportunities to timeline markers and chat suggestions.
* **MVP**: No (post-MVP).

#### Feature: Refactor Scheduling Advisor

* **Description**: Decide whether to suggest heavy refactors early vs near session end, given remaining time/effort.
* **Inputs**:

  * Task opportunity windows.
  * Historical session lengths and completion rates.
* **Outputs**:

  * Recommendations: “do this refactor now” vs “log for next session”.
* **Behavior**:

  * Estimate “remaining session energy” based on past sessions and current elapsed time.
  * Favor heavy refactors early; defer them when risk of incomplete work is high.
  * Surface decisions via chatbot messages and optional TODO export.
* **MVP**: No.

#### Feature: Smart Feature Implementation Planning

* **Description**: Turn remediation recommendations into concrete feature/refactor plans.
* **Inputs**:

  * Misalignment events.
  * Task opportunities.
  * User’s described goals and repo metadata.
* **Outputs**:

  * Ordered list of implementation steps (with references to files and modules).
* **Behavior**:

  * Ask the LLM to propose implementation steps constrained by AGENTS rules.
  * Attach each step to relevant code regions and misalignment IDs.
  * Allow export as markdown (future Task Master integration).
* **MVP**: No.

---

### Capability: Pop-Out Knowledge Artifacts

#### Feature: Pop-Out Session Summaries

* **Description**: Generate concise, shareable summaries of a session in a pop-out panel.
* **Inputs**:

  * Session context.
  * Optional user instructions (e.g., “audience: tech lead”).
* **Outputs**:

  * Structured summary (goals, main changes, issues, follow-ups).
* **Behavior**:

  * Invoke summarization chain using LLM with AGENTS-aware hints.
  * Render in a resizable pop-out panel linked to current session.
  * Support export to clipboard and markdown file download.
* **MVP**: Yes.

#### Feature: Pop-Out Commit Message Generator

* **Description**: Generate commit message drafts from the session history.
* **Inputs**:

  * Session events including file edits and git metadata if available.
  * Optional commit style preferences.
* **Outputs**:

  * One or more commit message suggestions.
* **Behavior**:

  * Infer high-level changes and scope from events.
  * Respect project conventions (e.g., Conventional Commits) when configured.
  * Show suggestions in a pop-out; allow quick copy and light editing.
* **MVP**: Yes.

---

### Capability: Multi-Provider Session Ingestion

#### Feature: External Coding Agent Session Importers

* **Description**: Ingest and normalize session histories from other coding agents (e.g., local logs, hosted tools).
* **Inputs**:

  * Uploaded or API-fetched session exports (JSON, NDJSON, logs).
  * Provider metadata.
* **Outputs**:

  * Normalized session objects compatible with Codex Session Viewer.
* **Behavior**:

  * Implement per-provider adapters mapping their schema to internal session model.
  * Tag sessions with provider and repo/branch metadata.
  * Handle partial/malformed exports gracefully.
* **MVP**: No.

#### Feature: Custom Local Session Logger

* **Description**: Provide a minimal local logging spec and tools to create AGENTS-compatible sessions from arbitrary workflows.
* **Inputs**:

  * Local events emitted by CLI/editor extension or simple SDK.
* **Outputs**:

  * Session log files adhering to viewer’s session schema.
* **Behavior**:

  * Define a JSONL schema and library for emitting events.
  * Optionally provide a small CLI to package sessions for upload into Codex Session Viewer.
* **MVP**: No.

---

## 3) Repository Structure + Module Definitions (Structural Decomposition)

Targeting existing structure: `src/routes`, `src/features/viewer`, `src/components/viewer`, `src/hooks`, `src/lib`, `src/server`.

### Proposed High-Level Structure

```txt
src/
├── features/
│   ├── viewer/                 # existing
│   └── chatbot/                # new feature domain
│       ├── chatbot.runtime.ts
│       ├── context-builder.ts
│       ├── misalignment-detector.ts
│       ├── task-opportunities.ts
│       ├── summaries.ts
│       ├── commit-messages.ts
│       └── index.ts
├── components/
│   └── chatbot/
│       ├── ChatDockPanel.tsx
│       ├── MisalignmentBanner.tsx
│       ├── MisalignmentTimelineBadges.tsx
│       ├── SummaryPopout.tsx
│       └── CommitPopout.tsx
├── lib/
│   ├── agents-rules/
│   │   ├── parser.ts
│   │   └── index.ts
│   ├── ai/
│   │   ├── provider.ts
│   │   ├── prompt-templates.ts
│   │   └── index.ts
│   └── sessions/
│       ├── model.ts
│       ├── ingest-external.ts
│       └── index.ts
├── server/
│   ├── chatbot-api.server.ts
│   └── sessions.server.ts
└── routes/
    └── (site)/viewer/index.tsx # wired to ChatDock changes
```

### Module Definitions

#### Module: `lib/ai`

* **Maps to capability**: Chatbot Session Orchestration.
* **Responsibility**: Provide a unified LLM client and shared prompt templates for all chatbot features.
* **File structure**:

  ```txt
  lib/ai/
  ├── provider.ts          # AI SDK model selection, streaming, error mapping
  ├── prompt-templates.ts  # base prompts for chat, summaries, commits
  └── index.ts             # re-exports
  ```
* **Exports**:

  * `getChatModel(config)`: resolve AI SDK model instance.
  * `streamChat(options)`: high-level wrapper around `streamText` / `useChat` server function.
  * `buildPromptTemplate(type, args)`: construct standardized prompts.

#### Module: `lib/agents-rules`

* **Maps to capability**: AGENTS Rule Awareness and Misalignment Detection.
* **Responsibility**: Parse and expose AGENTS.md as structured rules.
* **File structure**:

  ```txt
  lib/agents-rules/
  ├── parser.ts
  └── index.ts
  ```
* **Exports**:

  * `loadAgentsRules(pathOrContent)`: parse markdown to rule set.
  * `getRuleById(id)`, `queryRules(filters)`: lookup helpers.
  * Types: `AgentsRule`, `RuleSeverity`.

#### Module: `lib/sessions`

* **Maps to capability**: Multi-Provider Session Ingestion.
* **Responsibility**: Define canonical session model and provide ingestion utilities.
* **File structure**:

  ```txt
  lib/sessions/
  ├── model.ts
  ├── ingest-external.ts
  └── index.ts
  ```
* **Exports**:

  * Types: `Session`, `SessionEvent`, `ProviderId`.
  * `normalizeSession(raw, providerId)`.
  * `registerProviderAdapter(providerId, adapter)`.

#### Module: `features/chatbot`

* **Maps to capabilities**: Chatbot Session Orchestration, Misalignment Detection, Refactor Intelligence, Pop-Out Knowledge.
* **Responsibility**: Implement feature-level business logic over core libs.
* **File structure**:

  ```txt
  features/chatbot/
  ├── chatbot.runtime.ts
  ├── context-builder.ts
  ├── misalignment-detector.ts
  ├── task-opportunities.ts
  ├── summaries.ts
  ├── commit-messages.ts
  └── index.ts
  ```
* **Exports**:

  * `buildSessionContext(session)`.
  * `detectMisalignments(session, rules)`.
  * `suggestTasks(session, rules)`.
  * `generateSummary(session, options)`.
  * `generateCommitMessages(session, options)`.
  * `createChatRuntime(options)` → orchestrator used by server endpoints.

#### Module: `components/chatbot`

* **Maps to capability**: Presentation for all chatbot-related flows.
* **Responsibility**: UI shells, pop-outs, and timeline indicators.
* **File structure**:

  ```txt
  components/chatbot/
  ├── ChatDockPanel.tsx
  ├── MisalignmentBanner.tsx
  ├── MisalignmentTimelineBadges.tsx
  ├── SummaryPopout.tsx
  └── CommitPopout.tsx
  ```
* **Exports**:

  * `ChatDockPanel` – wraps AI SDK UI components, wired to viewer.
  * `MisalignmentBanner` – top-of-viewer notification.
  * `MisalignmentTimelineBadges` – markers on existing timeline.
  * `SummaryPopout`, `CommitPopout` – shadcn-based pop-outs.

#### Module: `server/chatbot-api.server`

* **Maps to capability**: Chatbot Session Orchestration.
* **Responsibility**: Server functions providing AI calls and misalignment analysis.
* **File structure**:

  ```txt
  server/
  ├── chatbot-api.server.ts
  ```
* **Exports**:

  * `chatbotStreamServerFn(request)`: TanStack Start server function wrapping AI SDK streaming.
  * `analyzeSessionServerFn(sessionId)`: run misalignment detection and task suggestions.

#### Module: `server/sessions.server`

* **Maps to capability**: Multi-Provider Session Ingestion.
* **Responsibility**: Discover sessions, handle uploads, and resolve session IDs for chatbot.
* **Exports**:

  * `getSessionById(sessionId)`.
  * `listSessionsWithProviders()`.
  * `uploadSessionHandler(file, providerId)`.

---

## 4) Dependency Chain

### Foundation Layer (Phase 0)

No dependencies.

* **Module `lib/ai`**: Provides provider-agnostic LLM abstraction and shared prompt templates. Depends on: [].
* **Module `lib/agents-rules`**: Parses and queries AGENTS rules. Depends on: [].
* **Module `lib/sessions`**: Canonical session model and adapters. Depends on: [].

### Core Analysis Layer (Phase 1)

* **Module `features/chatbot/context-builder`**: Depends on: [`lib/sessions`].
* **Module `features/chatbot/misalignment-detector`**: Depends on: [`lib/agents-rules`, `lib/sessions`, `lib/ai`].
* **Module `features/chatbot/summaries`**: Depends on: [`lib/ai`, `lib/sessions`].
* **Module `features/chatbot/commit-messages`**: Depends on: [`lib/ai`, `lib/sessions`].

### Orchestration & API Layer (Phase 2)

* **Module `features/chatbot/chatbot.runtime`**: Depends on: [`lib/ai`, `features/chatbot/context-builder`, `features/chatbot/misalignment-detector`].
* **Module `server/chatbot-api.server`**: Depends on: [`lib/ai`, `features/chatbot/*`].
* **Module `server/sessions.server`**: Depends on: [`lib/sessions`].

### Advanced Intelligence & Integrations Layer (Phase 3)

* **Module `features/chatbot/task-opportunities`**: Depends on: [`lib/sessions`, `lib/ai`, `features/chatbot/context-builder`].
* **Module `lib/sessions/ingest-external`** (provider adapters): Depends on: [`lib/sessions`].

### UI Layer (Phase 4)

* **Module `components/chatbot/*`**: Depends on: [`features/chatbot/*`].
* **Route wiring in `routes/(site)/viewer/index.tsx`**: Depends on: [`components/chatbot/*`, existing viewer components].

No cycles: each module only depends on layers at or below its own.

---

## 5) Development Phases

### Phase 0: Core AI and Rules Foundations

**Goal**: Establish AI client, AGENTS rules parsing, and unified session model.

**Entry Criteria**: Existing Codex Session Viewer builds and passes baseline tests.

**Tasks**:

* [ ] Implement `lib/ai` (depends on: [])

  * Acceptance criteria:

    * Can call a dummy model via AI SDK from a server function.
    * Prompt templates for “chat”, “summary”, “commit” exist and are unit-tested.
  * Test strategy:

    * Unit tests with mocked AI SDK.
    * Contract tests for template construction.

* [ ] Implement `lib/agents-rules` (depends on: [])

  * Acceptance criteria:

    * Given a sample AGENTS.md, returns ≥90% of rules with ids and severity set.
    * Query API supports filter by severity and text search.
  * Test strategy:

    * Snapshot tests for parsing.
    * Edge-case tests for malformed markdown.

* [ ] Implement `lib/sessions` base model (depends on: [])

  * Acceptance criteria:

    * Session types cover events used in viewer.
    * Existing viewer can compile against new types with minimal changes.
  * Test strategy:

    * Type-level tests (TS) and runtime shape validation for sample sessions.

**Exit Criteria**: All downstream modules can import `lib/ai`, `lib/agents-rules`, and `lib/sessions` without circular dependencies.

**Delivers**: Stable foundation for any AI-backed features and rules logic.

---

### Phase 1: Core Analysis for Misalignment, Summaries, Commits

**Goal**: Enable programmatic misalignment detection and artifact generation given a session.

**Entry Criteria**: Phase 0 complete.

**Tasks**:

* [ ] Implement `features/chatbot/context-builder` (depends on: [`lib/sessions`])

  * Acceptance criteria:

    * Given a session, returns a context object with timeline summary and key errors.
    * Token budget enforcement function exists and is tested.
  * Test strategy:

    * Unit tests with diverse synthetic sessions.
    * Boundary tests for token budget trimming.

* [ ] Implement `features/chatbot/misalignment-detector` (depends on: [`lib/agents-rules`, `lib/sessions`, `lib/ai`])

  * Acceptance criteria:

    * API: `detectMisalignments(session, rules)` returns structured misalignment list.
    * Supports stubbed heuristic rules without calling LLM for tests.
  * Test strategy:

    * Unit tests for heuristic checks.
    * Integration test with LLM behind a mocked interface or deterministic fixture.

* [ ] Implement `features/chatbot/summaries` (depends on: [`lib/ai`, `lib/sessions`])

  * Acceptance criteria:

    * `generateSummary(session, options)` returns a markdown summary string.
    * Handles long sessions with truncation while preserving main goals.
  * Test strategy:

    * Golden-file tests for stable summarization behavior on test fixtures.

* [ ] Implement `features/chatbot/commit-messages` (depends on: [`lib/ai`, `lib/sessions`])

  * Acceptance criteria:

    * Generates at least one commit message with scoped subject line and bullet list.
    * Supports style configuration.
  * Test strategy:

    * Unit tests verifying structure and adherence to style schema.

**Exit Criteria**: Given a session and AGENTS rules, backend utilities can produce misalignments, summaries, and commit messages via direct function calls.

**Delivers**: Non-UI backend that can be exercised via REPL or test routes.

---

### Phase 2: Chat Runtime and Server Functions

**Goal**: Wire up streaming chat and analysis endpoints usable by the viewer.

**Entry Criteria**: Phases 0–1 complete.

**Tasks**:

* [ ] Implement `features/chatbot/chatbot.runtime` (depends on: [`lib/ai`, `features/chatbot/context-builder`, `features/chatbot/misalignment-detector`])

  * Acceptance criteria:

    * Provides orchestration for building prompts, injecting session context, and calling AI.
    * Exposes hooks for attaching misalignment events to chat turns.
  * Test strategy:

    * Integration tests via mocked AI client.
    * Ensure conversation state is deterministic given seeds.

* [ ] Implement `server/chatbot-api.server` streaming endpoint (depends on: [`lib/ai`, `features/chatbot/*`])

  * Acceptance criteria:

    * TanStack Start server function returns streaming responses compatible with AI SDK UI `useChat`.
    * Endpoint accepts `sessionId` and user messages; attaches misalignment context when available.
  * Test strategy:

    * E2E tests hitting the server function with a fixture session.
    * Error-path tests (missing session, provider errors).

* [ ] Extend `server/sessions.server` for chatbot needs (depends on: [`lib/sessions`])

  * Acceptance criteria:

    * `getSessionById` returns enriched session ready for context builder.
  * Test strategy:

    * Unit tests with in-repo fixtures.

**Exit Criteria**: Local dev environment can call `/api/chatbot` (or equivalent server function) and stream responses with session-aware context.

**Delivers**: Usable but unstyled chat endpoint that can be hooked into existing UI.

---

### Phase 3: Viewer UI Integration (MVP)

**Goal**: Integrate chatbot, misalignment notifications, and pop-out artifacts into Codex Session Viewer UI.

**Entry Criteria**: Phases 0–2 complete.

**Tasks**:

* [ ] Implement `components/chatbot/ChatDockPanel` and wire to viewer route (depends on: [`server/chatbot-api.server`, `features/chatbot/chatbot.runtime`])

  * Acceptance criteria:

    * ChatDock visible in viewer with session-scoped conversation.
    * Messages stream and auto-scroll.
  * Test strategy:

    * Cypress/Playwright E2E test: send a message and assert streamed response.
    * Visual regression test for layout.

* [ ] Implement `MisalignmentBanner` and `MisalignmentTimelineBadges` (depends on: [`features/chatbot/misalignment-detector`])

  * Acceptance criteria:

    * Misalignments appear as banner + timeline markers for a fixture session.
    * Clicking banner opens ChatDock with pre-filled remediation prompt.
  * Test strategy:

    * E2E tests using recorded misalignment fixtures.
    * Unit tests on components for states: none, some, many misalignments.

* [ ] Implement `SummaryPopout` and `CommitPopout` (depends on: [`features/chatbot/summaries`, `features/chatbot/commit-messages`])

  * Acceptance criteria:

    * Pop-out triggers present in viewer.
    * User can generate and copy summary/commit text.
  * Test strategy:

    * E2E tests verifying successful generation and copy.
    * Accessibility tests (focus management, keyboard nav).

**Exit Criteria**: From the viewer, a user can chat with the session-aware assistant, see misalignment alerts, and spawn summaries/commit messages without leaving the app.

**Delivers (MVP)**: An end-to-end usable chatbot experience centered on AGENTS compliance and artifact generation for Codex Session Viewer.

---

### Phase 4: Advanced Task Timing and Multi-Provider Support

**Goal**: Add refactor timing intelligence and external provider ingestion.

**Entry Criteria**: MVP (Phase 3) complete and stable.

**Tasks**:

* [ ] Implement `features/chatbot/task-opportunities` and UI surfacing (depends on: [`lib/sessions`, `lib/ai`, `features/chatbot/context-builder`])

  * Acceptance criteria:

    * For a fixture session, returns ranked opportunities and displays at least one suggestion in the UI.
  * Test strategy:

    * Unit tests with synthetic sessions.
    * UX tests to ensure suggestions don’t overwhelm users.

* [ ] Implement external provider adapters in `lib/sessions/ingest-external` (depends on: [`lib/sessions`])

  * Acceptance criteria:

    * At least two concrete provider adapters (e.g., “Generic JSONL”, “Local log v1”).
    * Imported sessions appear indistinguishably in viewer and are usable by chatbot.
  * Test strategy:

    * Integration tests with real export samples.

* [ ] Implement Custom Local Session Logger spec and thin SDK (may live in separate repo; depends on: [`lib/sessions`])

  * Acceptance criteria:

    * CLI or library can generate a session file that the viewer can load end-to-end.
  * Test strategy:

    * Round-trip test: emit log → open in viewer → chat + misalignment works.

**Exit Criteria**: Viewer robustly analyzes sessions from multiple providers and suggests task timing/refactor opportunities.

**Delivers**: Higher-order intelligence and broader applicability beyond a single capture pipeline.

---

## 6) User Experience

### Personas

* **AGENTS-oriented app developer**: Builds TanStack Start apps under AGENTS constraints, wants immediate feedback on violations and concrete fixes.
* **AI tooling engineer**: Integrates multiple coding agents, needs a unified view and assistant to understand misbehavior across sessions.
* **Team lead / reviewer**: Consumes summaries and commit messages to review work quickly.

### Key Flows

1. **Inspect and remediate a misaligned session**

   * Open a session in Codex Session Viewer.
   * Misalignment banner appears; timeline shows badges at problematic moments.
   * User clicks banner → ChatDock opens with remediation prompt.
   * Assistant explains violation referencing AGENTS rule and suggests changes.
   * User exports implementation plan or notes.

2. **Generate summary and commit message after a session**

   * With session open, user clicks “Generate summary”.
   * SummaryPopout shows concise markdown summary.
   * User copies summary into issue tracker.
   * User opens CommitPopout, selects commit style, copies suggested commit message into git.

3. **Explore refactor opportunities (post-MVP)**

   * User opens “Opportunities” view in ChatDock.
   * Assistant lists suggested refactors and timing rationale.
   * User converts selected items into tasks or defers them.

4. **Analyze sessions from external providers (post-MVP)**

   * User uploads session export from another coding agent.
   * Viewer normalizes and displays it.
   * Chatbot and misalignment features operate on imported session identically.

### UI/UX Notes

* Use existing shadcn/ui design language and layout patterns.
* ChatDock should be collapsible to avoid encroaching on replay timeline.
* Misalignment indications must be visually distinct but not blocking: non-modal banner, subtle timeline markers.
* Pop-outs are side-sheets or dialogs with explicit close buttons and keyboard accessibility.
* All AI actions should show loading/progress indicators and error toasts with retry.

---

## 7) Technical Architecture

### System Components

* **Frontend (React + TanStack Start)**: Viewer route, ChatDock, and pop-outs; uses AI SDK UI `useChat` for streaming chat.
* **Backend (Node 20 server functions)**:

  * Chatbot server functions wrapping Vercel AI SDK.
  * Session discovery/lookup functions (existing) extended for chatbot.
* **Libraries**:

  * `lib/ai` for provider abstraction.
  * `lib/agents-rules` for AGENTS parsing.
  * `lib/sessions` for canonical session records and multi-provider ingest.
* **Optional Python service** (later): For heavier DSPy/LangChain optimization flows, invoked via HTTP/MCP tools.
* **Storage**:

  * Existing filesystem/session snapshots as per viewer.
  * Optional Postgres/pgvector for persisted embeddings if needed for large-scale semantic search.

### Data Models

* `Session`:

  * `id`, `providerId`, `repo`, `branch`, `timestamp`, `events: SessionEvent[]`.
* `SessionEvent`:

  * `type` (ACTION | MUTATION | LOG | AI_MESSAGE | USER_MESSAGE | etc.).
  * `timestamp`, `payload` (typed union).
* `AgentsRule`:

  * `id`, `title`, `description`, `severity`, `tags`, `detectionHints`.
* `Misalignment`:

  * `id`, `ruleId`, `sessionId`, `eventRange`, `severity`, `evidence`, `status`.
* `ChatMessage`:

  * `id`, `role`, `content`, `sessionId`, optional `misalignmentId`.

### APIs and Integrations

* **Chatbot API**:

  * `POST /api/chatbot/stream` (abstractly via server function):

    * Body: `{ sessionId, messages[], mode }`.
    * Streams tokens and side-channel metadata (misalignments, suggestions).
* **Analysis API**:

  * `POST /api/chatbot/analyze`:

    * Body: `{ sessionId }`.
    * Response: `{ misalignments[], summary, commitMessages[] }`.
* **Session API**:

  * `GET /api/sessions/:id` – returns normalized session.
  * `POST /api/sessions/import` – accepts external provider payloads.

### Key Decisions

* **Use Vercel AI SDK for all LLM calls**

  * **Rationale**: Unified provider abstraction and streaming semantics that fit TanStack Start.
  * **Trade-offs**: Ties low-level client to AI SDK; any non-OpenAI-compatible provider must be wrapped.
* **Keep AGENTS parsing in Node, not the browser**

  * **Rationale**: Avoid shipping rules parsing logic + AGENTS.md to client; easier to update server-side.
  * **Trade-offs**: Slightly more server complexity; need to transport rules metadata to client for UI labeling.

---

## 8) Test Strategy

### Test Pyramid

```txt
        /\
       /E2E\       ← ~10%
      /------\
     /Integration\ ← ~30%
    /------------\
   /  Unit Tests  \ ← ~60%
  /----------------\
```

### Coverage Requirements

* Line coverage: 80%+
* Branch coverage: 70%+
* Function coverage: 80%+
* Statement coverage: 80%+

### Critical Test Scenarios

#### Module: `lib/agents-rules`

* **Happy path**:

  * Parse well-formed AGENTS.md with annotations.
  * Expected: All rules created with correct ids and severities.
* **Edge cases**:

  * Missing annotations, nested lists, unusual headings.
  * Expected: Parsing still yields usable rules; logs warnings not crashes.
* **Error cases**:

  * Empty file or invalid encoding.
  * Expected: Returns empty rule set and clear error.

#### Module: `features/chatbot/misalignment-detector`

* **Happy path**:

  * Session containing obvious rule violation (e.g., client-side fetch in effect).
  * Expected: Misalignment emitted with correct `ruleId` and evidence.
* **Edge cases**:

  * Overlapping or repeated violations.
  * Expected: Deduplicated or clearly grouped misalignments.
* **Error cases**:

  * AI provider failure.
  * Expected: Detector falls back to heuristic checks and reports partial result.

#### Module: `features/chatbot/summaries` and `commit-messages`

* **Happy path**:

  * Medium-length session.
  * Expected: Summary contains goals, changes, and follow-ups; commit message structured correctly.
* **Edge cases**:

  * Very long session, minimal edits.
  * Expected: Still generates concise output, notes uncertainty.
* **Error cases**:

  * Token limit exceeded.
  * Expected: Context trimming logic kicks in; no crash.

#### Integration: ChatDock + Server Function

* **Scenario**:

  * User opens viewer, starts chat tied to session, sees misalignment banner and remediation prompt.
* **Expected**:

  * Streaming works; misalignment states match backend; UI remains responsive on slow network.

### Test Generation Guidelines

* Prefer deterministic stubs over live LLM calls in unit tests.
* For integration tests requiring AI output, fix seed and snapshot responses or use recorded fixtures.
* Use TypeScript strict mode to ensure type-level guarantees for session and rule models.
* E2E tests limited to key flows (chat, misalignment banner, summary/commit pop-outs) to keep CI fast.

---

## 9) Risks and Mitigations

### Technical Risks

1. **LLM misclassification of AGENTS rules**

   * Impact: High (false positives/negatives reduce trust).
   * Likelihood: Medium.
   * Mitigation: Combine heuristics with LLM outputs; allow user override; log misclassification cases for future tuning.
   * Fallback: Provide “manual rule inspection” mode without automatic flags.

2. **Token limits for long sessions**

   * Impact: Medium.
   * Likelihood: High.
   * Mitigation: Aggressive summarization and windowing; configurable token budgets per provider.
   * Fallback: Require user to select slices of session when context too large.

3. **Performance issues when analyzing large timelines**

   * Impact: Medium.
   * Likelihood: Medium.
   * Mitigation: Pre-compute summaries and misalignments offline or lazily; debounce recomputations.
   * Fallback: Limit heavy analysis to explicit user actions.

### Dependency Risks

1. **AI provider outages or pricing changes**

   * Impact: High.
   * Likelihood: Medium.
   * Mitigation: Support multiple providers via AI SDK; expose configuration to switch models quickly.
   * Fallback: Graceful degradation to non-AI viewer only.

2. **External provider schema changes**

   * Impact: Medium.
   * Likelihood: Medium.
   * Mitigation: Adapter pattern with versioning; validation layer on import.
   * Fallback: Mark incompatible sessions and instruct user to update adapter.

### Scope Risks

1. **Over-ambitious refactor intelligence**

   * Impact: High (delays MVP).
   * Likelihood: High.
   * Mitigation: Keep Phase 1–3 tightly scoped around misalignment + summaries/commits; defer refactor timing to Phase 4.
   * Fallback: Ship without task-timing features.

2. **UI complexity in viewer**

   * Impact: Medium.
   * Likelihood: Medium.
   * Mitigation: Iterate with minimal ChatDock and a single banner first; add richer visuals later.
   * Fallback: Hide advanced indicators behind feature flags.

---

## 10) Appendix

### References

* Codex Session Viewer README (features, structure).
* RPG Method PRD template for dependency-aware planning.

### Glossary

* **AGENTS**: Internal ruleset describing correct TanStack/Start usage and separation of concerns.
* **Session**: A captured sequence of events from a coding/agent workflow.
* **Misalignment**: A deviation from AGENTS rules or user’s declared goal detected in a session.
* **Pop-out**: UI panel or dialog that overlays main viewer to show derived artifacts.

### Open Questions

* Exact location and format of AGENTS.md in different projects (per-repo vs global).
* Which external coding agents to support first and what export formats they provide.
* Whether to persist chatbot conversations across app restarts vs tie them strictly to sessions.
* Whether refactor/task plans should integrate directly with Task Master or stay as markdown.

---

## 11) Task-Master Integration notes

* **Capabilities → tasks**:

  * Each `### Capability:` under “Capability Tree” becomes a top-level Task Master task (e.g., “Chatbot Session Orchestration”, “AGENTS Rule Awareness and Misalignment Detection”).
* **Features → subtasks**:

  * Each `#### Feature:` becomes a subtask; the **MVP** flag can map to higher priority.
* **Dependencies → task deps**:

  * Module dependencies in “Dependency Chain” and the `depends on: [...]` fields in “Development Phases” define `task.dependencies`.
* **Phases → priorities**:

  * Phase 0 tasks = highest priority; later phases map to lower priorities in order.
* **Test Strategy linkage**:

  * “Critical Test Scenarios” provide input to Surgical Test Generator when Task Master creates implementation/testing subtasks.
