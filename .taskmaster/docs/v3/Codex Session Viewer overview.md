## You asked:

PRD.md

File

src.md

File

README.md

File

output a single prd using the addendum. Use the original and addendum to produce your corrected version so we can remove the addendum for the original prd. Reference the src.md as needed.

    md
    1. Overview
    
    ---
    
    This addendum updates the existing Codex Session Viewer PRD to support a dual-mode chatbot architecture within the existing TanStack Start + React + TypeScript stack.
    
    * Problem
      The current PRD implicitly assumes a single “Session Coach” mode that is tightly coupled to Codex session context and AGENTS-aware tools. There is no clean path to add a “normal chatbot” experience (web search, image generation, general tools, long-term memory) without refactoring the chat runtime, API contracts, and UI.
    
    * Who is affected
    
      * Developers integrating chat into Codex Session Viewer (ChatDock and future chat surfaces).
      * AI engineers relying on Session Coach for session-aware analysis.
      * Future users of a General Chat mode that acts as a standard assistant.
    
    * Why existing design is insufficient
    
      * Chat runtime and server API are implicitly “session-mode only.”
      * Tools and prompts for Session Coach are not isolated from future general-purpose tools.
      * UI has no concept of chat modes; adding a second mode later would require breaking changes.
    
    * Corrected target
    
      * Mode A: Session Coach (current MVP) — session-aware, AGENTS-aware, local only (no global memory / web tools).
      * Mode B: General Chat (future) — open-domain “normal chatbot,” with tools (web, image, coding) and global memory.
      * Architecture is **mode-aware from day one**, even though only Session Coach is implemented in MVP.
    
    * Success metrics (for this addendum)
    
      * 100% of chat API calls include an explicit `mode` field.
      * 0 required breaking changes to API/ChatDock when enabling General Chat in a later phase.
      * For MVP: 0 regressions in existing Session Coach flows; “general” mode requests fail with a deterministic, machine-readable “MODE_NOT_ENABLED” error.
    
    2. Capability Tree (Functional Decomposition)
    
    ---
    
    Scope: only incremental capabilities relative to the existing PRD. All capabilities below are new or revised.
    
    ### Capability: Mode Management (Session Coach vs General Chat) [MVP-Core]
    
    High-level: Make “mode” a first-class parameter for all chat behavior (runtime, server, UI).
    
    #### Feature: Chat Mode Selector (UI)
    
    * **Description**
      A mode switch in the ChatDock shell that determines whether the chat is operating as Session Coach or General Chat. For MVP, the mode is forced to `"session"` and the toggle may be internal/hidden.
    
    * **Inputs**
    
      * `mode: "session" | "general"` (prop, route state, or internal state).
      * `sessionId?: string` (required for Session Coach, optional/ignored for General Chat).
      * `userId?: string` (relevant for future General Chat memory).
      * User interactions: toggle click or route changes.
    
    * **Outputs**
    
      * Updated mode state in React (component state or context).
      * Optional URL/search param or hash for deep-linking (`?mode=session|general`).
      * Event to chat runtime + server API indicating active `mode`.
    
    * **Behavior**
    
      * Renders a 2-option switch in ChatDock header, e.g. `[Session Coach | General Chat]`.
      * On mode change:
    
        * Sends `mode` to chat runtime and server API.
        * Resets or segments conversation history per mode (MVP rule: reset conversation on any mode change).
      * MVP:
    
        * `mode` is always `"session"` from viewer route; toggle may be hidden; component contract already supports `mode`.
    
    * **MVP**
    
      * Internal: `ChatDockPanel` and API accept `mode` and default to `"session"`.
      * No visible toggle required until `"general"` is implemented.
    
    #### Feature: Mode-Aware Chat Runtime
    
    * **Description**
      A single chat orchestration runtime that switches prompts, tools, and context construction based on `mode`.
    
    * **Inputs**
    
      * `mode: "session" | "general"`.
      * `sessionId?: string`.
      * `userId?: string`.
      * Chat messages (`messages: ChatMessageInput[]`).
      * Session Coach context: session events, AGENTS, repo metadata (existing viewer stack).
      * General Chat context: user profile, global memory (future).
    
    * **Outputs**
    
      * Streaming chat responses.
      * Mode-specific tool invocations:
    
        * Session Coach: misalignment detection, remediation suggestions, summaries, commit drafts.
        * General: web search, image generation, generic coding utilities.
      * Diagnostics/telemetry tagged by mode.
    
    * **Behavior**
    
      * `mode === "session"` (MVP):
    
        * Build session-scoped context from uploaded logs, parsed events, and repo metadata (reuses existing viewer libs).
        * Use Session Coach system prompt and tools only.
        * No access to global memory, web search, or image generation.
      * `mode === "general"` (future):
    
        * Skip heavy session timeline context; use project/user-level context only.
        * Enable General tools and global memory.
      * Strict separation:
    
        * No Session Coach tools in `"general"` mode.
        * No global memory or web search in `"session"` mode.
    
    * **MVP**
    
      * Implement only `runSessionCoachTurn` branch.
      * `runGeneralChatTurn` exists as a stub that returns a structured “MODE_NOT_ENABLED” error.
    
    #### Feature: Mode-Aware Chat API (Server)
    
    * **Description**
      Server endpoint that accepts chat requests with an explicit `mode`, forwards to the mode-aware runtime, and streams responses.
    
    * **Inputs**
    
      * Request payload:

ts { mode: "session" | "general"; sessionId?: string; userId?: string; messages: ChatMessageInput\[\]; }

    * HTTP request context (auth, cookies, etc.).
    
    * **Outputs**
    
      * SSE or streaming HTTP response with assistant tokens.
      * On `mode: "general"` in MVP: JSON error `{ code: "MODE_NOT_ENABLED", message: "General chat is not enabled yet." }`.
    
    * **Behavior**
    
      * Validate `mode` field; reject missing or invalid modes.
      * Delegate to `createChatRuntime({ mode, sessionId, userId })`.
      * Ensure Session Coach behavior is unchanged when `mode === "session"`.
    
    * **MVP**
    
      * Full support for `"session"`; stubbed `"general"` returns deterministic, typed error.
    
    ---
    
    ### Capability: General Chat Mode (Normal Chatbot) [Non-MVP]
    
    High-level: Provide a conventional assistant experience with open-domain prompts, tools, and long-term memory. Architected now; implemented later.
    
    #### Feature: Open-Domain Chat
    
    * **Description**
      General-purpose chat behavior using project-aware but non-session-specific prompts.
    
    * **Inputs**
    
      * `mode: "general"`.
      * `userId`.
      * `messages`.
      * Optional high-level repo metadata or project settings.
    
    * **Outputs**
    
      * Natural language responses (explanations, plans, code, etc.).
      * Optional structured outputs (lists, plans, code blocks).
    
    * **Behavior**
    
      * Use a distinct system prompt tuned for open-domain assistance.
      * Treat session data as optional references only when explicitly requested.
      * Reuse ChatDock UI surface with different button set (tools for web/image/etc.).
    
    * **MVP**
    
      * Out of scope; only placeholders and types.
    
    #### Feature: General Tools (Web Search, Image Generation, Misc Utilities)
    
    * **Description**
      Tool palette available exclusively in General Chat mode.
    
    * **Inputs**
    
      * User messages that trigger tools (explicit commands or intent classification).
      * Current conversation context and `userId`.
    
    * **Outputs**
    
      * Tool results: search snippets, generated images, code analysis results, etc.
      * Failures surfaced as typed error messages.
    
    * **Behavior**
    
      * Tool registry keyed by mode, e.g. `TOOLS.general` vs `TOOLS.session`.
      * Possible tools (future):
    
        * Web search / RAG against external docs.
        * Image generation.
        * Code utilities (explain, lint, refactor snippets).
      * No General tools exposed when `mode === "session"`.
    
    * **MVP**
    
      * Interface only; registry shape and plumbing defined, but no implementations.
    
    #### Feature: Global Chat History and Memory
    
    * **Description**
      Cross-session conversation history and user memory scoped to General Chat mode.
    
    * **Inputs**
    
      * `userId`.
      * Past General Chat transcripts.
      * User preferences (e.g., preferred style, hidden topics).
    
    * **Outputs**
    
      * Retrieved memory snippets injected into prompts.
      * UI list of prior General Chat conversations.
    
    * **Behavior**
    
      * Store only `"general"` mode conversations in persistent storage.
      * Retrieve and rank relevant snippets for each new turn.
      * Never inject General Chat memory into Session Coach prompts.
    
    * **MVP**
    
      * Out of scope apart from data model and abstraction design.
    
    3. Repository Structure + Module Definitions
    
    ---
    
    Add/adjust modules in the existing TanStack Start + React repo.
    
    ### Module: `features/chatbot/chatbot.runtime.ts`
    
    * **Maps to capability**
      Mode-Aware Chat Runtime (Session Coach + General).
    
    * **Responsibility**
      Orchestrate all chat turns by delegating to mode-specific pipelines; encapsulate prompts + tools selection.
    
    * **File structure (proposed)**

ts // features/chatbot/chatbot.runtime.ts export type ChatMode = "session" | "general"; export interface ChatRuntimeOptions { mode: ChatMode; sessionId?: string; userId?: string; } export function createChatRuntime(opts: ChatRuntimeOptions) { ... } async function runSessionCoachTurn(...) { ... } // MVP async function runGeneralChatTurn(...) { ... } // future

    * **Exports**
    
      * `createChatRuntime(options: ChatRuntimeOptions)` — returns an object with a `runTurn(messages)` API; internally dispatches to `runSessionCoachTurn` or `runGeneralChatTurn`.
      * `ChatMode` type for reuse in UI and server.
    
    ### Module: `server/chatbot-api.server.ts`
    
    * **Maps to capability**
      Mode-Aware Chat API (Server).
    
    * **Responsibility**
      HTTP/SSE entrypoint for chat streams, validating payloads and delegating to `createChatRuntime`.
    
    * **File structure (proposed)**

