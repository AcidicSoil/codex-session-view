Using skill: codebase-domain-architecture-deconstructor.

Below is the requested evidence-anchored architecture deconstruction report.

## Coverage & Limits
Observed artifacts:
- Top-level tree (via `fd`), including `src/`, `docs/`, `data/`, `tests/`, `public/`, configs, and package metadata.
- Key entrypoints and routing: `package.json`, `src/start.ts`, `src/entry-client.tsx`, `src/router.tsx`, `src/routes/__root.tsx`, site + API route files.
- Core features: viewer, chatbot, todos.
- Server layers: `src/server/chatbot-api/*`, `src/server/function/*`, `src/server/lib/*`, `src/server/persistence/*`.
- Core libraries: session parser, viewer discovery, AI config/client, repo metadata, session models, UI settings.

Not observed / not provided:
- `references/evidence-format.md` is missing (no formatting contract file found).
- Generated router tree file contents (e.g., `src/routeTree.gen` not read).
- Full UI component implementations under `src/components/**` not exhaustively read.
- Deployment/CI/CD config beyond basic Vercel/Nitro/Vite files.
- Database migrations or external DB integrations (none surfaced in code reviewed).

Constraints:
- Evidence format is inferred as `Evidence: path: symbols` due to missing `references/evidence-format.md`.

---

# 1) Repository Map (hierarchical)

- **App Bootstrap & Router**
  - Purpose: TanStack Start app initialization, client hydration, router creation.
  - Responsibilities: initialize Start instance, create router, hydrate UI, wire SSR query integration.
  - Public surface: `startInstance`, `getRouter`, client hydration execution.
  - Evidence: `src/start.ts: createStart`, `src/router.tsx: getRouter, createRouter`, `src/entry-client.tsx: hydrateRoot, StartClient`.

- **Root Route + Global UI Shell**
  - Purpose: app shell with head metadata, styles, theme init, error boundaries.
  - Responsibilities: global layout, SEO meta, theme hydration, devtools.
  - Public surface: root route definition.
  - Evidence: `src/routes/__root.tsx: createRootRouteWithContext, RootDocument, RootComponent`.

- **Site Routes (Landing/Docs/Todo/Viewer)**
  - Purpose: user-facing pages.
  - Responsibilities: route wiring and UI composition.
  - Public surface: TanStack file routes.
  - Evidence: `src/routes/(site)/index.tsx: createFileRoute`, `src/routes/(site)/todo/index.tsx: createFileRoute`, `src/routes/(site)/viewer/route.tsx: createFileRoute`.

- **Viewer Feature (Session Viewer)**
  - Purpose: load, explore, and inspect session files; sync UI state; drive chat tooling.
  - Responsibilities: loader data, search params, discovery, upload/live watcher, workspace context, inspector/chat views.
  - Public surface: viewer route loader, workspace context/hooks, views.
  - Evidence: `src/features/viewer/viewer.loader.ts: viewerLoader`, `src/features/viewer/viewer.workspace.tsx: ViewerWorkspaceProvider`, `src/features/viewer/views/ViewerExplorerView.tsx`, `src/features/viewer/views/ViewerChatView.tsx`.

