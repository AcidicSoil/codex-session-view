# Codebase Architecture Analysis (Dec 21, 2025)

## 1. Repository Map

- **src/features/viewer**
  - **Purpose**: Core domain for visualizing session data (timelines, logs, diffs).
  - **Responsibilities**: Parsing session files, rendering the timeline, managing UI state (zoom, filters).
  - **Public Surface**: `ViewerPage`, `ViewerWorkspaceContext`, `useViewerWorkspace`.
  - **Evidence**: `src/features/viewer/viewer.page.tsx`, `src/features/viewer/viewer.workspace.tsx`.

- **src/features/chatbot**
  - **Purpose**: AI assistance domain for analyzing sessions.
  - **Responsibilities**: Context building, misalignment detection, chat interface logic.
  - **Public Surface**: `ChatDock`, `handleSessionChatStream`, `detectMisalignments`.
  - **Evidence**: `src/features/chatbot/ChatDock.tsx`, `src/routes/api/chatbot/stream.ts`.

- **src/server/function** (RPC Layer)
  - **Purpose**: Server-side functions callable from the client (TanStack Start).
  - **Responsibilities**: Bridge between client and server persistence/logic.
  - **Public Surface**: `sessionStore`, `todos`, `chatbotState`.
  - **Evidence**: `src/server/function/sessionStore.ts`, `src/server/function/chatbotState.ts`.

- **src/server/persistence** (Data Layer)
  - **Purpose**: In-memory data storage.
  - **Responsibilities**: Storing uploads, chat threads, misalignments.
  - **Public Surface**: `saveSessionUpload`, `appendChatMessage`, `listMisalignments`.
  - **Evidence**: `src/server/persistence/sessionUploads.server.ts`, `src/server/persistence/chatMessages.server.ts`.

- **src/server/lib/aiRuntime** (AI Infrastructure)
  - **Purpose**: Wrapper around Vercel AI SDK.
  - **Responsibilities**: Prompt construction, model resolution, streaming.
  - **Public Surface**: `generateSessionCoachReply`, `runGeneralChatTurn`.
  - **Evidence**: `src/server/lib/aiRuntime.ts`, `src/server/lib/aiRuntime.prompts.ts`.

- **src/lib/agents-rules** (Rule Engine)
  - **Purpose**: Parsing and managing agent behavior rules.
  - **Responsibilities**: Parsing Markdown to `AgentRule` objects, hashing for cache.
  - **Public Surface**: `parseAgentRules`, `loadAgentRules`.
  - **Evidence**: `src/lib/agents-rules/parser.ts`.

## 2. Module Table

| Module | Type | Purpose | Key Dependencies | Inputs → Outputs | Extensibility Points | Boundary Notes | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Viewer** | Domain | Session visualization & navigation | `session-parser`, `stores` | `SessionSnapshot` → UI Components | `ViewerInspectorView` | Highly coupled to `session-parser` formats. | `src/features/viewer/` |
| **Chatbot** | Domain | AI Coach & Analysis | `aiRuntime`, `misalignment-detector` | User Prompt + Session Context → Streamed Response | `timelineTools` (Tools) | Split between Client UI and Server Stream Handler. | `src/features/chatbot/` |
| **AI Runtime** | Infra | LLM Orchestration | `vercel-ai-sdk` | History + Context → `TextStream` | `aiRuntime.providers.ts` | Abstracts model providers (Google/OpenAI). | `src/server/lib/aiRuntime.ts` |
| **Persistence** | Infra | State Storage | `@tanstack/db` | Objects → In-Memory Collection | `localOnlyCollectionOptions` | "Split Brain": Client has `localStorage`, Server has Memory. | `src/server/persistence/` |
| **Rule Engine** | Utility | Policy parsing | `fast-glob`, `regex` | Markdown Files → `AgentRule[]` | New Markdown patterns. | Parses raw text from disk; tied to file system. | `src/lib/agents-rules/` |
| **Server Functions** | Glue | RPC & API Routes | `persistence`, `domain` | JSON Payload → JSON Response | TanStack Start handlers. | thin wrappers around persistence/logic. | `src/server/function/` |

## 3. Agent-Centric Component Map

**Category: Evaluation (The Coach)**
*   **Components**: `SessionCoach` (LLM), `MisalignmentDetector` (Regex/Rule-based).
*   **State**: Owns `MisalignmentRecord` (detected issues) and `ChatThread`.
*   **Invocation**: Triggered by user chat or (potentially) background analysis on load.
*   **Evidence**: `src/server/lib/aiRuntime.ts` (`generateSessionCoachReply`), `src/features/chatbot/misalignment-detector.ts`.