ts // server/chatbot-api.server.ts import { createChatRuntime, type ChatMode } from "~/features/chatbot/chatbot.runtime"; export interface ChatApiRequestBody { mode: ChatMode; sessionId?: string; userId?: string; messages: ChatMessageInput\[\]; } export async function handleChatRequest(req: Request): Promise<Response> { ... }

    * **Exports**
    
      * `handleChatRequest(req: Request)` — TanStack Start server function or route handler.
      * `ChatApiRequestBody` type.
    
    ### Module: `components/chatbot/ChatDockPanel.tsx`
    
    * **Maps to capability**
      Chat Mode Selector (UI).
    
    * **Responsibility**
      Render chat shell, including mode header, conversation body, and input; translate user actions into API calls.
    
    * **File structure (proposed)**

tsx // components/chatbot/ChatDockPanel.tsx export type ChatDockPanelProps = { mode: "session" | "general"; sessionId?: string; userId?: string; // existing props... }; export function ChatDockPanel(props: ChatDockPanelProps) { ... }

    * **Exports**
    
      * `ChatDockPanel` component.
      * `ChatDockPanelProps` type.
    
    ### Module: `features/chatbot/chatModeConfig.ts`
    
    * **Maps to capability**
      Mode Management (shared configuration).
    
    * **Responsibility**
      Provide declarative config per mode: labels, icons, enabled tools, prompt IDs.
    
    * **File structure (proposed)**

ts export interface ChatModeConfig { id: "session" | "general"; label: string; description: string; toolsKey: string; // "session" | "general" supportsHistory: boolean; } export const CHAT\_MODE\_CONFIG: Record<string, ChatModeConfig> = { ... };

    * **Exports**
    
      * `CHAT_MODE_CONFIG`.
      * `ChatModeConfig` type.
    
    ### Module: `features/chatbot/tools.session.ts` (existing or to be defined)
    
    * **Maps to capability**
      Session Coach tools (misalignment detection, etc.).
    
    * **Responsibility**
      Export Session Coach tools keyed under `TOOLS.session`.
    
    * **Exports**
    
      * `SESSION_TOOLS` — tool registry used only when `mode === "session"`.
    
    ### Module: `features/chatbot/tools.general.ts` (future)
    
    * **Maps to capability**
      General Tools (web, image, misc).
    
    * **Responsibility**
      Export General Chat tools keyed under `TOOLS.general`.
    
    * **Exports**
    
      * `GENERAL_TOOLS` — tool registry used only when `mode === "general"`.
    
    4. Dependency Chain
    
    ---
    
    This chain describes new/changed modules relative to the existing foundation defined in the main PRD. For brevity, only modules affected by this addendum are listed; all others remain as previously specified.
    
    ### Foundation Layer (Phase 0 – unchanged)
    
    No new dependencies added here; reference existing project foundation:
    
    * **`lib/utils`** – Tailwind/clsx helpers (`cn`).
    * **`lib/logger`** – client/server logging utilities.
    * **`lib/theme` + `components/theme-provider`** – theme persistence + cookie storage.
    * **`env/client` / `env/server`** – environment variable validation.
    * **`utils/intl`, `utils/seo`** – formatting and SEO helpers.
    
    ### Core Viewer Layer (Phase 1 – unchanged)
    
    Existing capabilities: session parsing, snapshot persistence, viewer UI.
    
    * **`lib/session-parser`, `db/sessionSnapshots`, `hooks/useFileLoader`**
    
      * Depends on: foundation layer only.
    * **`features/viewer/*` + `components/viewer/*`**
    
      * Depends on: parser + snapshots + foundation.
    
    ### Chat Core Layer (Phase 2 – updated)
    
    * **`features/chatbot/tools.session`**
    
      * Depends on: foundation, viewer context types.
      * Provides: Session Coach tools.
    
    * **`features/chatbot/chatModeConfig`**
    
      * Depends on: none beyond foundation.
      * Provides: declarative mode metadata.
    
    * **`features/chatbot/chatbot.runtime`**
    
      * Depends on:
    
        * `features/chatbot/tools.session`
        * `features/chatbot/tools.general` (type-only; can be stubbed)
        * Viewer context types for Session Coach (e.g., session events).
        * Foundation (`lib/logger`, env, utils).
    
    * **`server/chatbot-api.server`**
    
      * Depends on:
    
        * `features/chatbot/chatbot.runtime`
        * TanStack Start server runtime / router integration.
    
    No cycles: Chat API → runtime → tools/config → foundation.
    
    ### Mode Management UI Layer (Phase 3 – updated)
    
    * **`components/chatbot/ChatDockPanel`**
    
      * Depends on:
    
        * `server/chatbot-api.server` (for call contracts only).
        * `features/chatbot/chatModeConfig`.
        * Foundation (`components/ui/*`, `lib/utils`).
    
    * Viewer routes that embed ChatDock (e.g., `routes/(site)/viewer/index.tsx`)
    
      * Depends on: `ChatDockPanel` and existing viewer loader/head.
    
    No reverse dependencies from server or runtime into UI, preserving one-directional flow.
    
    5. Development Phases
    
    ---
    
    Only incremental phases relative to main PRD are listed; existing Phase 0/1/2 from the base PRD are assumed.
    
    ### Phase 0: Foundation (Existing – unchanged)
    
    Use existing PRD description; no new tasks.
    
    ### Phase 1: Session Coach Chat Runtime (Existing – clarified)
    
    **Goal**
    Ensure current Session Coach behavior is expressed as `mode: "session"` in the new runtime API.
    
    **Entry Criteria**
    
    * Existing viewer stack compiles and runs with Session Coach as per original PRD.
    
    **Tasks**
    
    * [ ] Wrap existing Session Coach orchestration as `runSessionCoachTurn` (depends on: existing chat logic)
    
      * Acceptance: For a given test session file, responses and tool calls are identical before and after the refactor when `mode: "session"`.
      * Test strategy: unit tests on runtime wrapper, plus snapshot/fixture tests comparing outputs.
    
    **Exit Criteria**
    
    * All Session Coach flows run through `createChatRuntime({ mode: "session" })` without regressions.
    
    ---
    
    ### Phase 2: Mode-Aware Plumbing (New – MVP)
    
    **Goal**
    Introduce mode awareness across API, runtime, and UI while keeping behavior identical for `"session"`.
    
    **Entry Criteria**
    
    * Phase 1 complete.
    
    **Tasks**
    
    * [ ] Add `ChatMode` and `ChatModeConfig` (depends on: foundation)
    
      * Acceptance: `CHAT_MODE_CONFIG.session` and `.general` exist with labels and flags; types compile.
      * Tests: type-level tests / minimal runtime assertions.
    
    * [ ] Update `chatbot.runtime` to accept `mode` and stub `"general"` (depends on: `ChatModeConfig`)
    
      * Acceptance:
    
        * `createChatRuntime({ mode: "session" })` executes Session Coach;
        * `createChatRuntime({ mode: "general" })` throws or returns `{ code: "MODE_NOT_ENABLED" }`.
      * Tests: unit tests for both branches; error object schema snapshot.
    
    * [ ] Update `chatbot-api.server` to require `mode` (depends on: runtime)
    
      * Acceptance:
    
        * Requests without `mode` or with invalid values yield 400.
        * `mode: "general"` yields 501-style error with `code = "MODE_NOT_ENABLED"`.
        * Existing clients updated to send `mode: "session"` and still succeed.
      * Tests: integration tests at HTTP level (supertest or equivalent).
    
    * [ ] Extend `ChatDockPanel` props to include `mode` (depends on: API contract)
    
      * Acceptance:
    
        * Component compiles only when passed an explicit `mode`.
        * Viewer route always passes `mode="session"`.
      * Tests: React component tests verifying correct payload sent to API.
    
    **Exit Criteria**
    
    * All chat requests set `mode`.
    * General mode requests return deterministic error.
    * No runtime regressions for Session Coach.
    
    ---
    
    ### Phase 3: Visible Mode Toggle (Future, optional for MVP)
    
    **Goal**
    Expose a visible mode selector that can toggle between Session Coach and General Chat once General Chat is implemented.
    
    **Entry Criteria**
    
    * Phases 1–2 complete.
    * At least a minimal General Chat path exists (even if tools/memory are trivial).
    
    **Tasks**
    
    * [ ] Implement header toggle in `ChatDockPanel` (depends on: ChatDockPanel props, ChatModeConfig)
    * [ ] Ensure conversation reset/segmentation behavior on mode change.
    
    **Exit Criteria**
    
    * User can switch modes in UI; new mode value flows through to API and runtime.
    
    ---
    
    ### Phase 4: General Chat Mode Implementation (Non-MVP)
    
    Future phase that fills in the `"general"` branch: prompts, tools, global memory.
    
    6. User Experience
    
    ---
    
    Scope: incremental UX behavior in ChatDock.
    
    * Personas
    
      * Session analyzer: uses Session Coach to inspect Codex logs.
      * General assistant user: uses General Chat for normal assistant tasks.
    
    * Mode indicator and toggle
    
      * ChatDock header reserved for mode label/toggle.
      * MVP: static label “Session Coach” or non-interactive toggle showing only that mode.
      * Future: two-state selector with clear visual emphasis of current mode.
    
    * Mode switching behavior
    
      * On change, the current conversation is cleared or moved to a mode-specific thread.
      * UI never silently blends messages across modes.
      * Tool affordances adapt:
    
        * Session Coach: session-specific tools surfaced; no web/image buttons.
        * General: web/image/code buttons, no AGENTS misalignment panel.
    
    * Error UX for unsupported General Chat
    
      * If user somehow triggers `mode="general"` before implemented, ChatDock shows a clear “General Chat is not enabled yet” message based on error code `MODE_NOT_ENABLED`, without crashing.
    
    7. Technical Architecture
    
    ---
    
    * System components (incremental)
    
      * Mode-aware chat runtime (`features/chatbot/chatbot.runtime`).
      * Mode-aware API handler (`server/chatbot-api.server`).
      * Mode config (`features/chatbot/chatModeConfig`).
      * Mode-aware ChatDock UI (`components/chatbot/ChatDockPanel`).
    
    * Data models (incremental)
    
      * `ChatMode = "session" | "general"`.
      * `ChatApiRequestBody` with `mode`, `sessionId?`, `userId?`, `messages`.
      * Future: `GeneralChatConversation`, `GeneralChatMemory` keyed by `userId`.
    
    * Integration with TanStack Start
    
      * Chat API implemented as Start server function or route (`/api/chat`).
      * `router` / `routeTree.gen` remain unchanged; viewer route wires ChatDock with `mode="session"`.
    
    * Key decisions
    
      * **Decision: Single runtime with mode branching**
    
        * Rationale: shared infra (streaming, logging, error handling) while isolating prompts/tools by mode.
        * Trade-offs: runtime becomes more complex; requires discipline to keep branches isolated.
        * Alternatives: separate runtimes per mode; rejected to avoid duplicated infra.
    
      * **Decision: Mode as explicit field in API**
    
        * Rationale: explicitness; avoids implicit session-only assumptions and simplifies future toggling.
        * Trade-offs: client changes required now.
        * Alternatives: infer mode from route/path; rejected to keep server independent of routing details.
    
    8. Test Strategy
    
    ---
    
    Focus: ensure mode plumbing is correct and non-leaky.
    
    * Test pyramid (for new work)
    
      * Unit: ~70% (runtime branching, config, simple helpers).
      * Integration: ~25% (API handler with mock runtime, UI → API wiring).
      * E2E: ~5% (happy path Session Coach flows via browser).
    
    * Coverage (incremental for new/changed modules)
    
      * Line: ≥ 85%
      * Branch: ≥ 80%
      * Function: ≥ 85%
      * Statement: ≥ 85%
    
    * Critical scenarios
    
      **Mode-Aware Chat Runtime**
    
      * Happy path: `mode="session"` yields identical output to pre-refactor runtime.
      * Error case: `mode="general"` returns `{ code: "MODE_NOT_ENABLED" }`.
      * Edge: missing `sessionId` with `mode="session"` yields validation error.
    
      **Chat API**
    
      * Happy: valid body with `mode="session"` streams tokens.
      * Error: missing/invalid `mode` → 400.
      * Error: `mode="general"` → 501-style error; response shape stable.
    
      **ChatDockPanel**
    
      * Happy: sends `mode` from props to API; uses correct body schema.
      * Edge: ensures no calls are made until `mode` is defined.
    
    * Test generation guidelines
    
      * For any new branch on `mode`, generate tests for both `"session"` and `"general"`.
      * Do not rely on global state; inject mode via options/props.
      * Use stable fixtures for Session Coach so regression detection is trivial.
    
    9. Risks and Mitigations
    
    ---
    
    * **Risk**: Hidden coupling between modes in runtime
    
      * Impact: Medium; bugs in General Chat could affect Session Coach.
      * Likelihood: Medium.
      * Mitigation: clear branching with early `if (mode === "session")` vs `if (mode === "general")` and separate configs; unit tests with mode-specific fixtures.
      * Fallback: split runtime into two modules if coupling becomes hard to manage.
    
    * **Risk**: Incomplete gating of General Chat tools
    
      * Impact: Medium; early/incomplete tools might appear in Session Coach.
      * Likelihood: Low–Medium.
      * Mitigation: registry keyed by mode; no shared tool arrays; tests asserting no General tool IDs appear when `mode="session"`.
      * Fallback: build compile-time separation of tool modules.
    
    * **Risk**: Client code continues assuming implicit session mode
    
      * Impact: High; missing `mode` leads to runtime errors.
      * Likelihood: Medium.
      * Mitigation: make `mode` a required field in types; no defaulting in server handler; CI will fail if callers omit it.
      * Fallback: temporarily accept missing `mode` by defaulting to `"session"` behind a deprecation warning.
    
    * **Risk**: Over-scoping General Chat in early iterations
    
      * Impact: Medium; delays shipping General Chat.
      * Likelihood: High.
      * Mitigation: strictly define General Chat MVP (no complex tools or memory at first); keep present addendum as boundary.
    
    10. Appendix
    
    ---
    
    * This addendum must be read in conjunction with the existing Codex Session Viewer PRD and repository overview.
    * Architecture assumptions rely on TanStack Start RC1, React, and existing viewer modules already present in the codebase.
    
    11. Task-Master Integration Notes
    
    ---
    
    Mapping from this addendum into Task-Master graph:
    
    * **Capabilities → tasks**
    
      * Task: “Mode Management (Session vs General)”
      * Task: “General Chat Mode (Normal Chatbot)”
    
    * **Features → subtasks**
    
      * Under “Mode Management”:
    
        * Subtask: “Chat Mode Selector (UI)”
        * Subtask: “Mode-Aware Chat Runtime”
        * Subtask: “Mode-Aware Chat API”
      * Under “General Chat Mode”:
    
        * Subtask: “Open-Domain Chat”
        * Subtask: “General Tools Registry”
        * Subtask: “Global Chat History and Memory”
    
    * **Dependencies → task deps**
    
      * “Mode-Aware Chat Runtime” depends on foundation + Session Coach runtime.
      * “Mode-Aware Chat API” depends on runtime.
      * “Chat Mode Selector (UI)” depends on API and runtime types.
      * “General Chat Mode” subtasks depend on Mode Management being complete.
    
    * **Phases → priorities**
    
      * Phase 1/2 work (runtime + API + internal mode plumbing) = high priority.
      * Phase 3 toggle + Phase 4 General Chat = lower priority, scheduled after MVP.

---

## ChatGPT Replied:

Thought for 2m 7s

PRD: Codex Session Viewer – Dual-Mode Chatbot (Session Coach + General Chat)
============================================================================

* * *

1) Overview
-----------