- **Session Discovery & Asset Indexing**
  - Purpose: discover project files and session assets (bundled, external, uploads).
  - Responsibilities: glob discovery, external directory scan, asset normalization, upload sync.
  - Public surface: `discoverProjectAssets`, asset types.
  - Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts: discoverProjectAssets`, `src/lib/viewer-types/viewerDiscovery.ts: DiscoveredSessionAsset, sortSessionAssets`.

- **Session Parsing & Models**
  - Purpose: parse session files and define session domain models.
  - Responsibilities: streaming parser, session meta/events, misalignment/chat schemas.
  - Public surface: parser generators, model types.
  - Evidence: `src/lib/session-parser/streaming.ts: streamParseSession`, `src/lib/sessions/model.ts: SessionSnapshot, MisalignmentRecord`.

- **Chatbot Feature (Context + Misalignment Detection)**
  - Purpose: build AI prompt context and detect misalignments against agent rules.
  - Responsibilities: context section composition, budget enforcement, misalignment detection.
  - Public surface: `buildChatContext`, misalignment tools.
  - Evidence: `src/features/chatbot/context-builder.ts: buildChatContext`, `src/features/chatbot/misalignment-detector.ts` (referenced in server code).

- **Chatbot API (Streaming + Analysis)**
  - Purpose: HTTP handlers for chat streaming and analysis workflows.
  - Responsibilities: validate inputs, build context, run AI, stream NDJSON, persist messages.
  - Public surface: handler functions used by API routes.
  - Evidence: `src/server/chatbot-api/stream.ts: handleSessionChatStream, handleGeneralChatStream`, `src/server/chatbot-api/analyze.ts: handleAnalyzeChat`.

- **AI Runtime + Providers**
  - Purpose: abstract AI providers and run chat/analysis flows.
  - Responsibilities: provider resolution, system prompts, runtime streaming.
  - Public surface: `generateSessionCoachReply`, `runGeneralChatTurn`, provider resolution.
  - Evidence: `src/server/lib/aiRuntime.ts: generateSessionCoachReply`, `src/server/lib/aiRuntime.providers.ts: resolveProvider`.

- **Server Functions (TanStack Start server FNs)**
  - Purpose: RPC-style server functions for viewer, chatbot, todos, settings, hookify.
  - Responsibilities: wrap server-only logic, validation, routing.
  - Public surface: `createServerFn` exports.
  - Evidence: `src/server/function/sessionDiscovery.ts: runSessionDiscovery`, `src/server/function/chatbotState.ts: fetchChatbotState`, `src/server/function/todos.ts: createTodo/getTodos`.

- **Persistence (Local Collections + Disk Snapshots)**
  - Purpose: store chat threads/messages, misalignments, uploads, UI settings, todos.
  - Responsibilities: in-memory/local-only collections + JSON file persistence for chat.
  - Public surface: CRUD functions for each store.
  - Evidence: `src/server/persistence/chatMessages.server.ts: chatMessagesCollection`, `src/server/persistence/chatThreads.server.ts`, `src/server/persistence/sessionUploads.server.ts`, `src/server/persistence/uiSettingsStore.ts`, `src/server/persistence/todosStore.ts`.

- **Hookify (Rule Gate for Chat Additions)**
  - Purpose: evaluate AGENT rules before adding content to chat.
  - Responsibilities: rule evaluation, decision recording, prefill creation.
  - Public surface: `hookifyAddToChat` server fn and evaluation runtime.
  - Evidence: `src/server/lib/hookifyRuntime.ts: evaluateAddToChatContent`, `src/server/function/hookifyAddToChat.server.ts: handleHookifyAddToChatServer`.

- **Viewer API Endpoints**
  - Purpose: HTTP endpoints for uploads, SSE watcher, repo context, chatbot.
  - Responsibilities: request validation, file upload, SSE stream, route-level handlers.
  - Public surface: `/api/uploads/*`, `/api/session/repo-context`, `/api/chatbot/*`.
  - Evidence: `src/routes/api/uploads/index.ts: POST handler`, `src/routes/api/uploads/$uploadId.watch.ts: SSE GET handler`, `src/routes/api/session/repo-context.ts: POST handler`, `src/routes/api/chatbot/stream.ts: POST handler`.

- **UI State Store**
  - Purpose: client UI state and persistence layer.
  - Responsibilities: hydrate from server/localStorage, persist to server, UI actions.
  - Public surface: `useUiSettingsStore`.
  - Evidence: `src/stores/uiSettingsStore.ts: useUiSettingsStore, persistUiSettings`.

- **Utilities, Config, Logging**
  - Purpose: shared helpers, environment config, structured logging.
  - Responsibilities: env schema, logging adapters, id generation.
  - Public surface: logger exports, env config.
  - Evidence: `src/env/server.ts: createEnv`, `src/lib/logger.ts`, `src/utils/id-generator.ts`.

---

# 2) Module Table (one row per module)

| Module | Type | Purpose | Key Dependencies | Main Inputs -> Outputs | Extensibility Points | Boundary Notes | Evidence |
|---|---|---|---|---|---|---|---|
| App Bootstrap & Router | Glue | Initialize Start app and router | TanStack Start/Router, Query | App config -> Router instance | Router context, default components | Central composition root | Evidence: `src/start.ts: createStart`, `src/router.tsx: createRouter` |
| Root Route Shell | Glue | Global HTML shell, meta, theme | Theme, SEO, styles | Route loader data -> HTML shell | Head/meta and theme hooks | UI shell + routing concerns combined | Evidence: `src/routes/__root.tsx: RootDocument, getTheme` |
| Site Routes | Glue | File-based routing for pages | TanStack Router, UI components | URL -> page component | Add new file routes | Simple route-to-component glue | Evidence: `src/routes/(site)/index.tsx: createFileRoute`, `src/routes/(site)/todo/index.tsx` |
| Viewer Feature | Domain | Session viewer UX & state coordination | Loader, discovery, stores | Loader snapshot + URL search -> viewer UI | Viewer views/components | Couples UI + orchestration; heavy coordinator | Evidence: `src/features/viewer/viewer.workspace.tsx: ViewerWorkspaceProvider` |
| Session Discovery | Infra | Discover project + session assets | fs, fast-glob, upload store | Filesystem/globs -> discovery snapshot | Env-based dirs | Server-only file I/O inside lib layer | Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts: discoverProjectAssets` |
| Session Parser & Models | Domain | Parse session files and represent events | Parser validators | JSONL/NDJSON -> events/meta | Parser options (max errors) | Parser + model types adjacent | Evidence: `src/lib/session-parser/streaming.ts: streamParseSession`, `src/lib/sessions/model.ts` |
| Chatbot Feature (Context/Misalignment) | Domain | Build context & detect rule issues | Agent rules, session model | Snapshot + rules -> prompt sections, misalignments | Configurable token budget | Pure domain logic + detection | Evidence: `src/features/chatbot/context-builder.ts: buildChatContext` |
| Chatbot API | Adapter | Stream/Analyze chat over HTTP | AI runtime, persistence | HTTP payload -> NDJSON/JSON Response | Analysis types, tools | Controller mixes IO + domain orchestration | Evidence: `src/server/chatbot-api/stream.ts: handleSessionChatStream`, `src/server/chatbot-api/analyze.ts` |
| AI Runtime & Providers | Infra | Model/provider resolution, text streaming | ai SDK, provider adapters | Chat options -> stream/analysis | Provider factories | Infra with env coupling | Evidence: `src/server/lib/aiRuntime.ts: generateSessionCoachReply`, `src/server/lib/aiRuntime.providers.ts: resolveProvider` |
| Server Functions | Glue | RPC wrappers around server logic | createServerFn, zod | Input payload -> handler result | Add new server fn | Thin wrappers; some validation | Evidence: `src/server/function/chatbotState.ts: fetchChatbotState`, `src/server/function/todos.ts` |
| Persistence Layer | Infra | Local stores + disk hydration | TanStack DB, fs | CRUD inputs -> stored records | Collection ids, schemas | Memory + disk responsibilities mixed | Evidence: `src/server/persistence/chatMessages.server.ts`, `src/server/persistence/sessionUploads.server.ts` |
| Hookify (Rule Gate) | Domain | Evaluate AGENT rules for chat actions | Misalignment detector | Content + rules -> decision | Blocking severity list | Domain + persistence interface | Evidence: `src/server/lib/hookifyRuntime.ts: evaluateAddToChatContent` |
| Viewer API Endpoints | Adapter | Uploads, SSE watcher, repo binding | Server persistence, watchers | HTTP -> Response/SSE | Add endpoints | Route-level handlers own validation | Evidence: `src/routes/api/uploads/$uploadId.watch.ts`, `src/routes/api/session/repo-context.ts` |
| UI Settings Store | Utility | Client UI state + persistence | zustand, server fn | UI events -> state snapshot | Snapshot schema | Client state writes to server | Evidence: `src/stores/uiSettingsStore.ts: useUiSettingsStore` |
| Todos Feature | Domain | Demo feature using TanStack DB | Server fn, query collection | UI actions -> todos | Collection + server fn | Sample domain thin | Evidence: `src/features/todos/collection.ts: getTodosCollection`, `src/server/function/todos.ts` |

---

# 3) Agent-Centric Component Map (if applicable)

**Memory**
- Components found: chat messages/threads store, misalignments store, session uploads store, UI settings store, hookify decisions store.
- State owned: chat history, thread metadata, misalignments, uploads, UI preferences, hook decisions.
- Invocation path: server functions + chatbot API + viewer loader/store hydration.
- Evidence: `src/server/persistence/chatMessages.server.ts: chatMessagesCollection`, `src/server/persistence/chatThreads.server.ts`, `src/server/persistence/misalignments.ts`, `src/server/persistence/sessionUploads.server.ts`, `src/server/persistence/uiSettingsStore.ts`, `src/server/persistence/hookifyDecisions.server.ts`.

**Planning**
- Components found: None evidenced.
- Missing evidence: planner/scheduler/router policy modules or task planning logic.
- Evidence: Missing evidence: `planner`, `scheduler`, `policy` modules in `src/**`.

**Evaluation/Reasoning**
- Components found: misalignment detection and Hookify evaluation, session analysis flow.
- State owned: misalignment records + severity/decision metadata.
- Invocation path: chat stream + hookify server fn + analyze endpoint.
- Evidence: `src/features/chatbot/misalignment-detector.ts`, `src/server/lib/hookifyRuntime.ts: evaluateAddToChatContent`, `src/server/chatbot-api/analyze.ts: handleAnalyzeChat`.

**Communication/Adapters**
- Components found: HTTP API routes, SSE upload watcher, AI provider adapters.
- State owned: streaming responses, provider configuration.
- Invocation path: `/api/*` routes -> server handlers -> providers.
- Evidence: `src/routes/api/uploads/$uploadId.watch.ts: SSE`, `src/routes/api/chatbot/stream.ts`, `src/server/lib/aiRuntime.providers.ts`.

**Tooling/Utilities**
- Components found: timeline tools for AI, NDJSON stream builder, session parser.
- State owned: tool context, NDJSON stream formatting.
- Invocation path: chatbot stream -> createTimelineTools -> AI runtime.
- Evidence: `src/server/lib/tools/timelineTools.ts`, `src/server/lib/chatStream/ndjsonStream.ts`, `src/lib/session-parser/streaming.ts`.

---

# 4) Data & Control Flow

**Happy path narrative**
1) User navigates to Viewer route, triggering loader to discover assets and load chatbot state + rule inventory + UI settings.
   Evidence: `src/routes/(site)/viewer/route.tsx: loader: viewerLoader`, `src/features/viewer/viewer.loader.ts: runSessionDiscovery, fetchChatbotState, fetchRuleInventory, loadUiSettings`.

2) Discovery snapshot provides session assets; UI lists them and opens selected session by fetching upload URL.
   Evidence: `src/features/viewer/viewer.discovery.section.tsx: onSessionOpen`, `src/routes/api/uploads/$uploadId.ts: GET handler`.

3) Session file is parsed client-side and used to populate timeline/inspector view and chat context.
   Evidence: `src/lib/session-parser/streaming.ts: streamParseSession`, `src/features/viewer/viewer.workspace.chat.ts: sessionEvents from sessionCoachState`.

4) User adds a timeline event or session to chat; Hookify evaluates AGENT rules and either blocks or pre-fills prompt.
   Evidence: `src/features/viewer/viewer.workspace.chat.ts: runHookifyPrefill`, `src/server/function/hookifyAddToChat.server.ts: handleHookifyAddToChatServer`.

5) Chat streaming request hits `/api/chatbot/stream`, which builds context, runs AI, and persists messages/misalignments.
   Evidence: `src/routes/api/chatbot/stream.ts: POST handler`, `src/server/chatbot-api/stream.ts: handleSessionChatStream`, `src/server/persistence/chatMessages.server.ts: appendChatMessage`.

6) Live session updates (if backed by source files) are streamed over SSE and refresh loaded session.
   Evidence: `src/routes/api/uploads/$uploadId.watch.ts: SSE handler`, `src/server/lib/sessionUploadWatchers.server.ts: subscribeToUploadWatcher`, `src/features/viewer/viewer.discovery.section.tsx: EventSource`.

**Key touchpoints between modules**
- Viewer loader -> session discovery -> session uploads store.
  Evidence: `src/features/viewer/viewer.loader.ts: runSessionDiscovery`, `src/lib/viewer-types/viewerDiscovery.server.ts: ensureSessionUploadsModule`.
- Chatbot stream -> AI runtime + persistence + misalignment detection.
  Evidence: `src/server/chatbot-api/stream.ts: generateSessionCoachReply, appendChatMessage, detectMisalignments`.

**Persistence / side-effect points**
- Disk: chat messages/threads in `data/` JSON files.
  Evidence: `src/server/persistence/chatMessages.server.ts: CHAT_MESSAGES_FILE`, `src/server/persistence/chatThreads.server.ts: CHAT_THREADS_FILE`.
- Memory/local: TanStack DB local collections.
  Evidence: `src/server/persistence/sessionUploads.server.ts: createCollection`, `src/server/persistence/misalignments.ts`.

**Dependency edge list**
- Viewer Loader -> Session Discovery
  Evidence: `src/features/viewer/viewer.loader.ts: runSessionDiscovery`.
- Session Discovery -> Session Uploads Store
  Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts: ensureSessionUploadsModule`.
- Viewer Workspace -> Hookify Server Fn
  Evidence: `src/features/viewer/viewer.workspace.chat.ts: hookifyAddToChat`.
- Hookify Server Fn -> Hookify Runtime + Repo Roots + Persistence
  Evidence: `src/server/function/hookifyAddToChat.server.ts: evaluateAddToChatContent, resolveRepoRootForAssetPath, recordHookifyDecision`.
- Chatbot API -> AI Runtime + Chat Persistence
  Evidence: `src/server/chatbot-api/stream.ts: generateSessionCoachReply, appendChatMessage`.
- AI Runtime -> Provider Adapters
  Evidence: `src/server/lib/aiRuntime.ts: resolveProvider`, `src/server/lib/aiRuntime.providers.ts: providerFactories`.
- UI Settings Store -> UI Settings Server Persistence
  Evidence: `src/stores/uiSettingsStore.ts: persistUiSettings`, `src/server/persistence/uiSettingsStore.ts`.

---

# 5) Architecture Assessment

**Best-fit archetype**
- Modular monolith (feature-oriented with server adapters and local persistence) with TanStack Start + file-based routing.
  Evidence: `src/routes/**` file routes, `src/features/**` feature folders, `src/server/**` server modules.

**Strengths / constraints implied**
- Strength: Clear separation between UI routes, features, server functions, and persistence collections.
  Evidence: `src/routes/(site)/*`, `src/features/*`, `src/server/function/*`, `src/server/persistence/*`.
- Strength: Server-side asset discovery and SSE watcher enable live session refresh.
  Evidence: `src/lib/viewer-types/viewerDiscovery.server.ts`, `src/routes/api/uploads/$uploadId.watch.ts`.
- Constraint: Some modules combine orchestration + UI state and can grow large (viewer workspace coordinator).
  Evidence: `src/features/viewer/viewer.workspace.tsx: ViewerWorkspaceProvider`.

**Top 5 improvement opportunities (impact / risk / scope / evidence)**
1) **Split Viewer Workspace orchestration into smaller logic modules** (High / Low / Medium)
   Rationale: `ViewerWorkspaceProvider` coordinates discovery, routing, chat, uploads, and state syncing in a single file.
   Evidence: `src/features/viewer/viewer.workspace.tsx: ViewerWorkspaceProvider`.

2) **Isolate persistence + serialization concerns from domain logic** (Medium / Low / Medium)
   Rationale: chat persistence is mixed with file I/O and hydration in store modules.
   Evidence: `src/server/persistence/chatMessages.server.ts: hydrateFromDisk, schedulePersist`.

3) **Extract Hookify flow orchestration to dedicated service layer** (Medium / Low / Medium)
   Rationale: `handleHookifyAddToChatServer` combines repo binding, snapshot loading, evaluation, and persistence.
   Evidence: `src/server/function/hookifyAddToChat.server.ts: handleHookifyAddToChatServer`.

4) **Explicitly version session discovery inputs/outputs** (Medium / Low / Small)
   Rationale: discovery snapshot is critical across viewer; versioning makes it safer to evolve asset schemas.
   Evidence: `src/lib/viewer-types/viewerDiscovery.ts: ProjectDiscoverySnapshot`.

5) **Formalize AI provider configuration surface** (Medium / Medium / Small)
   Rationale: provider settings read from env in `aiRuntime.providers` with runtime defaults; a typed config object would centralize behavior.
   Evidence: `src/server/lib/aiRuntime.providers.ts: readEnvValue, providerFactories`.

---

## File Size & Responsibility Rules Check
No code changes made in this run; no file size/responsibility conflicts introduced.

If you want deeper coverage (e.g., full component tree or session-parser internals), tell me which area to expand.
