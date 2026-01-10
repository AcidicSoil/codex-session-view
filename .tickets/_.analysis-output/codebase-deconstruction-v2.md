# Codebase Domain & Architecture Deconstruction

## 1) High-Level Module Catalog

### `src/features`

- **Purpose**: Domain-specific logic and business rules.
- **Responsibilities**: Encapsulates core features like session viewing, chatbot interactions, and todo management.
- **Fits-in**: Consumed by the UI components and Routes.
- **Evidence**:
  - `src/features/viewer`: Core session explorer, parsing, export logic.
  - `src/features/chatbot`: AI interaction, context building, misalignment detection.
  - `src/features/todos`: Simple task management domain.

### `src/routes`

- **Purpose**: Application routing and page structure.
- **Responsibilities**: Defines the URL structure and connects UI components to data loaders.
- **Fits-in**: Entry point for user navigation; mapped by `@tanstack/react-router`.
- **Evidence**:
  - `src/routes/viewer`: Session viewer pages.
  - `src/routes/todo`: Todo list page.
  - `src/routes/api`: Backend API endpoints (e.g., `chatbot/stream`).

### `src/server`

- **Purpose**: Server-side logic and runtime.
- **Responsibilities**: Handles API requests, AI agent execution, and ephemeral data persistence.
- **Fits-in**: Powered by Nitro; provides the backend for the TanStack Start application.
- **Evidence**:
  - `src/server/function`: RPC-style server functions (e.g., `todos.ts`, `sessionStore.ts`).
  - `src/server/persistence`: In-memory data stores (e.g., `todosStore.ts`, `sessionUploads.server.ts`).
  - `src/server/ai`: AI agent definitions and runtime.

### `src/db` & `src/stores`

- **Purpose**: Client-side persistence and state management.
- **Responsibilities**: Manages local user data (session snapshots) and UI state.
- **Fits-in**: Uses `@tanstack/db` with `localStorage` adapter.
- **Evidence**:
  - `src/db/sessionSnapshots.ts`: Client-side storage for sessions.
  - `src/stores`: Zustand stores (implied by `package.json` dependency and folder).

## 2) Agent-Centric Components

### **Planning & Reasoning**

- **Session Analysis Agent**
  - **Location**: `src/server/ai/sessionAnalysisAgent.server.ts`
  - **Function**: Analyzes session data to provide insights or answers.
  - **Invocation**: Likely called via server functions or API endpoints.
- **Misalignment Detector**
  - **Location**: `src/features/chatbot/misalignment-detector.ts`, `src/server/persistence/misalignments.ts`
  - **Function**: Detects discrepancies between user intent and agent actions.
- **Context Builder**
  - **Location**: `src/features/chatbot/context-builder.ts`
  - **Function**: Assembles prompt context from session metadata, history, and rules, respecting token budgets.

### **Communication**

- **Chat Stream API**
  - **Location**: `src/routes/api/chatbot/stream.ts`, `src/server/chatbot-api/stream.ts`
  - **Function**: Streams AI responses to the client using NDJSON or similar format.
- **Chatbot Runtime**
  - **Location**: `src/features/chatbot/chatbot.runtime.ts`
  - **Function**: Client-side SDK to interact with the streaming API.

### **Memory**

- **Chat Threads & Messages Store**
  - **Location**: `src/server/persistence/chatThreads.server.ts`, `src/server/persistence/chatMessages.server.ts`
  - **Function**: In-memory storage of conversation history (ephemeral).

### **Utility / Toolkit**

- **Hookify**
  - **Location**: `src/server/lib/hookifyRuntime.ts`, `src/server/persistence/hookifyDecisions.server.ts`
  - **Function**: Suggested to be an agentic tool for suggesting or managing "hooks" or code modifications (inferred name).
- **Rule Inventory**
  - **Location**: `src/server/lib/ruleInventory.server.ts`
  - **Function**: Manages agent rules used in context building.