Codex Session Viewer is a TanStack/React web app for replaying and analyzing captured coding/agent sessions, with a timeline, discovery tools, and a chat-like dock.

This PRD defines first-class chatbot capabilities on top of the viewer with an explicitly dual-mode architecture:

*   Mode A: **Session Coach** (MVP) — session-aware, AGENTS-aware, local-only (no global memory/web tools).
    
*   Mode B: **General Chat** (future) — open-domain “normal chatbot” with web/image/code tools and global memory.
    

The architecture is mode-aware from day one, while the initial implementation ships only Session Coach.

### Problem

Current Codex Session Viewer is a powerful passive analysis tool but does not actively guide users during or after a session:PRD

*   Misalignment with AGENTS rules is only discoverable through manual inspection.
    
*   Refactor/feature-planning opportunities are not surfaced at the right time.
    
*   Summaries and commit messages must be written manually.
    
*   Only a single capture pipeline is supported; other coding agents and local logs are not integrated.
    
*   Chat runtime, tools, and API implicitly assume a single “session-only” mode, making it hard to add a normal chatbot later without refactoring.
    

This leads to slow feedback loops, missed refactor opportunities, duplicated summarization work, and fragmented analysis.

### Target Users

*   Individual developers recording sessions from LLM coding agents or custom tooling.
    
*   AI engineers debugging agent behavior across sessions.
    
*   Tech leads performing review and refactor planning driven by agent transcripts.
    
*   Tooling authors building AGENTS-compliant TanStack apps and wanting feedback from real usage.PRD
    
*   Future users who want a standard assistant experience (web search, image generation, code help) in the same UI.
    

### Success Metrics

Session Coach + viewer:

*   ≥ 80% of AGENTS violations in a session are auto-detected and surfaced without manual rule lookup.
    
*   ≥ 50% reduction in time to identify misalignment root cause (self-reported).
    
*   ≥ 70% of misaligned sessions produce at least one remediation plan via chatbot.
    
*   ≥ 50% of post-session summaries and commit messages are generated via the tool.PRD
    
*   Ability to ingest session histories from at least 2 external coding agents within the same UI.
    

Dual-mode / architecture:

*   100% of chat API calls include an explicit `mode` field.
    
*   Enabling General Chat later requires **0 breaking changes** to ChatDock and chat API types.
    
*   For MVP: all `mode: "general"` requests fail with a deterministic, machine-readable `MODE_NOT_ENABLED` error code.
    
*   No regressions in existing Session Coach flows when moving to mode-aware runtime.
    

* * *

2) Capability Tree (Functional Decomposition)
---------------------------------------------

### Capability: Chatbot Session Orchestration

High-level: Turn Codex Session Viewer into an interactive AI assistant that understands the active session and AGENTS rules.

#### Feature: ChatDock LLM Wiring \[MVP\]

*   **Description**  
    Connect ChatDock UI to a live LLM backend with session-aware context.
    
*   **Inputs**
    
    *   Current session snapshot (events, metadata, transcript).
        
    *   User chat messages.
        
    *   System prompts/model configuration.
        
    *   `mode: "session" | "general"` (Session Coach path in MVP).
        
*   **Outputs**
    
    *   Streaming assistant messages.
        
    *   Error states (rate limits, provider failures, `MODE_NOT_ENABLED`).
        
*   **Behavior**
    
    *   Build a base prompt including session summary and AGENTS context stub for `mode="session"`.
        
    *   Use Vercel AI SDK streaming APIs wired to configured provider.
        
    *   Maintain conversation state keyed by `{sessionId, mode}`.
        
    *   Support abort/retry for individual turns.
        
    *   For MVP: only use Session Coach prompt/tools; no web/image/global memory.
        

#### Feature: Session Context Builder \[MVP\]

*   **Description**  
    Transform raw session data into compact, model-ready context.
    
*   **Inputs**
    
    *   Timeline events (actions, mutations, logs).
        
    *   Chat turns and console/network logs.
        
    *   Repo metadata, file paths, AGENTS rules.
        
*   **Outputs**
    
    *   Structured context object (summarized timeline, key errors, AGENTS flags).
        
    *   Token-bounded serialized prompt segments.
        
*   **Behavior**
    
    *   Apply deterministic summarization and bucketing (recent N events, critical errors, inferred goals).
        
    *   Enforce token budget per provider; drop low-value sections first.
        
    *   Cache per-session summaries for reuse across turns.PRD
        

