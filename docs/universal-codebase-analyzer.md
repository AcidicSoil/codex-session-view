Using skill: universal-codebase-analyzer (repo deconstruction with evidence anchors).

**1) Coverage & Limits**

- Observed: repo tree (depth 3), core runtime files (`package.json`, `src/start.ts`, `src/entry-client.tsx`, `src/router.tsx`, `src/routes/**`), viewer discovery/persistence (`src/lib/viewer-types/**`, `src/lib/viewerDiscovery.server.ts`, `src/server/persistence/**`), chatbot runtime (`src/server/chatbot-api/**`, `src/server/chatbot-api.server.ts`, `src/server/lib/aiRuntime.ts`), todos feature (`src/features/todos/**`, `src/server/function/todos.ts`), session upload watcher (`src/server/lib/sessionUploadWatchers.server.ts`), session repo context (`src/server/function/sessionRepoContext*.ts`).
- Not observed in depth: most UI components under `src/components/**`, viewer UI submodules under `src/features/viewer/**` beyond loader/search, config files (`vite.config.ts`, `nitro.config.ts`, `vercel.json`), tests and e2e behavior. Treat UI behavior beyond routes and loaders as Unknown.

**2) Repository Map (Hierarchical)**

- Unit: `codex-session-view` (single web app)
  - **App Shell (Glue/Orchestration)**
    - Purpose: TanStack Start app bootstrap + router + SSR hydration.
    - Public surface: app entry + routing.
    - Key deps: `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-query`.
    - Evidence: `src/start.ts` `createStart`; `src/router.tsx` `createRouter`; `src/entry-client.tsx` `StartClient`.
  - **Site Routes (Adapter/UI)**
    - Purpose: UI pages for home, docs, todo, viewer.
    - Public surface: `/`, `/docs`, `/todo`, `/viewer`, `/viewer/chat`, `/viewer/inspector`.
    - Key deps: TanStack Router.
    - Evidence: `src/routes/(site)/index.tsx` `createFileRoute('/(site)/')`; `src/routes/(site)/docs.tsx`; `src/routes/(site)/todo/index.tsx`; `src/routes/(site)/viewer/route.tsx`, `src/routes/(site)/viewer/index.tsx`, `src/routes/(site)/viewer/chat.tsx`, `src/routes/(site)/viewer/inspector.tsx`.
  - **API Routes (Adapter)**
    - Purpose: HTTP handlers for test, chatbot, session repo context, uploads (incl. SSE watch).
    - Public surface: `/api/test` (GET/POST), `/api/chatbot/stream` (POST NDJSON), `/api/chatbot/analyze` (POST), `/api/session/repo-context` (POST), `/api/uploads/` (POST), `/api/uploads/$uploadId` (GET), `/api/uploads/$uploadId/watch` (GET SSE).
    - Evidence: `src/routes/api/test.ts` `handlers.GET/POST`; `src/routes/api/chatbot/stream.ts`; `src/routes/api/chatbot/analyze.ts`; `src/routes/api/session/repo-context.ts`; `src/routes/api/uploads/index.ts`; `src/routes/api/uploads/$uploadId.ts`; `src/routes/api/uploads/$uploadId.watch.ts`.
  - **Viewer Feature (Domain + Glue + Utility)**
    - Purpose: session discovery, session asset inventory, viewer state.
    - Public surface: loader/search helpers + UI views.
    - Key deps: server functions (`runSessionDiscovery`, `fetchChatbotState`, `fetchRuleInventory`), TanStack Router search params.
    - Evidence: `src/features/viewer/viewer.loader.ts` `viewerLoader`; `src/features/viewer/viewer.search.ts` `parseViewerSearch`, `applyViewerSearchUpdates`; `src/routes/(site)/viewer/route.tsx` `viewerLoader`.
  - **Session Discovery & Asset Index (Domain/Utility)**
    - Purpose: discover project files and session assets (bundled/external/uploads), track discovery stats/inputs.
    - Public surface: `discoverProjectAssets()` and snapshot types.
    - Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts` `discoverProjectAssets`, `import.meta.glob`, `synchronizeBundledSessions`, `synchronizeExternalSessions`; `src/lib/viewer-types/viewerDiscovery.ts` `ProjectDiscoverySnapshot`.
  - **Chatbot Runtime (Domain + Infra)**
    - Purpose: AI chat streaming, analysis, context building, misalignment detection, history persistence.
    - Public surface: `streamChatFromPayload`, `analyzeChatFromPayload`.
    - Key deps: AI SDK (`ai`), model config, server persistence stores.
    - Evidence: `src/server/chatbot-api.server.ts` `streamChatFromPayload`, `analyzeChatFromPayload`; `src/server/chatbot-api/stream.ts` `handleSessionChatStream`, `handleGeneralChatStream`; `src/server/lib/aiRuntime.ts` `streamText`.
  - **Todos Feature (Domain + Adapter)**
    - Purpose: simple todo CRUD via server functions + TanStack DB query collection.
    - Public surface: `getTodos`, `createTodo`, `toggleTodo`, `deleteTodo`.
    - Evidence: `src/features/todos/collection.ts` `queryCollectionOptions`; `src/server/function/todos.ts` `createServerFn` handlers; `src/server/persistence/todosStore.ts`.
  - **Local Persistence Stores (Infra)**
    - Purpose: in-memory/local-only collections and file-backed snapshots (chat messages).
    - Public surface: stores for chat messages, threads, misalignments, session uploads, repo bindings, todos, UI settings.
    - Evidence: `src/server/persistence/chatMessages.server.ts` `localOnlyCollectionOptions` + `data/chat-messages.json`; `src/server/persistence/misalignments.ts`; `src/server/persistence/sessionUploads.server.ts`; `src/server/persistence/sessionRepoBindings.ts`; `src/server/persistence/todosStore.ts`.
  - **Upload Watchers (Infra)**
    - Purpose: SSE feed for file-backed session uploads.
    - Public surface: `subscribeToUploadWatcher`.
    - Evidence: `src/server/lib/sessionUploadWatchers.server.ts` `UploadWatcher`, `fs.watch`.

**3) Module Table**

| Unit/Module | Type | Responsibilities | Inputs → Outputs | State owned | Side effects | Extensibility points | Boundary issues | Evidence |
|---|---|---|---|---|---|---|---|---|
| App Shell | Glue | App bootstrap, router + SSR hydration | Route tree → rendered UI | Router context (QueryClient) | Client hydration, global error listeners | Route tree (`routeTree.gen`) | Unknown (routeTree not inspected) | `src/start.ts` `createStart`; `src/router.tsx` `createRouter`; `src/entry-client.tsx` `hydrateRoot` |
| Site Routes | Adapter/UI | Pages for home/docs/todo/viewer | URL → component | None observed | UI render | TanStack Router file routes | None observed | `src/routes/(site)/**` `createFileRoute` |
| API Routes | Adapter | HTTP handlers for test/chatbot/uploads/session repo context | HTTP request → JSON/stream/SSE | None | Network responses, file reads, watchers | Add new route file | None observed | `src/routes/api/**` |
| Viewer Loader | Glue | Assemble discovery snapshot + chatbot/rules + UI settings | Request/search params → loader data | None | server function calls, logging | Search params helpers | None observed | `src/features/viewer/viewer.loader.ts` `viewerLoader` |
| Session Discovery | Domain/Utility | Discover project files + session assets | FS + glob patterns → `ProjectDiscoverySnapshot` | None | File system reads, upload store writes | Glob patterns constants | Unknown for large repos | `src/lib/viewer-types/viewerDiscovery.server.ts` `discoverProjectAssets` |
| Session Uploads | Infra | Store uploaded/ingested sessions, refresh from disk | Upload payload/file → summary/content | `session-uploads-store` | Reads/writes FS | `ensureSessionUploadForFile` | Potential mismatch if file changes during refresh (inferred) | `src/server/persistence/sessionUploads.server.ts` |
| Upload Watcher | Infra | SSE updates for upload changes | File system events → SSE events | Watcher registry | `fs.watch`, SSE stream | New listeners | None observed | `src/server/lib/sessionUploadWatchers.server.ts` |
| Chatbot API | Domain/Infra | Stream chat responses, analyze session chats | Chat payload → NDJSON/JSON | Chat messages + misalignments + threads | AI provider calls, persistence writes | Model/provider registry | Provider availability handling only in code (Observed) | `src/server/chatbot-api.server.ts`; `src/server/chatbot-api/stream.ts`; `src/server/lib/aiRuntime.ts` |
| Todos | Domain | CRUD todo records | Server fn input → Todo records | `todos-store` | Collection writes | None | No persistence beyond runtime (Inferred) | `src/server/function/todos.ts`; `src/server/persistence/todosStore.ts` |
| Chat History Store | Infra | Persist chat messages to disk | Chat messages → JSON file | `chat-messages-store` | Writes `data/chat-messages.json` | None | File corruption handling is best-effort (Observed) | `src/server/persistence/chatMessages.server.ts` |

**4) Dependency Edge List**

- Routes → Viewer Loader
  Evidence: `src/routes/(site)/viewer/route.tsx` uses `viewerLoader`.
- Viewer Loader → Session Discovery
  Evidence: `src/features/viewer/viewer.loader.ts` calls `runSessionDiscovery`.
- `runSessionDiscovery` → Discovery implementation
  Evidence: `src/server/function/sessionDiscovery.ts` loads `sessionDiscovery.server`; `src/server/function/sessionDiscovery.server.ts` calls `discoverProjectAssets`.
- Discovery → Session Uploads
  Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts` `ensureSessionUploadForFile` (imported via `ensureSessionUploadsModule` in same file).
- Upload Watcher API → Upload Watcher
  Evidence: `src/routes/api/uploads/$uploadId.watch.ts` imports `subscribeToUploadWatcher`.
- Upload Watcher → Session Uploads
  Evidence: `src/server/lib/sessionUploadWatchers.server.ts` calls `refreshSessionUploadFromSource`, `getSessionUploadSummaryById`.
- Chatbot API Route → Chatbot API server
  Evidence: `src/routes/api/chatbot/stream.ts` imports `~/server/chatbot-api.server`.
- Chatbot Stream → AI Runtime + Persistence
  Evidence: `src/server/chatbot-api/stream.ts` calls `generateSessionCoachReply`, `appendChatMessage`, `ingestMisalignmentCandidates`.
- Todos UI → Todos Collection → Server Functions
  Evidence: `src/routes/(site)/todo/index.tsx` uses `createTodoAndSync` etc; `src/features/todos/collection.ts` calls `createTodo`, `toggleTodo`, `deleteTodo`.

**5) Data & Control Flow Narratives**

- Viewer page load (Observed)
  1) Route `/viewer` triggers loader → `viewerLoader`.
     Evidence: `src/routes/(site)/viewer/route.tsx` `loader: viewerLoader`.
  2) Loader calls `runSessionDiscovery` and logs stats.
     Evidence: `src/features/viewer/viewer.loader.ts` `runSessionDiscovery`.
  3) Discovery scans project/session paths and syncs session uploads.
     Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts` `discoverProjectAssets`, `synchronizeBundledSessions`, `synchronizeExternalSessions`.
  4) Loader fetches chatbot state, rule inventory, and UI settings.
     Evidence: `src/features/viewer/viewer.loader.ts` `fetchChatbotState`, `fetchRuleInventory`, `loadUiSettings`.
- Upload POST (Observed)
  1) Client POST `/api/uploads/` with filename/content.
     Evidence: `src/routes/api/uploads/index.ts` `handlers.POST`.
  2) Server validates payload, calls `saveSessionUpload`.
     Evidence: `src/routes/api/uploads/index.ts`; `src/server/persistence/sessionUploads.server.ts` `saveSessionUpload`.
  3) Upload stored in `session-uploads-store` and response includes `/api/uploads/{id}` URL.
     Evidence: `src/server/persistence/sessionUploads.server.ts` `toRecordView` builds URL.
- Upload watch SSE (Observed)
  1) Client GET `/api/uploads/$uploadId/watch` opens SSE.
     Evidence: `src/routes/api/uploads/$uploadId.watch.ts` `handlers.GET`.
  2) Server subscribes to watcher and sends heartbeat + update events.
     Evidence: `src/routes/api/uploads/$uploadId.watch.ts` `ReadableStream` + `subscribeToUploadWatcher`; `src/server/lib/sessionUploadWatchers.server.ts`.
  3) On FS change, watcher refreshes upload content and emits update.
     Evidence: `src/server/lib/sessionUploadWatchers.server.ts` `fs.watch` → `refreshSessionUploadFromSource`.
- Chatbot streaming (Observed)
  1) Client POST `/api/chatbot/stream` with prompt payload.
     Evidence: `src/routes/api/chatbot/stream.ts`.
  2) `streamChatFromPayload` validates input and resolves model.
     Evidence: `src/server/chatbot-api.server.ts` `streamInputSchema`, `resolveModelForMode`.
  3) Session chat builds context, persists user message, detects misalignments, then streams AI reply and persists assistant response.
     Evidence: `src/server/chatbot-api/stream.ts` `buildChatContext`, `appendChatMessage`, `detectMisalignments`, `generateSessionCoachReply`, `createNdjsonStream`.
- Todos (Observed)
  1) `/todo` loader preloads TanStack DB query collection.
     Evidence: `src/routes/(site)/todo/index.tsx` `preloadTodosCollection`.
  2) UI uses live query for todos.
     Evidence: `src/routes/(site)/todo/index.tsx` `useLiveSuspenseQuery`.
  3) Create/toggle/delete calls server functions and writes through collection utils.
     Evidence: `src/features/todos/collection.ts` `createTodoAndSync`, `toggleTodoAndSync`, `deleteTodoAndSync`; `src/server/function/todos.ts`.

**6) Boundary Problems & Refactor Candidates**

- Inferred: Mixed persistence strategies (local-only collections vs. file-backed chat history) could lead to inconsistent state durability across features.
  Impact: debugging/state recovery risk; scope: persistence layer.
  Evidence: `src/server/persistence/chatMessages.server.ts` writes to `data/chat-messages.json`, while `src/server/persistence/todosStore.ts` and `src/server/persistence/misalignments.ts` use `localOnlyCollectionOptions` without file persistence.
- Observed: Upload watcher uses `fs.watch` with SSE, but no explicit backpressure or reconnect state is exposed in API response.
  Impact: potential event loss for rapid updates; scope: `sessionUploadWatchers`.
  Evidence: `src/server/lib/sessionUploadWatchers.server.ts` `fs.watch` + `ReadableStream` in `src/routes/api/uploads/$uploadId.watch.ts`.
- Unknown: Viewer UI modules likely implement heavy UI logic; not inspected for size/responsibility boundaries.
  Evidence: modules under `src/features/viewer/**` not opened.

**7) System Archetype & Naming**

- **Observed**: Web application built with TanStack Start/Router/Query and TanStack DB.
  Evidence: `package.json` dependencies, `src/start.ts`, `src/router.tsx`.
- **Inferred**: “Local-first session viewer with AI-powered chat assistant” (viewer discovery + session uploads + chatbot streaming).
  Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts` `discoverProjectAssets`; `src/routes/api/chatbot/stream.ts` + `src/server/chatbot-api/stream.ts`.
- Analogy (Observed/Inferred mix):
  - “Session log explorer + assistant” similar to a local log viewer with AI commentary.
  - “Local workspace asset indexer” using globbing + session upload persistence.
  Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts`, `src/server/persistence/sessionUploads.server.ts`, `src/server/chatbot-api/stream.ts`.

End of analysis.