## 3) Overlapping Responsibilities & Boundary Problems

- **Persistence Layer Ambiguity**
  - **Issue**: `src/server/persistence` uses `@tanstack/db` with `localOnlyCollectionOptions`. In a server context (Nitro), this typically implies in-memory storage that wipes on restart.
  - **Ambiguity**: It's unclear if this is intentional for a stateless/demo app or if a persistent adapter is missing. The app has "uploads" (`sessionUploads.server.ts`) which usually implies file storage, yet it uses the same in-memory collection pattern.
  - **Evidence**: `src/server/persistence/todosStore.ts`, `src/server/persistence/sessionUploads.server.ts`.

- **API Route vs Server Function Dualism**
  - **Issue**: The project uses both explicit API routes (`src/routes/api/chatbot/stream.ts`) and TanStack Start server functions (`src/server/function/todos.ts` calling `src/server/persistence/todosStore.ts`).
  - **Ambiguity**: The boundary between when to use a named API route versus a transparent server function is not strictly enforced, leading to two ways of doing similar RPC tasks.

## 4) Data & Control Flow Map

**Chat Interaction Flow:**

1. **User** sends message via UI (`src/features/chatbot`).
2. **Runtime**: `chatbot.runtime.ts` sends POST to `/api/chatbot/stream`.
3. **API Handler**: `src/routes/api/chatbot/stream.ts` receives request.
4. **Context Construction**: `src/features/chatbot/context-builder.ts` builds the prompt, pulling data from:
    - `sessionStore` (current session context)
    - `misalignments` (active issues)
    - `ruleInventory` (agent constraints)
5. **Agent Execution**: `src/server/ai` components invoke the AI provider (OpenAI/Gemini).
6. **Response**: Streamed back to client.
7. **Persistence**: Message and thread updated in `src/server/persistence` (in-memory).

**Session Upload Flow:**

1. **User** uploads file or references path.
2. **Server Function**: `ensureSessionUploadForFile` (in `src/server/persistence/sessionUploads.server.ts`) reads file from FS (if local) or accepts content.
3. **Store**: Metadata saved to `sessionUploadsCollection` (in-memory).
4. **Client**: Receives summary, potentially polling for updates.

## 5) Extensibility & Integration Surface

- **Agent Rules**:
  - **Mechanism**: Rules can be parsed and injected into the agent context.
  - **Evidence**: `src/lib/agents-rules/parser.ts`, `src/server/lib/ruleInventory.server.ts`.
- **Viewer Discovery**:
  - **Mechanism**: Server-side discovery of session files/assets.
  - **Evidence**: `src/lib/viewerDiscovery.server.ts`.
- **AI Providers**:
  - **Mechanism**: Configurable providers in `src/lib/ai/client.ts` (implied imports in `context-builder.ts`).

## 6) Summary Assessment

- **System Type**: **Server-Side Rendered (SSR) Web Application** with heavy client-side interactivity.
- **Architectural Style**: **Modular Monolith** using **File-Based Routing** and **RPC-like Server Functions**. It relies on "In-Memory/Local" persistence, making it likely a single-instance or personal-use tool rather than a scalable distributed system.
- **Analogy**: A "Localhost Dashboard" or "DevTool" that runs locally, inspects files/sessions, and provides AI assistance without needing a heavy external database.
- **Key Risks**:
  - **Data Loss**: Server-side persistence is currently in-memory (`localOnlyCollectionOptions`). Restarting the server wipes chat history and uploads.
  - **Deployment**: `fs` module usage in `sessionUploads` restricts deployment to environments with file system access (Node.js), incompatible with Edge runtimes if not handled carefully.
- **Unknowns**:
  - **Production Persistence**: Is there a plan for real DB backing (Postgres/SQLite)? `rxdb` is present but usage seems limited to client-side or specific collections.
  - **Hookify**: Full scope of `hookify` features is not fully explored (just files seen).