* * *

### Capability: Mode Management (Session Coach vs General Chat) \[MVP-Core\]

High-level: Make `mode` a first-class parameter in runtime, API, and UI.

#### Feature: Chat Mode Selector (UI Contract) \[MVP plumbing; future visible toggle\]

*   **Description**  
    A mode switch in ChatDock shell that determines whether chat operates as Session Coach or General Chat. For MVP, mode is forced to `"session"` and the toggle can be hidden.
    
*   **Inputs**
    
    *   `mode: "session" | "general"` (prop, route state, or internal state).
        
    *   `sessionId?: string` (required for Session Coach).
        
    *   `userId?: string` (relevant for future General Chat memory).
        
    *   User interactions: toggle click or route changes (future).
        
*   **Outputs**
    
    *   Updated mode state in React (component state/context).
        
    *   Optional URL/search param for deep-linking: `?mode=session|general`.
        
    *   Payloads to chat runtime/server including active `mode`.
        
*   **Behavior**
    
    *   Renders a 2-option switch in ChatDock header (future).
        
    *   On mode change, sends `mode` to runtime and API and resets or segments conversation history per mode (MVP: reset on change).
        
    *   MVP: `ChatDockPanel` and API accept `mode` and default to `"session"`; no visible toggle required.
        

#### Feature: Mode-Aware Chat Runtime \[MVP\]

*   **Description**  
    Single chat orchestration runtime that switches prompts, tools, and context construction based on `mode`.
    
*   **Inputs**
    
    *   `mode: "session" | "general"`.
        
    *   `sessionId?: string`.
        
    *   `userId?: string`.
        
    *   Chat messages (`messages[]`).
        
    *   Session Coach context: session events, AGENTS, repo metadata.
        
    *   General Chat context: user profile, global memory (future).
        
*   **Outputs**
    
    *   Streaming chat responses.
        
    *   Mode-specific tool invocations (Session Coach vs General).
        
    *   Telemetry tagged by `mode`.
        
*   **Behavior**
    
    *   `mode === "session"` (MVP):
        
        *   Build session-scoped context from logs and metadata.
            
        *   Use Session Coach system prompt and `SESSION_TOOLS` only.
            
        *   No access to global memory, web search, or image generation.
            
    *   `mode === "general"` (future):
        
        *   Skip heavy session timeline context by default.
            
        *   Use General Chat prompt and `GENERAL_TOOLS`.
            
    *   Strict separation: no General tools in `"session"`, no global memory in `"session"`.
        

#### Feature: Mode-Aware Chat API (Server) \[MVP\]

*   **Description**  
    Chat endpoint that accepts an explicit `mode`, delegates to mode-aware runtime, and streams responses.
    
*   **Inputs**
    
    *   Request payload:
        
            {
              mode: "session" | "general";
              sessionId?: string;
              userId?: string;
              messages: ChatMessageInput[];
            }
            
        
    *   HTTP request context (auth, cookies, etc.).
        
*   **Outputs**
    
    *   SSE/streaming HTTP responses with assistant tokens.
        
    *   For `mode: "general"` in MVP: JSON error `{ code: "MODE_NOT_ENABLED", ... }`.
        
*   **Behavior**
    
    *   Validate `mode`; reject missing/invalid modes with 4xx.
        
    *   Delegate to `createChatRuntime({ mode, sessionId, userId })`.
        
    *   For `mode="general"` in MVP, short-circuit with deterministic error.
        
    *   Preserve existing Session Coach behavior under `mode="session"`.
        

* * *

### Capability: AGENTS Rule Awareness and Misalignment Detection

#### Feature: AGENTS.md Parser \[MVP\]

*   **Description**  
    Parse AGENTS.md into structured rules and anti-patterns.
    
*   **Inputs**
    
    *   `AGENTS.md` markdown file or supplied rules content.
        
*   **Outputs**
    
    *   Normalized rule set: `{ id, title, description, severity, tags, detectionHints }`.
        
*   **Behavior**
    
    *   Parse headings and bullet lists into rules.
        
    *   Support inline metadata annotations (e.g. HTML comments for IDs/severity).
        
    *   Provide query API by tag, severity, keyword.
        

#### Feature: Automatic Misalignment Detector \[MVP\]

*   **Description**  
    Detect violations of AGENTS rules from session data during analysis.
    
*   **Inputs**
    
    *   Parsed AGENTS rule set.
        
    *   Session context (events, logs, chat).
        
*   **Outputs**
    
    *   List of misalignment events `{ ruleId, evidence, severity, timestamps }`.
        
*   **Behavior**
    
    *   Hybrid detection: fast heuristics for simple rules + LLM classification for complex patterns.
        
    *   Mark misalignments with timestamps and linked events.
        
    *   Update findings as new events/rules appear.
        

#### Feature: Misalignment Notification + Remediation Prompt \[MVP\]

*   **Description**  
    Surface misalignment in viewer and drive remediation chat flow.
    
*   **Inputs**
    
    *   Misalignment events.
        
    *   Active session route in UI.
        
*   **Outputs**
    
    *   UI notifications (banner, timeline badges).
        
    *   Pre-filled remediation prompt in ChatDock.
        
*   **Behavior**
    
    *   Show non-modal banner and timeline markers when misalignments exist.
        
    *   Clicking banner opens ChatDock with an auto-generated remediation prompt referencing rule and evidence.
        
    *   Track which misalignments were acknowledged/dismissed.
        

* * *

### Capability: Pop-Out Knowledge Artifacts

#### Feature: Pop-Out Session Summaries \[MVP\]

*   **Description**  
    Generate concise, shareable summaries of a session in a pop-out.
    
*   **Inputs**
    
    *   Session context.
        
    *   Optional user instructions (audience, length).
        
*   **Outputs**
    
    *   Structured markdown summary (goals, main changes, issues, follow-ups).
        
*   **Behavior**
    
    *   Invoke summarization chain using LLM with AGENTS-aware hints.
        
    *   Render in resizable pop-out linked to the current session.
        
    *   Provide copy-to-clipboard and optional markdown download.PRD
        

#### Feature: Pop-Out Commit Message Generator \[MVP\]

*   **Description**  
    Generate commit message drafts from session history.
    
*   **Inputs**
    
    *   Session events (file edits, commands, git metadata).
        
    *   Optional commit style preferences.
        
*   **Outputs**
    
    *   One or more commit message suggestions (subject + bullets).
        
*   **Behavior**
    
    *   Infer scope and key changes from events.
        
    *   Respect project conventions (e.g. Conventional Commits) when configured.
        
    *   Render in pop-out with quick copy and light editing.
        

* * *

### Capability: Refactor Intelligence and Task Timing

#### Feature: Refactor Task Opportunities \[Non-MVP\]

*   **Description**  
    Identify and rank refactor/cleanup opportunities from a session.
    
*   **Inputs**
    
    *   Session context.
        
    *   Misalignment findings.
        
    *   AGENTS rules.
        
*   **Outputs**
    
    *   Ranked list of refactor/task suggestions with rationale and estimated impact.
        
*   **Behavior**
    
    *   Analyze repeated patterns, misalignments, and code changes.
        
    *   Group related issues into tasks with suggested scope.
        
    *   Expose suggestions via ChatDock or a dedicated “Opportunities” view.
        

#### Feature: Task Timing Suggestions \[Non-MVP\]

*   **Description**  
    Recommend when to apply refactors (immediate vs deferred).
    
*   **Inputs**
    
    *   Task opportunities.
        
    *   Session metadata (branch, PR status, CI health).
        
*   **Outputs**
    
    *   Timing recommendations per task (e.g., “now”, “before release”, “backlog”).
        
*   **Behavior**
    
    *   Apply heuristic/LLM reasoning about risk and dependencies.
        
    *   Tag tasks with timing labels; optionally export to external trackers.
        

* * *

### Capability: Multi-Provider Session Ingestion

#### Feature: External Coding Agent Session Importers \[Non-MVP\]

*   **Description**  
    Ingest and normalize session histories from other coding agents.
    
*   **Inputs**
    
    *   Uploaded/API-fetched session exports (JSON, NDJSON, logs).
        
    *   Provider metadata.
        
*   **Outputs**
    
    *   Normalized `Session` objects compatible with Codex Session Viewer.
        
*   **Behavior**
    
    *   Provider-specific adapters mapping external schemas to internal model.
        
    *   Tag sessions with provider and repo/branch metadata.
        
    *   Handle malformed/partial exports gracefully.
        

#### Feature: Custom Local Session Logger \[Non-MVP\]

*   **Description**  
    Provide a logging spec and tools to emit AGENTS-compatible sessions from arbitrary workflows.
    
*   **Inputs**
    
    *   Local events emitted by CLI/editor extension/SDK.
        
*   **Outputs**
    
    *   Session log files adhering to viewer’s session schema.
        
*   **Behavior**
    
    *   Define JSON/JSONL schema and small library for emitting events.
        
    *   Optional CLI to package logs into session files for upload.
        

* * *

### Capability: General Chat Mode (Normal Chatbot) \[Non-MVP\]

#### Feature: Open-Domain Chat

*   **Description**  
    General-purpose assistant behavior using project-aware but non-session-specific prompts.
    
*   **Inputs**
    
    *   `mode: "general"`.
        
    *   `userId`.
        
    *   Conversation messages.
        
    *   Optional high-level repo metadata or project settings.
        
*   **Outputs**
    
    *   Natural language responses (explanations, plans, code, etc.).
        
    *   Optional structured outputs.
        
*   **Behavior**
    
    *   Use a distinct system prompt tuned for open-domain assistance.
        
    *   Only pull session data when explicitly requested (e.g. “look at session X”).
        

#### Feature: General Tools (Web, Image, Code Utilities)

*   **Description**  
    Tool palette available exclusively in General Chat mode.
    
*   **Inputs**
    
    *   User messages that trigger tools.
        
    *   Conversation context and `userId`.
        
*   **Outputs**
    
    *   Tool results (web search snippets, images, code analysis, etc.).
        
    *   Typed error states when tools fail.
        