**Category: Memory (Context)**
*   **Components**: `SessionSnapshot` (The Trace), `AgentRule` (The Laws), `ChatHistory`.
*   **State**: `sessionUploads` (Raw files), `sessionSnapshots` (Parsed events).
*   **Invocation**: Loaded per-request in `handleSessionChatStream`.
*   **Evidence**: `src/server/lib/chatbotData.server.ts` (`loadSessionSnapshot`), `src/server/persistence/chatMessages.server.ts`.

**Category: Toolkit**
*   **Components**: `timelineTools`.
*   **State**: Read-only access to the session timeline.
*   **Invocation**: Called by the LLM during the `SessionCoach` loop.
*   **Evidence**: `src/server/lib/tools/timelineTools.ts`.

## 4. Data & Control Flow

1.  **Ingestion (Happy Path):**
    *   User uploads a session file via `POST /api/uploads/`.
    *   Server `sessionUploads.server.ts` stores the raw content in an in-memory collection (`@tanstack/db`).
    *   Client redirects to `/viewer/$uploadId`.

2.  **Visualization:**
    *   Client `ViewerPage` initializes.
    *   Client parses the raw content (fetched via API) into a structured `SessionSnapshot`.
    *   Snapshot is stored in Client `localStorage` (`sessionSnapshots.ts`) for fast access/persistence across reloads.

3.  **Coaching Loop:**
    *   User opens ChatDock and sends a message ("Why did the test fail?").
    *   Request hits `POST /api/chatbot/stream`.
    *   Server `chatbotData.server.ts` re-loads/parses the session snapshot from the *server-side* upload record (ensuring server has context).
    *   `loadAgentRules` scans the repo (linked via `repoBinding`) for `.ruler/*.md` files.
    *   `detectMisalignments` runs regex checks against the session events using the loaded rules.
    *   `aiRuntime` constructs a prompt with: Session Context + Detected Misalignments + Chat History.
    *   LLM generates a response (potentially using `get_timeline_event` tool).
    *   Response flows back to Client via `ndjson` stream.

4.  **Key Edges:**
    *   Client Viewer -> Server Uploads (Data Source)
    *   Server Chatbot -> Server Uploads (Context Source)
    *   Server Chatbot -> File System (Rule Source)
    *   LLM -> Timeline Tools -> Session Snapshot (Read Access)

## 5. Architecture Assessment

**Archetype:** **Local-First Analysis Workbench**.
It combines a rich client-side application (Viewer) with a co-located server (Nitro) that acts as an "Analysis Engine" and "LLM Gateway". It is designed to run locally (accessing local file system for rules) but presents as a web app.

**Strengths:**
*   **Privacy/Security:** Code/Session data stays local (or in the self-hosted instance). Rules are read directly from disk.
*   **Performance:** In-memory databases provide instant response times for session queries.
*   **Separation of Concerns:** Clear split between the "Viewer" (Display) and "Coach" (Analysis/Reasoning).

**Improvement Opportunities:**
1.  **Unified State Management (High Impact, Medium Risk):** The "Split Brain" between Client `localStorage` snapshot and Server `upload` snapshot is fragile. If the client modifies the session (e.g. annotations), the server doesn't know.
    *   *Suggestion:* Move authoritative session state to the server (or a shared persistent layer like SQLite) and sync to client.
    *   *Evidence:* `sessionSnapshots.ts` (client) vs `sessionUploads.server.ts` (server).

2.  **Persistent Storage (High Impact, Low Risk):** Currently uses `localOnly` (memory) for uploads. Restarting the server wipes the analysis context.
    *   *Suggestion:* Switch `@tanstack/db` adapter to file-system or SQLite persistence.
    *   *Evidence:* `localOnlyCollectionOptions` in `sessionUploads.server.ts`.

3.  **Rule Parsing Robustness (Medium Impact, Low Risk):** Regex-based rule parsing (`parser.ts`) is brittle.
    *   *Suggestion:* Use a proper Markdown AST parser (Remark/Unified) to extract rules more reliably.
    *   *Evidence:* `src/lib/agents-rules/parser.ts` uses `HEADING_REGEX`, `ARROW_REGEX`.

4.  **Tooling Expansion (High Impact, Medium Risk):** The AI currently only "reads" the timeline.
    *   *Suggestion:* Add "Analysis" tools (e.g., "SummarizeError", "FindRootCause") that run deterministic logic to aid the LLM.
    *   *Evidence:* `timelineTools.ts` only has getters.

5.  **Type-Safe RPC (Medium Impact, Low Risk):** `api/chatbot/stream` uses raw `fetch` and `zod` validation manually.
    *   *Suggestion:* Fully migrate to TanStack Start `createServeFn` for type-safe client-server communication.
    *   *Evidence:* `chatbot.runtime.ts` uses `fetch('/api/chatbot/stream')` instead of a server function import.
