# Architecture Deconstruction: `codex-session-view` (v3)

## 1. Coverage & Limits
**Analyzed:**
- **Build/Config:** `package.json`, `nitro.config.ts`, `vite.config.ts`, `codefetch.config.mjs`.
- **Entry Points:** `src/entry-client.tsx`, `src/routes/api/chatbot/stream.ts`.
- **Feature Logic:** `src/features/chatbot`, `src/features/viewer`, `src/features/todos`.
- **Server/API:** `src/server/function`, `src/server/persistence`, `src/server/lib`, `src/server/chatbot-api.server.ts`.
- **Persistence:** `src/db/sessionSnapshots.ts`, `src/server/persistence/chatThreads.server.ts`.
- **Integration:** `src/lib/viewerDiscovery.server.ts`.

**Not Analyzed (Inferred):**
- **Test Suites:** `tests/` (verified config exists, but didn't read individual tests).
- **Tooling:** `.codex/skills/codex-cli.py` (ignored by tool settings, context implies it's a helper script).
- **Public Assets:** `public/` (assumed static assets).

## 2. Repository Map

**`codex-session-view` (Root Unit)**
- **Type:** Full-Stack Web Application (Monolith).
- **Purpose:** A local-first viewer for AI session logs (from Codex/Gemini CLI) with an embedded AI "Session Coach".

**`src/routes` (Routing Module)**
- **Type:** Glue/Entry.
- **Purpose:** Maps URLs to views and API endpoints via TanStack Router.
- **Surface:** `(site)/viewer`, `(site)/todo`, `/api/chatbot/stream`.
- **Key Deps:** `features/*`.
- **Evidence:** `src/routes/api/chatbot/stream.ts` (API), `src/routes/(site)/viewer/route.tsx` (UI).

**`src/features` (Domain Modules)**
- **`viewer`**: Core domain. Handles session export, timeline visualization, and search.
- **`chatbot`**: AI assistant logic. Handles context building, misalignment detection, and runtime configuration.
- **`todos`**: Task management. Wraps server functions in a syncable collection.
- **Evidence:** `src/features/viewer/viewer.loader.ts`, `src/features/chatbot/chatbot.runtime.ts`, `src/features/todos/collection.ts`.

**`src/server` (Backend Module)**
- **Type:** Logic/Persistence (Server-Side).
- **Purpose:** Implements Server Functions (RPC) and API handlers.
- **`function/`**: Public server functions (RPC) exposed to client.
- **`persistence/`**: Low-level data access (JSON files, In-Memory Collections).
- **`lib/`**: Utilities (AI Runtime, FS Discovery).
- **Evidence:** `src/server/function/sessionDiscovery.ts`, `src/server/persistence/chatThreads.server.ts`, `src/server/lib/aiRuntime.ts`.

**`src/db` (Client Persistence)**
- **Type:** Adapter.
- **Purpose:** Browser-side storage for session snapshots.
- **Evidence:** `src/db/sessionSnapshots.ts` (uses `localStorage`).

**`src/stores` (Client State)**
- **Type:** State Management.
- **Purpose:** UI state (Zustand) for settings, preferences, and transient data.
- **Evidence:** `src/stores/uiSettingsStore.ts`.

## 3. Module Table

| Unit/Module | Type | Responsibilities | Inputs -> Outputs | State Owned | Side Effects | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Viewer Discovery** | Infra/Adapter | Scans file system for session logs. | FS Paths -> `ProjectDiscoverySnapshot` | None (Stateless read) | File System Read | `src/server/lib/viewer-types/viewerDiscovery.server.ts` |
| **Chatbot API** | Glue/Controller | Handles streaming chat requests. | JSON Payload -> SSE Stream | None | Calls LLM APIs | `src/routes/api/chatbot/stream.ts` |
| **AI Runtime** | Domain Service | Manages LLM context & prompting. | History/Context -> Text Stream | None | Vercel AI SDK calls | `src/server/lib/aiRuntime.ts` |
| **Chat Threads** | Persistence | Stores AI chat history. | Thread Operations -> `ChatThreadRecord` | `data/chat-threads.json` | File Write (JSON) | `src/server/persistence/chatThreads.server.ts` |
| **Todos** | Domain/Persistence | Manages todo items. | CRUD -> `Todo` | `data/todos.json` | File Write (JSON) | `src/server/persistence/todosStore.ts` |
| **Session Snapshots** | Client Persistence | Caches session data in browser. | Snapshot -> LocalStorage | `localStorage` | Browser Storage | `src/db/sessionSnapshots.ts` |
| **UI Settings** | Client State | Manages view preferences. | Actions -> State | `localStorage` / Zustand | None | `src/stores/uiSettingsStore.ts` |

## 4. Dependency Edge List

- **`src/routes/api/chatbot/stream.ts` -> `src/server/chatbot-api.server.ts`**
  - **Justification:** Route handler delegates logic to the API implementation.
  - **Evidence:** `import { streamChatFromPayload } from '~/server/chatbot-api.server'` in `src/routes/api/chatbot/stream.ts`.

- **`src/server/chatbot-api.server.ts` -> `src/server/lib/aiRuntime.ts`**
  - **Justification:** API handler uses the AI runtime to generate responses.
  - **Evidence:** `import { ... } from '~/server/lib/aiRuntime'` in `src/server/chatbot-api.server.ts`.

- **`src/features/todos/collection.ts` -> `src/server/function/todos.ts`**
  - **Justification:** Client-side collection wraps server functions for data sync.
  - **Evidence:** `import { createTodo, ... } from '~/server/function/todos'` in `src/features/todos/collection.ts`.

- **`src/server/function/sessionDiscovery.ts` -> `src/server/lib/viewerDiscovery.server.ts`**
  - **Justification:** Server function calls the library to perform file system discovery.
  - **Evidence:** Dynamic import in `createServerOnlyFn` in `src/server/function/sessionDiscovery.ts`.

- **`src/server/persistence/chatThreads.server.ts` -> `data/chat-threads.json`**
  - **Justification:** Persistence layer reads/writes to a JSON file in the project root's data dir.
  - **Evidence:** `const CHAT_THREADS_FILE = path.join(DATA_DIR, 'chat-threads.json')`.

## 5. Data & Control Flow Narratives

**Flow 1: Session Discovery (Local-First Read)**
1.  **Entry:** User loads the Viewer page. `src/routes/(site)/viewer/route.tsx` triggers a loader.
2.  **Server Function:** The loader calls `runSessionDiscovery()` (`src/server/function/sessionDiscovery.ts`).
3.  **Discovery:** On the server, this calls `discoverProjectAssets()` in `src/lib/viewerDiscovery.server.ts`.
4.  **IO:** It scans `~/.codex/sessions` and `~/.gemini/tmp` using `fast-glob`.
5.  **Output:** Returns a list of available session files (`.jsonl`, `.ndjson`) to the client.

**Flow 2: AI Chat Stream (Hybrid API)**
1.  **Input:** User types a message in `ViewerChatView` (`src/routes/(site)/viewer/chat.tsx`).
2.  **Request:** `chatbot.runtime.ts` calls `fetch('/api/chatbot/stream', { method: 'POST', body: ... })`.
3.  **Route:** `src/routes/api/chatbot/stream.ts` intercepts the request.
4.  **Processing:** Delegates to `streamChatFromPayload` in `src/server/chatbot-api.server.ts`.
5.  **Runtime:** `resolveModelForMode` selects the provider (Gemini/OpenAI/Codex-CLI). `aiRuntime.ts` calls `streamText`.
6.  **Output:** SSE stream is returned to the client and rendered via `ai` SDK hooks.

**Flow 3: Persistence (JSON-DB)**
1.  **Trigger:** A new chat thread is created or updated.
2.  **Logic:** `src/server/persistence/chatThreads.server.ts` updates the in-memory `@tanstack/db` collection.
3.  **Persist:** `schedulePersist()` is called, which appends a write operation to a promise chain.
4.  **Write:** `fs.writeFile` dumps the entire collection to `data/chat-threads.json`.

## 6. Boundary Problems & Refactor Candidates

**1. JSON-DB Scalability Risk**
- **Issue:** `src/server/persistence/chatThreads.server.ts` writes the *entire* dataset to disk on every change.
- **Impact:** High IO overhead as history grows; potential race conditions if multiple processes/workers access it (though likely single-process for this CLI tool).
- **Target:** Move to SQLite or an append-only log format if data grows.
- **Evidence:** `fs.writeFile(CHAT_THREADS_FILE, JSON.stringify(snapshot))` in `schedulePersist`.

**2. Hardcoded Discovery Paths**
- **Issue:** `src/lib/viewer-types/viewerDiscovery.server.ts` hardcodes `~/.codex/sessions` and `~/.gemini/tmp`.
- **Impact:** Limited utility if users store sessions elsewhere.
- **Target:** Make discovery paths configurable via `uiSettingsStore` or environment variables.
- **Evidence:** `getExternalSessionDirectories` function explicitly lists these paths.

## 7. System Archetype & Naming

**Archetype:** **Local-First Developer Tool / Dashboard**.
- It behaves like a desktop app served via the browser (e.g., Drizzle Studio, Prisma Studio). It relies on local file system access (`node:fs`) and local storage, avoiding external database dependencies for its primary function.

**Analogies:**
1.  **"Storybook for AI Sessions"**: Just as Storybook visualizes components from the repo, this visualizes AI session logs from the local environment.
2.  **"Prisma Studio"**: A local web interface wrapping a database/data-source (in this case, JSONL files) for inspection and management.
3.  **"DevTools Extension"**: It acts as a specialized debugger for the Codex/Gemini CLI ecosystem.