*   **Behavior**
    
    *   Mode-keyed registry: `TOOLS.general` vs `TOOLS.session`.
        
    *   No General tools exposed when `mode === "session"`.
        

#### Feature: Global Chat History and Memory

*   **Description**  
    Cross-session conversation history and user memory scoped to General Chat.
    
*   **Inputs**
    
    *   `userId`.
        
    *   Past General Chat transcripts.
        
    *   User preferences (style, constraints).
        
*   **Outputs**
    
    *   Retrieved memory snippets injected into prompts.
        
    *   UI list of prior General Chat conversations.
        
*   **Behavior**
    
    *   Persist only `"general"` mode conversations in storage.
        
    *   Retrieve and rank relevant snippets each turn.
        
    *   Never inject General memory into Session Coach prompts.
        

* * *

3) Repository Structure + Module Definitions (Structural Decomposition)
-----------------------------------------------------------------------

Target current structure:

    src/
    ├── routes/
    │   └── (site)/viewer/index.tsx       # Viewer route wired to ViewerPage
    ├── features/
    │   ├── viewer/                       # Existing viewer loader/head/page
    │   └── chatbot/                      # New chatbot feature domain
    │       ├── chatbot.runtime.ts
    │       ├── chatModeConfig.ts
    │       ├── tools.session.ts
    │       ├── tools.general.ts          # future
    │       ├── context-builder.ts
    │       ├── misalignment-detector.ts
    │       ├── task-opportunities.ts
    │       ├── summaries.ts
    │       ├── commit-messages.ts
    │       └── index.ts
    ├── components/
    │   ├── viewer/
    │   │   └── ChatDock.tsx              # current placeholder, to wrap/replace with ChatDockPanel
    │   └── chatbot/
    │       ├── ChatDockPanel.tsx
    │       ├── MisalignmentBanner.tsx
    │       ├── MisalignmentTimelineBadges.tsx
    │       ├── SummaryPopout.tsx
    │       └── CommitPopout.tsx
    ├── lib/
    │   ├── ai/
    │   │   ├── provider.ts
    │   │   ├── prompt-templates.ts
    │   │   └── index.ts
    │   ├── agents-rules/
    │   │   ├── parser.ts
    │   │   └── index.ts
    │   └── sessions/
    │       ├── model.ts
    │       ├── ingest-external.ts
    │       └── index.ts
    └── server/
        ├── chatbot-api.server.ts
        └── sessions.server.ts
    

### Module: `lib/ai`

*   **Maps to capability**  
    Chatbot Session Orchestration, Refactor Intelligence, Pop-Out Artifacts, General Chat.
    
*   **Responsibility**  
    Unified LLM client and shared prompt templates.
    
*   **File structure**
    
        lib/ai/
        ├── provider.ts
        ├── prompt-templates.ts
        └── index.ts
        
    
*   **Exports**
    
    *   `getChatModel(config)`.
        
    *   `streamChat(options)`.
        
    *   `buildPromptTemplate(type, args)`.
        

### Module: `lib/agents-rules`

*   **Maps to capability**  
    AGENTS Rule Awareness and Misalignment Detection.
    
*   **Responsibility**  
    Parse and expose AGENTS rules as structured data.
    
*   **File structure**
    
        lib/agents-rules/
        ├── parser.ts
        └── index.ts
        
    
*   **Exports**
    
    *   `loadAgentsRules(pathOrContent)`.
        
    *   `getRuleById(id)`, `queryRules(filters)`.
        
    *   Types: `AgentsRule`, `RuleSeverity`.
        

### Module: `lib/sessions`

*   **Maps to capability**  
    Multi-Provider Session Ingestion, Session Context Builder.
    
*   **Responsibility**  
    Canonical session model and ingestion utilities.
    
*   **File structure**
    
        lib/sessions/
        ├── model.ts
        ├── ingest-external.ts
        └── index.ts
        
    
*   **Exports**
    
    *   Types: `Session`, `SessionEvent`, `ProviderId`.
        
    *   `normalizeSession(raw, providerId)`.
        
    *   `registerProviderAdapter(providerId, adapter)`.
        

### Module: `features/chatbot/chatModeConfig.ts`

*   **Maps to capability**  
    Mode Management.
    
*   **Responsibility**  
    Declarative configuration per chat mode (labels, tools, flags).
    
*   **File structure**
    
        features/chatbot/chatModeConfig.ts
        
    
*   **Exports**
    
    *   `ChatMode = "session" | "general"`.
        
    *   `ChatModeConfig` type.
        
    *   `CHAT_MODE_CONFIG: Record<ChatMode, ChatModeConfig>`.
        

### Module: `features/chatbot/tools.session.ts`

*   **Maps to capability**  
    Session Coach tools (misalignment analysis, summaries, commits, task suggestions).
    
*   **Responsibility**  
    Define tool registry for Session Coach mode.
    
*   **Exports**
    
    *   `SESSION_TOOLS` registry used when `mode === "session"`.
        

### Module: `features/chatbot/tools.general.ts` (future)

*   **Maps to capability**  
    General Chat tools.
    
*   **Responsibility**  
    Define tool registry for General Chat mode.
    
*   **Exports**
    
    *   `GENERAL_TOOLS` used when `mode === "general"`.
        

### Module: `features/chatbot/context-builder.ts`

*   **Maps to capability**  
    Session Context Builder.
    
*   **Responsibility**  
    Build compact model-ready context from a `Session`.
    
*   **Exports**
    
    *   `buildSessionContext(session: Session, options?)`.
        

### Module: `features/chatbot/misalignment-detector.ts`

*   **Maps to capability**  
    AGENTS Rule Awareness and Misalignment Detection.
    
*   **Responsibility**  
    Detect misalignments given a session and rule set.
    
*   **Exports**
    
    *   `detectMisalignments(session, rules)`.
        

### Module: `features/chatbot/summaries.ts`

*   **Maps to capability**  
    Pop-Out Session Summaries.
    
*   **Responsibility**  
    Generate markdown summaries from a session.
    
*   **Exports**
    
    *   `generateSummary(session, options)`.
        

### Module: `features/chatbot/commit-messages.ts`

*   **Maps to capability**  
    Pop-Out Commit Message Generator.
    
*   **Responsibility**  
    Generate commit messages from session data.
    
*   **Exports**
    
    *   `generateCommitMessages(session, options)`.
        

### Module: `features/chatbot/task-opportunities.ts`

*   **Maps to capability**  
    Refactor Intelligence and Task Timing.
    
*   **Responsibility**  
    Compute refactor/task opportunities from sessions.
    
*   **Exports**
    
    *   `suggestTasks(session, rules)`.
        

### Module: `features/chatbot/chatbot.runtime.ts`

*   **Maps to capability**  
    Chatbot Session Orchestration, Mode Management, General Chat.
    
*   **Responsibility**  
    Orchestrate chat turns; select prompts/tools/context based on `mode`.
    
*   **File structure**
    
        // features/chatbot/chatbot.runtime.ts
        export type ChatMode = "session" | "general";
        
        export interface ChatRuntimeOptions {
          mode: ChatMode;
          sessionId?: string;
          userId?: string;
        }
        
        export function createChatRuntime(opts: ChatRuntimeOptions) { ... }
        
    
*   **Exports**
    
    *   `createChatRuntime(options)`: returns `{ runTurn(messages) }` which dispatches to `runSessionCoachTurn` or `runGeneralChatTurn`.
        
    *   `ChatMode` type.
        

### Module: `components/chatbot/ChatDockPanel.tsx`

*   **Maps to capability**  
    Chatbot Session Orchestration, Mode Management, Pop-Out Artifacts.
    
*   **Responsibility**  
    Render chat shell with mode header, conversation body, input, and tool buttons.
    
*   **Exports**
    
    *   `ChatDockPanel(props: { mode: ChatMode; sessionId?: string; userId?: string; ... })`.
        

### Module: `components/chatbot/MisalignmentBanner.tsx`, `MisalignmentTimelineBadges.tsx`

*   **Maps to capability**  
    Misalignment Notification + Remediation Prompt.
    
*   **Responsibility**  
    Banner and timeline markers for misalignments.
    

### Module: `components/chatbot/SummaryPopout.tsx`, `CommitPopout.tsx`

*   **Maps to capability**  
    Pop-Out Knowledge Artifacts.
    
*   **Responsibility**  
    UI around summaries and commit message generation.
    

### Module: `server/chatbot-api.server.ts`

*   **Maps to capability**  
    Chatbot Session Orchestration, Mode Management, General Chat.
    
*   **Responsibility**  
    Mode-aware chat streaming and analysis endpoints.
    
*   **Exports**
    
    *   `handleChatRequest(req: Request): Promise<Response>` (streaming chat; requires `mode`).
        
    *   `analyzeSessionServerFn(sessionId)` (optional analysis endpoint).
        

### Module: `server/sessions.server.ts`

*   **Maps to capability**  
    Multi-Provider Session Ingestion.
    
*   **Responsibility**  
    Discover and load sessions for chatbot.
    
*   **Exports**
    
    *   `getSessionById(sessionId)`.
        
    *   `listSessionsWithProviders()`.
        
    *   `uploadSessionHandler(file, providerId)`.
        

### Route: `src/routes/(site)/viewer/index.tsx`

*   **Maps to capability**  
    Viewer UI integration with ChatDock.
    
*   **Responsibility**
    
    *   Wire `ViewerPage` into TanStack Router.
        
    *   Ensure viewer embeds mode-aware `ChatDockPanel` (using `mode="session"` in MVP).
        

* * *

4) Dependency Chain
-------------------

### Foundation Layer (Phase 0)

No dependencies.

*   **`lib/ai`** — LLM abstraction + prompts. Depends on: \[\].
    
*   **`lib/agents-rules`** — AGENTS parsing and query. Depends on: \[\].
    
*   **`lib/sessions`** — Canonical session model + ingest. Depends on: \[\].
    

### Core Analysis Layer (Phase 1)

*   **`features/chatbot/context-builder`**  
    Depends on: \[`lib/sessions`\].
    
*   **`features/chatbot/misalignment-detector`**  
    Depends on: \[`lib/agents-rules`, `lib/sessions`, `lib/ai`\].
    
*   **`features/chatbot/summaries`**  
    Depends on: \[`lib/ai`, `lib/sessions`\].
    
*   **`features/chatbot/commit-messages`**  
    Depends on: \[`lib/ai`, `lib/sessions`\].
    

### Mode + Tools Layer (Phase 1.5)

*   **`features/chatbot/chatModeConfig`**  
    Depends on: \[foundation only\].
    
*   **`features/chatbot/tools.session`**  
    Depends on: \[`lib/ai`, `features/chatbot/context-builder`, `features/chatbot/misalignment-detector`, `features/chatbot/summaries`, `features/chatbot/commit-messages`\].
    
*   **`features/chatbot/tools.general`** (stub for MVP)  
    Depends on: \[`lib/ai`\].
    

### Orchestration & API Layer (Phase 2)

*   **`features/chatbot/chatbot.runtime`**  
    Depends on: \[`lib/ai`, `features/chatbot/context-builder`, `features/chatbot/misalignment-detector`, `features/chatbot/chatModeConfig`, `features/chatbot/tools.session`, `features/chatbot/tools.general`\].
    
*   **`server/chatbot-api.server`**  
    Depends on: \[`features/chatbot/chatbot.runtime`, `lib/ai`\].
    
*   **`server/sessions.server`**  
    Depends on: \[`lib/sessions`\].
    

### Advanced Intelligence & Integrations Layer (Phase 3)

*   **`features/chatbot/task-opportunities`**  
    Depends on: \[`lib/sessions`, `lib/ai`, `features/chatbot/context-builder`\].
    
*   **`lib/sessions/ingest-external`**  
    Depends on: \[`lib/sessions`\].
    

### UI Layer (Phase 4)

*   **`components/chatbot/*`**  
    Depends on: \[`features/chatbot/*`\].
    
*   **`components/viewer/ChatDock.tsx`** (wrapper/bridge)  
    Depends on: \[`components/chatbot/ChatDockPanel`\].src
    
*   **`routes/(site)/viewer/index.tsx` + `features/viewer/viewer.page.tsx`**  
    Depends on: \[`components/viewer/ChatDock`, existing viewer components\].
    

No cycles: each module depends only on its own or lower layer.

* * *

5) Development Phases
---------------------

Phases follow the dependency chain and deliver an end-to-end usable Session Coach experience before any General Chat.

### Phase 0: Core AI and Rules Foundations

**Goal**  
Provide AI client, AGENTS parsing, and session model.

**Entry Criteria**  
Existing Codex Session Viewer builds and passes baseline tests.

**Tasks**

*    `lib/ai` (depends on: none)
    
    *   Acceptance: LLM calls can be made via `streamChat` using Vercel AI SDK; prompt templates exist for chat/summaries/commits.
        
    *   Test: unit tests with mocked AI client; golden tests for prompt assembly.
        
*    `lib/agents-rules` (depends on: none)
    
    *   Acceptance: `loadAgentsRules` parses sample AGENTS.md into rule set; queries by id/tag/severity pass.
        
    *   Test: parser unit tests; snapshot of parsed rules.
        
*    `lib/sessions` (depends on: none)
    
    *   Acceptance: `normalizeSession` converts sample provider sessions into canonical `Session`; model types compile.
        
    *   Test: unit tests on normalization; type-level tests.
        

**Exit Criteria**  
All three libs consumable from other modules without runtime errors.

* * *

### Phase 1: Session Analysis & Artifacts

**Goal**  
Build context, misalignment detection, summaries, and commit generators.

**Entry Criteria**  
Phase 0 complete.

**Tasks**

*    `features/chatbot/context-builder` (depends on: `lib/sessions`)
    
    *   Acceptance: produces stable, token-bounded context for fixture sessions.
        
    *   Test: unit tests for bucketing/summarization; size checks for token budget.
        
*    `features/chatbot/misalignment-detector` (depends on: `lib/agents-rules`, `lib/sessions`, `lib/ai`)
    
    *   Acceptance: for known fixture, returns expected misalignment events.
        
    *   Test: heuristic unit tests; integration test with mocked LLM.
        
*    `features/chatbot/summaries` (depends on: `lib/ai`, `lib/sessions`)
    
    *   Acceptance: `generateSummary` returns markdown summary; handles long sessions gracefully.
        
    *   Test: golden-file tests.
        
*    `features/chatbot/commit-messages` (depends on: `lib/ai`, `lib/sessions`)
    
    *   Acceptance: generates commit messages matching target style schema.
        
    *   Test: unit tests on structure and style.
        

**Exit Criteria**  
Given a session + AGENTS rules, backend utilities can produce misalignments, summaries, and commit messages via direct calls.PRD

* * *

### Phase 1.5: Mode Config + Tool Registries (MVP)

**Goal**  
Introduce explicit `ChatMode`, mode config, and separated tool registries.

**Entry Criteria**  
Phase 1 complete.

**Tasks**

*    `chatModeConfig` (depends on: foundation)
    
    *   Acceptance: `CHAT_MODE_CONFIG.session` and `.general` defined; types compile.
        
    *   Test: type-level checks and simple runtime assertion.
        
*    `tools.session` (depends on: Phase 1 features)
    
    *   Acceptance: registry exposes misalignment, summary, commit, and opportunity tools; all callable in isolation.
        
    *   Test: unit tests per tool; ensure registry has no General-only tools.
        
*    `tools.general` stub (depends on: `lib/ai`)
    
    *   Acceptance: interface and type placeholders exist; no tools invoked in MVP.
        
    *   Test: compilation-only.
        

**Exit Criteria**  
Mode metadata and session-only tools are formally defined; no UI/API changes yet.

* * *

### Phase 2: Mode-Aware Chat Runtime and API (Session Coach MVP)

**Goal**  
Refactor chat runtime and API to be explicitly mode-aware while preserving existing Session Coach behavior.

**Entry Criteria**  
Phases 0–1.5 complete.

**Tasks**

*    Implement `runSessionCoachTurn` using existing orchestration (depends on: Phase 1 + `tools.session`)
    
    *   Acceptance: for a fixture session, responses/tool calls match pre-refactor behavior when `mode="session"`.
        
    *   Test: regression tests comparing pre/post outputs.
        
*    Add `createChatRuntime({ mode })` and stub `runGeneralChatTurn` (depends on: `chatModeConfig`, `tools.*`)
    
    *   Acceptance:
        
        *   `mode="session"` path executes Session Coach.
            
        *   `mode="general"` path returns `{ code: "MODE_NOT_ENABLED" }`.
            
    *   Test: unit tests asserting correct branch behavior and error schema.
        
*    Update `server/chatbot-api.server` to require `mode` (depends on: `chatbot.runtime`)
    
    *   Acceptance:
        
        *   Missing/invalid `mode` → 400.
            
        *   `mode="general"` → 5xx/501-style error with `MODE_NOT_ENABLED`.
            
        *   Existing caller updated to send `mode="session"` and passes.
            
    *   Test: HTTP-level integration tests.
        

**Exit Criteria**

*   All chat API calls supply `mode`.
    
*   General Chat requests short-circuit with deterministic error.
    
*   Session Coach flows show no regressions.
    

* * *

### Phase 3: Viewer UI Integration (Mode-Aware Session Coach MVP)

**Goal**  
Integrate mode-aware chat, misalignment notifications, and pop-outs into Codex Session Viewer UI with Session Coach active.

**Entry Criteria**  
Phases 0–2 complete.

**Tasks**

*    Implement `ChatDockPanel` and wire it into viewer (depends on: `chatbot-api.server`, `chatbot.runtime`, `chatModeConfig`)
    
    *   Acceptance:
        
        *   Viewer shows ChatDockPanel; viewer route passes `mode="session"`.
            
        *   Messages stream and auto-scroll.
            
    *   Test: E2E test sending a message and observing streamed response; visual regression.
        
*    Implement `MisalignmentBanner` + `MisalignmentTimelineBadges` (depends on: `misalignment-detector`)
    
    *   Acceptance: misalignments appear as banner + timeline markers; clicking opens ChatDock with remediation prompt.
        
    *   Test: E2E tests with recorded fixtures; component unit tests for states.
        
*    Implement `SummaryPopout` + `CommitPopout` (depends on: `summaries`, `commit-messages`)
    
    *   Acceptance: user can trigger pop-outs and copy generated content.
        
    *   Test: E2E and accessibility tests (focus, keyboard).
        
*    Add internal mode header label (“Session Coach”) without toggle (depends on: `ChatDockPanel`)
    
    *   Acceptance: header clearly indicates current mode even though toggle is not active.
        
    *   Test: simple component test.
        

**Exit Criteria**  
From the viewer, a user can chat with session-aware assistant, see misalignment alerts, and generate summaries/commits without leaving the app; all requests use `mode="session"`.

* * *

### Phase 4: Advanced Intelligence, Multi-Provider, and General Chat Enablement

**Goal**  
Add refactor timing, external ingestion, visible mode toggle, and start filling in General Chat.

**Entry Criteria**  
Phase 3 complete and stable.

**Tasks**

*    `features/chatbot/task-opportunities` + UI surfacing (depends on: `context-builder`, `lib/ai`, `lib/sessions`)
    
    *   Acceptance: returns ranked opportunities for fixture sessions; displays at least one suggestion.
        
    *   Test: unit tests with synthetic sessions; UX tests.
        
*    `lib/sessions/ingest-external` provider adapters (depends on: `lib/sessions`)
    
    *   Acceptance: at least two concrete provider adapters; imported sessions usable end-to-end.
        
    *   Test: integration tests with real exports.
        
*    Custom Local Session Logger spec + thin SDK (may be separate repo; depends on: `lib/sessions`)
    
    *   Acceptance: emitted logs load and analyze successfully in viewer.
        
    *   Test: round-trip test (emit → open → chat).
        
*    Visible mode toggle in ChatDockPanel (depends on: `chatModeConfig`, `ChatDockPanel`)
    
    *   Acceptance: user can toggle between Session Coach and General Chat; conversations reset or segmented per mode.
        
    *   Test: component tests; E2E verifying mode change updates payload.
        
*    Implement minimal `runGeneralChatTurn` and `GENERAL_TOOLS` (depends on: `lib/ai`, `tools.general`)
    
    *   Acceptance: for `mode="general"`, open-domain chat produces responses; no AGENTS/misalignment logic leaks in.
        
    *   Test: unit tests on branching; basic E2E “hello world” for General Chat.
        

**Exit Criteria**  
Viewer robustly analyzes sessions from multiple providers, surfaces task opportunities, and supports a minimal but functional General Chat mode.

* * *

6) User Experience
------------------

### Personas

*   AGENTS-oriented app developer: wants immediate feedback on violations and concrete fixes.
    
*   AI tooling engineer: needs unified view + assistant across sessions.
    
*   Team lead/reviewer: consumes summaries and commit messages quickly.
    
*   General assistant user: uses General Chat for typical assistant tasks.
    

### Key Flows

1.  **Inspect and remediate a misaligned session (Session Coach)**PRD
    
    *   Open session in viewer.
        
    *   Misalignment banner appears; timeline shows markers.
        
    *   Click banner → ChatDock opens with remediation prompt in Session Coach mode.
        
    *   Assistant explains violation referencing AGENTS rule and suggests fixes.
        
    *   User exports/records plan.
        
2.  **Generate summary and commit message after a session**
    
    *   With session open, user clicks “Generate summary”.
        
    *   SummaryPopout shows concise markdown.
        
    *   User copies into issue tracker.
        
    *   User opens CommitPopout, selects style, copies message.
        
3.  **Explore refactor opportunities (post-MVP)**
    
    *   User opens “Opportunities” view in ChatDock.
        
    *   Assistant lists suggested refactors and timing.
        
    *   User converts items into tasks or defers.
        
4.  **Analyze sessions from external providers (post-MVP)**
    
    *   User uploads session export.
        
    *   Viewer normalizes and displays it.
        
    *   Chatbot and misalignment features operate identically.
        
5.  **Use General Chat mode (future)**
    
    *   User toggles ChatDock to General Chat.
        
    *   UI tool buttons change (web/image/code tools available; no AGENTS misalignment UI).
        
    *   User asks open-domain questions or project-level questions.
        
    *   Switching back to Session Coach resets or switches to mode-specific transcript.
        

### Mode UX

*   ChatDock header reserves space for mode label/toggle.
    
*   MVP: label “Session Coach” only; no toggle.
    
*   Future: two-state selector `[Session Coach | General Chat]` with clear highlight of active mode.
    
*   On mode change:
    
    *   Current conversation cleared or segmented by mode.
        
    *   No silent mixing of messages across modes.
        

### Error UX for disabled General Chat

*   If `mode="general"` is requested before implementation, ChatDock shows a clear “General Chat is not enabled yet” message derived from `MODE_NOT_ENABLED`, without crashing.
    

### UI/UX Notes

*   Use shadcn/ui and existing layout patterns.README
    
*   ChatDock remains collapsible so timeline remains primary.
    
*   Misalignment indications are non-blocking (banner + subtle markers).
    
*   Pop-outs are side-sheets/dialogs with strong accessibility.
    
*   All AI actions show progress and error toasts with retry.
    

* * *

7) Technical Architecture
-------------------------

### System Components

*   **Frontend (React + TanStack Start)**
    
    *   Viewer route + `ViewerPage`.
        
    *   ChatDockPanel and chatbot components.
        
    *   Uses AI SDK UI for streaming chat.
        
*   **Backend (Node 20 server functions)**
    
    *   `chatbot-api.server` wrapping Vercel AI SDK.
        
    *   Existing session discovery/lookup extended for chatbot.
        
*   **Libraries**
    
    *   `lib/ai` for providers + prompts.
        
    *   `lib/agents-rules` for AGENTS parsing.
        
    *   `lib/sessions` for session models and provider ingest.
        
*   **Optional Python service (future)**
    
    *   For heavier DSPy/LangChain optimization flows, invoked via HTTP/MCP tools.
        
*   **Storage**
    
    *   Existing filesystem/local session snapshots.src
        
    *   Optional Postgres/pgvector if needed for long-term memory or large-scale semantic search.
        

### Data Models

*   `Session`
    
    *   `id`, `providerId`, `repo`, `branch`, `timestamp`, `events: SessionEvent[]`.
        
*   `SessionEvent`
    
    *   `type` (`ACTION`, `MUTATION`, `LOG`, `AI_MESSAGE`, `USER_MESSAGE`, etc.).
        
    *   `timestamp`, typed `payload`.
        
*   `AgentsRule`
    
    *   `id`, `title`, `description`, `severity`, `tags`, `detectionHints`.
        
*   `Misalignment`
    
    *   `id`, `ruleId`, `sessionId`, `eventRange`, `severity`, `evidence`, `status`.
        
*   `ChatMessage`
    
    *   `id`, `role`, `content`, `sessionId?`, optional `misalignmentId`, `mode`.
        
*   `ChatMode`
    
    *   Literal `"session" | "general"`.
        
*   `GeneralChatConversation` (future)
    
    *   `id`, `userId`, `createdAt`, `title`, `messages: ChatMessage[]`.
        
*   `GeneralChatMemory` (future)
    
    *   `id`, `userId`, `embedding`, `metadata`.
        

### APIs and Integrations

*   **Chatbot API**
    
    *   `POST /api/chatbot/stream` via server function.
        
        *   Body: `{ mode, sessionId?, userId?, messages[] }`.
            
        *   Streams tokens and side-channel metadata (e.g. misalignment markers).
            
*   **Analysis API**
    
    *   `POST /api/chatbot/analyze`
        
        *   Body: `{ sessionId }`.
            
        *   Response: `{ misalignments[], summary, commitMessages[] }`.
            
*   **Session APIs**
    
    *   `GET /api/sessions/:id` → normalized session.
        
    *   `POST /api/sessions/import` → external provider payload.
        

### Key Decisions

*   **Single runtime with mode branching**
    
    *   Rationale: shared infra (streaming, logging, error handling) while keeping prompts/tools segmented by mode.
        
    *   Trade-offs: runtime complexity; discipline required to prevent leakage between modes.
        
    *   Alternative: separate runtimes per mode; rejected to avoid duplicated infra.
        
*   **Explicit `mode` field in API**
    
    *   Rationale: makes dual-mode intent clear and decouples server from routing assumptions.
        
    *   Trade-offs: client updates required.
        
    *   Alternative: infer from route; rejected.
        
*   **Use Vercel AI SDK for LLM calls**
    
    *   Rationale: consistent streaming semantics and provider abstraction.PRD
        
    *   Trade-offs: non-compatible providers need adapters.
        
*   **Keep AGENTS parsing server-side**
    
    *   Rationale: avoid shipping rules parsing + full AGENTS.md to client.
        
    *   Trade-offs: more server logic; need to send derived metadata to client.
        

* * *

8) Test Strategy
----------------

### Test Pyramid

Target distribution:

*   Unit tests: ~70%.
    
*   Integration tests: ~25%.
    
*   E2E tests: ~5%.PRD
    

Priority on deterministic, fast unit tests; limited but critical E2E around key flows.

### Coverage Requirements (new/changed modules)

*   Line coverage: ≥ 85%.
    
*   Branch coverage: ≥ 80%.
    
*   Function coverage: ≥ 85%.
    
*   Statement coverage: ≥ 85%.
    

### Critical Test Scenarios

**Chat Runtime (mode-aware)**

*   Happy path: `mode="session"` yields identical outputs to pre-refactor runtime given same fixtures.
    
*   Error: `mode="general"` returns `{ code: "MODE_NOT_ENABLED" }` in MVP.
    
*   Edge: `mode="session"` with missing `sessionId` → validation error.
    

**Chat API**

*   Happy: valid body with `mode="session"` streams tokens correctly.
    
*   Error: missing/invalid `mode` → 400.
    
*   Error: `mode="general"` → 5xx/501-style error with stable schema.
    
*   Token-limit: over-long sessions trigger context trimming rather than crashes.PRD
    

**Mode Config and Tools**

*   Ensure no General tools appear in Session Coach registry.
    
*   Ensure Session Coach tools are not callable under `mode="general"`.
    

**ChatDock UI**

*   Ensures `mode` prop is forwarded in every request.
    
*   Confirms label displays “Session Coach” in MVP.
    
*   When visible toggle is implemented, tests switching modes resets or segments conversations properly.
    

**Misalignment UX**

*   Banner + timeline markers appear only when misalignments exist.
    
*   Clicking banner opens ChatDock with remediation prompt pre-filled.
    

**Pop-Out Artifacts**

*   SummaryPopout shows correct summary for fixture session.
    
*   CommitPopout generates expected commit structure.
    

### Test Generation Guidelines

*   Prefer deterministic fixtures and mocked AI for unit/integration tests.
    
*   For integration tests needing “real” AI output, use recorded fixtures or fixed seeds.
    
*   For every `if (mode === ...)` branch, assert both branches explicitly.
    
*   No global state; always pass `mode`, `sessionId`, `userId` explicitly into functions/components.
    

* * *

9) Risks and Mitigations
------------------------

### Technical Risks

1.  **LLM misclassification of AGENTS rules**
    
    *   Impact: High (false positives/negatives degrade trust).
        
    *   Likelihood: Medium.
        
    *   Mitigation: combine heuristics + LLM; allow manual override; log misclassifications for tuning.
        
    *   Fallback: manual-only rule mode.
        
2.  **Token limits on long sessions**
    
    *   Impact: Medium.
        
    *   Likelihood: High.
        
    *   Mitigation: aggressive summarization/windowing; configurable token budgets.
        
    *   Fallback: require users to slice session.
        
3.  **Performance issues on large timelines**
    
    *   Impact: Medium.
        
    *   Likelihood: Medium.
        
    *   Mitigation: pre-compute summaries/misalignments lazily; debounce recomputations.
        
    *   Fallback: restrict heavy analysis to explicit actions.
        
4.  **Hidden coupling between Session Coach and General Chat**
    
    *   Impact: Medium.
        
    *   Likelihood: Medium.
        
    *   Mitigation: strict mode branching, separate configs and tool registries, mode-specific tests.
        
    *   Fallback: split runtime into two modules.
        
5.  **Incomplete gating of General Chat tools**
    
    *   Impact: Medium.
        
    *   Likelihood: Low–Medium.
        
    *   Mitigation: mode-keyed registries; tests asserting no cross-mode leakage.
        
    *   Fallback: compile-time separation of tool modules.
        

### Dependency Risks

1.  **AI provider outages/pricing changes**
    
    *   Impact: High.
        
    *   Likelihood: Medium.
        
    *   Mitigation: multi-provider support via AI SDK; configuration to switch models quickly.
        
    *   Fallback: degrade to non-AI viewer only.PRD
        
2.  **External provider schema changes**
    
    *   Impact: Medium.
        
    *   Likelihood: Medium.
        
    *   Mitigation: versioned adapters; validation on import.
        
    *   Fallback: mark incompatible sessions, require adapter update.
        
3.  **Client code assuming implicit session mode**
    
    *   Impact: High.
        
    *   Likelihood: Medium.
        
    *   Mitigation: make `mode` required in API types; no defaulting in server handler; CI catches missing field.
        
    *   Fallback: temporary backward-compat default to `"session"` with deprecation warnings.
        

### Scope Risks

1.  **Over-ambitious refactor intelligence**
    
    *   Impact: High.
        
    *   Likelihood: High.
        
    *   Mitigation: constrain early phases to misalignment + summaries/commits; push timing/advanced planning to Phase 4.
        
    *   Fallback: ship without advanced task timing.
        
2.  **UI complexity in viewer**
    
    *   Impact: Medium.
        
    *   Likelihood: Medium.
        
    *   Mitigation: start with minimal ChatDock and banner; incrementally add visuals.
        
    *   Fallback: feature-flag advanced UI.
        
3.  **Over-scoping General Chat**
    
    *   Impact: Medium.
        
    *   Likelihood: High.
        
    *   Mitigation: define small General Chat MVP (simple open-domain chat, minimal tools); delay memory or complex tooling.
        
    *   Fallback: keep General Chat disabled (MODE\_NOT\_ENABLED) until ready.
        

* * *

10) Appendix
------------

### References

*   Codex Session Viewer README for base app architecture and features.README
    
*   RPG Method PRD template.example\_prd\_rpg
    
*   Current Codex Session Viewer source (`src.md`) for route and component structure.
    

### Glossary

*   **AGENTS**: Internal ruleset describing correct TanStack/Start usage and separation of concerns.
    
*   **Session**: Captured sequence of events from coding/agent workflows.
    
*   **Misalignment**: Violation of AGENTS rules or user’s stated goals detected in a session.
    
*   **Pop-out**: UI panel/dialog overlaid on main viewer to show derived artifacts.
    
*   **Session Coach**: Mode where chatbot is strictly session+AGENTS aware; no global memory or web tools.
    
*   **General Chat**: Mode where chatbot behaves as a general assistant with broader tools and memory.
    

### Open Questions

*   Exact locations and conventions for AGENTS.md across repos.
    
*   Which external coding agents to support first and their export formats.
    
*   When and how to persist General Chat memory (DB choice, retention).
    
*   UX model for mode-specific conversation history (tabs vs single feed).
    

* * *

11) Task-Master Integration Notes
---------------------------------

*   **Capabilities → tasks**
    
    *   Each `### Capability:` becomes a top-level Task Master task (e.g. “Chatbot Session Orchestration”, “Mode Management”, “General Chat Mode”, “AGENTS Rule Awareness”, “Pop-Out Knowledge Artifacts”, “Refactor Intelligence”, “Multi-Provider Session Ingestion”).
        
*   **Features → subtasks**
    
    *   Each `#### Feature:` becomes an atomic subtask with clear Inputs/Outputs/Behavior.
        
    *   MVP flag marks high-priority subtasks for early phases.
        
*   **Dependencies → task deps**
    
    *   Module dependencies in the Dependency Chain and per-phase “depends on” annotations define task dependency graphs.
        
    *   Mode-related tasks (`chatModeConfig`, `chatbot.runtime` mode branching, API `mode` enforcement, UI mode prop) depend on Phase 1 analysis work but not on General Chat features.
        
*   **Phases → priorities**
    
    *   Phase 0 tasks: highest priority (foundation).
        
    *   Phase 1–2 tasks: MVP-critical.
        
    *   Phase 3 tasks: UI integration + UX polish.
        
    *   Phase 4 tasks: advanced intelligence, multi-provider, General Chat enablement.
        
*   **Test Strategy linkage**
    
    *   Critical scenarios and coverage targets guide Surgical Test Generator when Task Master spawns implementation and testing subtasks.

---

## You asked:

tasks.json

File

task-complexity-report.json

File

does this convey the prd accurately or do these tasks need to be regenerated? And if so, what should the default task amount be for the tasks and sub-tasks?

---

## ChatGPT Replied:

Thought for 1m 24s

1.  Do the current tasks convey the PRD accurately?
    

Short answer: yes, for the **MVP scope** described in the unified PRD; no, for the **post-MVP capabilities** (Phase 4 and full General Chat). They do not need to be regenerated, only extended.

Mapping to the PRD:

*   **Phase 0 – Foundations**
    
    *   `lib/ai` → Task 1 “Setup Core AI Abstraction Layer (`lib/ai`)"
        
    *   `lib/agents-rules` → Task 2 “Implement AGENTS.md Rules Parser (`lib/agents-rules`)"
        
    *   `lib/sessions/model.ts` → Task 3 “Define Canonical Session Data Models (`lib/sessions`)"
        
*   **Phase 1 – Core Analysis (context, misalignment, summaries/commits)**
    
    *   `features/chatbot/context-builder` → Task 4 “Implement Session Context Builder”
        
    *   `features/chatbot/misalignment-detector` → Task 5 “Develop Automatic AGENTS Misalignment Detector”
        
    *   `features/chatbot/summaries` + `commit-messages` → Task 10 “Implement Pop-Out Summary and Commit Message Generators” (backend functions + analyze endpoint + popouts)
        
*   **Phase 2 – Runtime + API (now mode-aware)**
    
    *   `features/chatbot/chatbot.runtime` with explicit `mode` and `MODE_NOT_ENABLED` for `"general"` → Task 6 “Implement Mode-Aware Chat Runtime (`chatbot.runtime.ts`)"
        
    *   `server/chatbot-api.server` enforcing `mode` and returning `MODE_NOT_ENABLED` for `"general"` → Task 7 “Create Mode-Aware Chat API Endpoint (`chatbot-api.server.ts`)"
        
*   **Phase 3 – Viewer UI Integration (MVP)**
    
    *   `components/chatbot/ChatDockPanel` wired to viewer, using `mode` and `sessionId` → Task 8 “Implement Core ChatDockPanel React Component”
        
    *   `MisalignmentBanner` + `MisalignmentTimelineBadges` + remediation flow → Task 9 “Implement Misalignment UI and Remediation Flow”
        
    *   `SummaryPopout` / `CommitPopout` → included in Task 10 (front-end pop-out components).
        

The dependencies embedded in the tasks (1–3 feeding 4–5 feeding 6–7 feeding 8–10) match the PRD’s layered dependency chain and phases.

Where the tasks **do not** yet cover the PRD:

*   No tasks for **Refactor/Task Intelligence** (`features/chatbot/task-opportunities` + UI).
    
*   No tasks for **Multi-Provider Session Ingestion** (`lib/sessions/ingest-external`, external adapters, local logger).
    
*   No tasks for **General Chat implementation** (beyond the `MODE_NOT_ENABLED` stub): open-domain prompt, `tools.general`, global memory, and visible mode toggle UX.
    

Conclusion:

*   For the **Session Coach MVP + internal mode plumbing**, the existing 10 tasks and their subtasks are accurate and usable. They do **not** need to be regenerated.
    
*   To fully cover the **entire PRD**, you need **additional Phase-4 tasks**, not a rewrite of tasks 1–10.
    

2.  Should you regenerate tasks?
    

No, if your immediate goal is:

*   Ship Session Coach MVP.
    
*   Have the architecture ready for General Chat later (mode field, stubbed `"general"`).
    

Yes, but only **additive**, if you want Task-Master to also track:

*   Refactor/task-opportunity intelligence.
    
*   Multi-provider ingest + local logger.
    
*   Actual General Chat mode (runtime branch, tools, memory, visible toggle).
    

In that case, you’d append ~3–5 new top-level tasks for those post-MVP capabilities, following the same pattern as the existing ones.

3.  Default task and subtask counts
    

Given the current PRD size and complexity analysis:

*   **Top-level tasks**
    
    *   Current: 10 tasks.
        
    *   This is the right order of magnitude for this PRD (covers foundations, runtime/API, UI, analysis slices).
        
    *   Recommended **default for similar PRDs**: **8–12 top-level tasks**.
        
*   **Subtasks per task**
    
    *   Complexity report already implies a good pattern:
        
        *   Complexity 1–2 → 0–1 subtasks (pure types/config; e.g., Task 3).
            
        *   Complexity 3–5 → 2–3 subtasks (standard API/UI work; e.g., Tasks 1, 7, 8).
            
        *   Complexity 6–8 → 3–4 subtasks (algorithmic or full-stack features; e.g., Tasks 4, 5, 9, 10).
            

If you want static generator defaults rather than complexity-aware ones:

*   **Default max top-level tasks**: **10**.
    
*   **Default max subtasks per task**: **3–4**, with a soft rule to keep purely type/definition tasks as atomic (0–1 subtasks).
    

That keeps the total work graph in the ~40–50 node range (10 tasks + ~30–40 subtasks), which is manageable while still reflecting the PRD’s structure.

---

