1) **Repository Map (hierarchical)**

- App Shell & Routing
  - Purpose: Compose TanStack Start app shell, router, and client hydration.
    Evidence: src/start.ts:{startInstance}
    Evidence: src/router.tsx:{getRouter}
    Evidence: src/entry-client.tsx:{hydrateRoot}
  - Responsibilities: Create router with SSR query integration, mount root route + error/not-found, hydrate client.
    Evidence: src/router.tsx:{getRouter}
    Evidence: src/routes/__root.tsx:{Route, RootComponent, RootDocument}
    Evidence: src/entry-client.tsx:{hydrateRoot}
  - Public surface: Route tree + root document for site rendering.
    Evidence: src/routes/__root.tsx:{Route}

- Viewer Feature (Session Explorer)
  - Purpose: Load discovery snapshot, render session timeline workspace, and coordinate uploads + chat dock.
    Evidence: src/routes/(site)/viewer/route.tsx:{Route}
    Evidence: src/features/viewer/viewer.loader.ts:{viewerLoader}
    Evidence: src/features/viewer/viewer.workspace.tsx:{ViewerWorkspaceProvider}
  - Responsibilities: Loader fetches discovery + chatbot state + rule inventory + UI settings; workspace manages selection, filters, chat wiring.
    Evidence: src/features/viewer/viewer.loader.ts:{viewerLoader}
    Evidence: src/features/viewer/viewer.workspace.tsx:{ViewerWorkspaceProvider}
  - Public surface: Viewer route component and workspace boundary.
    Evidence: src/routes/(site)/viewer/route.tsx:{Route}
    Evidence: src/features/viewer/viewer.page.tsx:{ViewerPage}

- Session Discovery & Uploads
  - Purpose: Discover project/session assets and expose upload/read/watch endpoints.
    Evidence: src/server/function/sessionDiscovery.server.ts:{runSessionDiscoveryServer}
    Evidence: src/lib/viewer-types/viewerDiscovery.server.ts:{discoverProjectAssets}
    Evidence: src/routes/api/uploads/index.ts:{Route}
  - Responsibilities: Import-glob discovery, sync session uploads, serve upload content and SSE watcher.
    Evidence: src/lib/viewer-types/viewerDiscovery.server.ts:{discoverProjectAssets, synchronizeBundledSessions, synchronizeExternalSessions}
    Evidence: src/routes/api/uploads/$uploadId.ts:{Route}
    Evidence: src/routes/api/uploads/$uploadId.watch.ts:{Route}
  - Public surface: `/api/uploads` POST, `/api/uploads/$uploadId` GET, `/api/uploads/$uploadId/watch` SSE.
    Evidence: src/routes/api/uploads/index.ts:{Route}
    Evidence: src/routes/api/uploads/$uploadId.ts:{Route}
    Evidence: src/routes/api/uploads/$uploadId.watch.ts:{Route}

- Session Parsing & Models
  - Purpose: Parse session files into normalized meta/events and define session/chat/misalignment models.
    Evidence: src/lib/session-parser/streaming.ts:{streamParseSession, parseSessionToArrays}
    Evidence: src/lib/sessions/model.ts:{SessionSnapshot, ChatMessageRecord, MisalignmentRecord}
  - Responsibilities: Streaming parse, event normalization, shared model factories.
    Evidence: src/lib/session-parser/streaming.ts:{streamParseSession}
    Evidence: src/lib/sessions/model.ts:{createChatMessageRecord, createMisalignmentRecord}
  - Public surface: Parser helpers + typed models for session/chat state.
    Evidence: src/lib/session-parser/streaming.ts:{parseSessionToArrays}
    Evidence: src/lib/sessions/model.ts:{SessionSnapshot, MisalignmentRecord}

- Chatbot / Session Coach
  - Purpose: Stream chat responses grounded in session snapshots + AGENT rules; detect misalignments; gate prompts via Hookify.
    Evidence: src/server/chatbot-api.server.ts:{streamChatFromPayload}
    Evidence: src/features/chatbot/context-builder.ts:{buildChatContext}
    Evidence: src/server/lib/hookifyRuntime.ts:{evaluateAddToChatContent}
  - Responsibilities: Validate chat payloads, resolve threads, build context, stream responses, persist messages/misalignments.
    Evidence: src/server/chatbot-api.server.ts:{streamChatFromPayload, analyzeChatFromPayload}
    Evidence: src/server/chatbot-api/stream.ts:{handleSessionChatStream, handleGeneralChatStream}
    Evidence: src/server/persistence/chatMessages.server.ts:{appendChatMessage}
  - Public surface: `/api/chatbot/stream` and `/api/chatbot/analyze` POST endpoints.
    Evidence: src/routes/api/chatbot/stream.ts:{Route}
    Evidence: src/routes/api/chatbot/analyze.ts:{Route}

- AI Runtime & Providers
  - Purpose: Resolve model/provider and run streaming generation for session or general chat.
    Evidence: src/server/lib/aiRuntime.ts:{generateSessionCoachReply, runGeneralChatTurn}
    Evidence: src/server/lib/aiRuntime.providers.ts:{resolveProvider}
  - Responsibilities: Provider initialization (OpenAI-compatible, Gemini CLI, Codex CLI, LM Studio) and model invocation.
    Evidence: src/server/lib/aiRuntime.providers.ts:{providerFactories, resolveProvider}
    Evidence: src/server/lib/aiRuntime.ts:{generateSessionCoachReply}
  - Public surface: Runtime functions used by chat stream orchestration.
    Evidence: src/server/lib/aiRuntime.ts:{generateSessionCoachReply, runGeneralChatTurn}

- Rule Inventory & Repo Binding
  - Purpose: Resolve repo roots for session assets and enumerate AGENT rules.
    Evidence: src/server/lib/sessionRepoRoots.server.ts:{resolveRepoRootForAssetPath}
    Evidence: src/server/lib/ruleInventory.server.ts:{collectRuleInventory}
    Evidence: src/lib/agents-rules/parser.ts:{parseAgentRules}
  - Responsibilities: Bind session to repo root, parse agent rules, expose rule inventory to UI.
    Evidence: src/server/function/sessionRepoContext.server.ts:{handleSessionRepoContextActionServer}
    Evidence: src/server/lib/ruleInventory.server.ts:{collectRuleInventory}
  - Public surface: `sessionRepoContext` server function + rule inventory fetch.
    Evidence: src/server/function/sessionRepoContext.ts:{sessionRepoContext}
    Evidence: src/server/function/ruleInventory.ts:{fetchRuleInventory}

- Persistence & Local Stores
  - Purpose: Local-only data storage for chat, tools, misalignments, uploads, UI settings, and todos.
    Evidence: src/server/persistence/chatMessages.server.ts:{chatMessagesCollection}
    Evidence: src/server/persistence/chatToolEvents.server.ts:{toolEventsCollection}
    Evidence: src/server/persistence/sessionUploads.server.ts:{sessionUploadsCollection}
  - Responsibilities: CRUD on TanStack DB collections and (for some) JSON persistence to disk.
    Evidence: src/server/persistence/chatMessages.server.ts:{schedulePersist}
    Evidence: src/server/persistence/chatThreads.server.ts:{schedulePersist}
    Evidence: src/server/persistence/chatToolEvents.server.ts:{schedulePersist}
  - Public surface: Repository functions used by server functions and chat runtime.
    Evidence: src/server/persistence/chatMessages.server.ts:{appendChatMessage, listChatMessages}
    Evidence: src/server/persistence/misalignments.ts:{ingestMisalignmentCandidates}
    Evidence: src/server/persistence/sessionUploads.server.ts:{saveSessionUpload, getSessionUploadContent}

- UI Settings & Client State
  - Purpose: Persist user UI preferences to local storage or server profile.
    Evidence: src/stores/uiSettingsStore.ts:{useUiSettingsStore}
    Evidence: src/server/function/uiSettingsState.ts:{persistUiSettings}
  - Responsibilities: Hydrate UI state, mutate preferences, persist snapshots.
    Evidence: src/stores/uiSettingsStore.ts:{hydrateFromSnapshot, setTimelineRange}
    Evidence: src/server/persistence/uiSettingsStore.ts:{loadUiSettings, saveUiSettings}
  - Public surface: Zustand store + server function endpoint.
    Evidence: src/stores/uiSettingsStore.ts:{useUiSettingsStore}
    Evidence: src/server/function/uiSettingsState.ts:{persistUiSettings}

- Todos (Sample Feature)
  - Purpose: Demonstrate TanStack DB query collections with server-backed mutations.
    Evidence: src/features/todos/collection.ts:{getTodosCollection, createTodoAndSync}
    Evidence: src/server/function/todos.ts:{getTodos, createTodo}
  - Responsibilities: Query collection setup + CRUD via server functions and persistence store.
    Evidence: src/features/todos/collection.ts:{createTodosCollection}
    Evidence: src/server/persistence/todosStore.ts:{addTodo, toggleTodoRecord}
  - Public surface: Server functions for todos and collection helpers.
    Evidence: src/server/function/todos.ts:{getTodos, createTodo, toggleTodo, deleteTodo}
    Evidence: src/features/todos/collection.ts:{getTodosCollection}

Coverage note: UI component libraries under `src/components/**` were not fully inspected; this map emphasizes behavior surfaced in routes, features, server functions, and persistence. Unknown UI-only responsibilities may exist outside the inspected files.

2) **Module Table**

| Module | Type | Purpose | Key Dependencies | Main Inputs → Outputs | Extensibility Points | Boundary Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| App Shell & Routing | Glue | Boot TanStack Start app, router, SSR hydration | @tanstack/react-start, @tanstack/react-router | HTTP request → routed React tree | Route files under `src/routes/*` | Root route mixes shell + theme init (expected for app shell) | src/start.ts:{startInstance}; src/router.tsx:{getRouter}; src/routes/__root.tsx:{Route} |
| Viewer Feature | Domain | Session viewer UI + loader orchestration | viewer loader, ui settings store, file loader | URL/search + loader snapshot → workspace state + UI | Add new viewer sections via `features/viewer/*` components | Workspace hook coordinates multiple concerns (discovery, chat, filters) in one file | src/features/viewer/viewer.loader.ts:{viewerLoader}; src/features/viewer/viewer.workspace.tsx:{ViewerWorkspaceProvider} |
| Session Discovery & Uploads | Infra | Discover assets and expose upload/watch APIs | fast-glob, sessionUploads store | Filesystem + env dirs → discovery snapshot; HTTP → upload records | New discovery sources via `discoverProjectAssets` and glob patterns | API routes call persistence directly (route + storage in same file) | src/lib/viewer-types/viewerDiscovery.server.ts:{discoverProjectAssets}; src/routes/api/uploads/index.ts:{Route} |
| Session Parsing & Models | Utility | Parse session content and define core session/chat types | session-parser, session model | Blob/text → meta/events; domain factories | Add parsers (e.g., Gemini) via session-parser modules | `gemini.ts` exceeds 400 LOC threshold | src/lib/session-parser/streaming.ts:{parseSessionToArrays}; src/lib/sessions/model.ts:{createChatMessageRecord}; src/lib/session-parser/gemini.ts:{tryParseGeminiConversationBlob} |
| Chatbot / Session Coach | Domain | Contextual chat + misalignment detection + Hookify gating | aiRuntime, persistence, session snapshot | Chat payload → streamed response + persisted records | Tooling via `createTimelineTools`; rules via AGENT files | Chat stream handler does orchestration + persistence in single module | src/server/chatbot-api/stream.ts:{handleSessionChatStream}; src/features/chatbot/misalignment-detector.ts:{detectMisalignments}; src/server/lib/hookifyRuntime.ts:{evaluateAddToChatContent} |
| AI Runtime & Providers | Infra | Initialize AI providers and run streaming generation | ai-sdk, provider SDKs | Chat history/context → streamed tokens | Add provider in `providerFactories` | Provider init depends on env at runtime | src/server/lib/aiRuntime.ts:{generateSessionCoachReply}; src/server/lib/aiRuntime.providers.ts:{providerFactories, resolveProvider} |
| Rule Inventory & Repo Binding | Adapter | Map session assets to repo roots and AGENT rule inventory | sessionRepoRoots, agent rules parser | assetPath → repo root + rule list | New rule sources via glob patterns in `loadAgentRules` | Repo root resolution uses filesystem heuristics | src/server/lib/sessionRepoRoots.server.ts:{resolveRepoRootForAssetPath}; src/server/lib/ruleInventory.server.ts:{collectRuleInventory} |
| Persistence & Local Stores | Infra | Local-only collections + disk persistence for chat/tool state | @tanstack/db, fs | Mutations → in-memory + JSON files | Swap storage backend by replacing repo functions | Storage + serialization co-located in same files | src/server/persistence/chatMessages.server.ts:{schedulePersist}; src/server/persistence/chatToolEvents.server.ts:{schedulePersist} |
| UI Settings & Client State | Domain | Persist user UI preferences | zustand, server function | UI actions → settings snapshot | Add UI settings fields in `lib/ui-settings` | Client store writes to server if profileId exists | src/stores/uiSettingsStore.ts:{useUiSettingsStore}; src/server/function/uiSettingsState.ts:{persistUiSettings} |
| Todos Feature | Domain | Sample CRUD with query collection | @tanstack/db, server functions | UI actions → todos list updates | Expand by adding new todo mutations | Client writes are immediate via collection utils | src/features/todos/collection.ts:{createTodosCollection}; src/server/function/todos.ts:{createTodo, toggleTodo} |

3) **Agent-Centric Component Map (if applicable)**

- Memory
  - Components found: Local-only TanStack DB collections for chat messages/threads, tool events, misalignments, uploads, UI settings.
  - State owned: chat history, thread metadata, tool-call audits, misalignment records, session uploads, UI settings snapshots.
  - Invocation: CRUD via server functions and chat runtime.
  - Evidence: src/server/persistence/chatMessages.server.ts:{chatMessagesCollection}; src/server/persistence/chatThreads.server.ts:{chatThreadsCollection}; src/server/persistence/chatToolEvents.server.ts:{toolEventsCollection}; src/server/persistence/misalignments.ts:{misalignmentsCollection}; src/server/persistence/sessionUploads.server.ts:{sessionUploadsCollection}; src/server/persistence/uiSettingsStore.ts:{uiSettingsCollection}

- Planning
  - Components found: Not detected in inspected code.
  - Evidence: Unknown (missing explicit planner/scheduler modules)

- Evaluation/Reasoning
  - Components found: Misalignment detection + Hookify rule evaluation.
  - State owned: Misalignment records and Hookify decision metadata.
  - Invocation: During chat stream and add-to-chat gating.
  - Evidence: src/features/chatbot/misalignment-detector.ts:{detectMisalignments}; src/server/lib/hookifyRuntime.ts:{evaluateAddToChatContent}; src/server/persistence/misalignments.ts:{ingestMisalignmentCandidates}; src/server/persistence/hookifyDecisions.server.ts:{recordHookifyDecision}

- Communication/Adapters
  - Components found: API routes for chatbot streaming/analyze and uploads; AI provider adapters.
  - State owned: HTTP request/response boundaries and provider initialization state.
  - Invocation: Route handlers call server APIs and persistence.
  - Evidence: src/routes/api/chatbot/stream.ts:{Route}; src/routes/api/chatbot/analyze.ts:{Route}; src/routes/api/uploads/$uploadId.watch.ts:{Route}; src/server/lib/aiRuntime.providers.ts:{resolveProvider}

- Toolkit/Utilities
  - Components found: Session parser and timeline tools.
  - State owned: Parsed session events and tool call summaries.
  - Invocation: Parser used during session load; tools used during AI tool calls.
  - Evidence: src/lib/session-parser/streaming.ts:{parseSessionToArrays}; src/server/lib/tools/timelineTools.ts:{createTimelineTools}

4) **Data & Control Flow**

Happy path narrative:
1. User navigates to viewer route; loader assembles discovery snapshot + chatbot state + rules + UI settings.
   Evidence: src/routes/(site)/viewer/route.tsx:{Route}
   Evidence: src/features/viewer/viewer.loader.ts:{viewerLoader}
2. Server discovery scans project/session assets and syncs uploads to the local store, returning a snapshot.
   Evidence: src/server/function/sessionDiscovery.server.ts:{runSessionDiscoveryServer}
   Evidence: src/lib/viewer-types/viewerDiscovery.server.ts:{discoverProjectAssets, synchronizeBundledSessions, synchronizeExternalSessions}
3. User selects a session asset; viewer fetches `/api/uploads/$uploadId`, loads file into the client parser, and streams events into the timeline UI.
   Evidence: src/features/viewer/viewer.discovery.section.tsx:{useViewerDiscovery}
   Evidence: src/routes/api/uploads/$uploadId.ts:{Route}
   Evidence: src/hooks/useFileLoader.ts:{useFileLoader}
4. User opens chat; state is fetched from server, including session snapshot + misalignments + agent rules; UI updates with context preview.
   Evidence: src/server/function/chatbotState.server.ts:{fetchChatbotStateServer}
   Evidence: src/server/lib/chatbotData.server.ts:{loadSessionSnapshot, loadAgentRules}
   Evidence: src/features/chatbot/context-builder.ts:{buildChatContext}
5. Chat request is streamed; server resolves model/provider, builds context, appends user/assistant messages, and emits NDJSON stream.
   Evidence: src/server/chatbot-api.server.ts:{streamChatFromPayload}
   Evidence: src/server/chatbot-api/stream.ts:{handleSessionChatStream}
   Evidence: src/server/lib/aiRuntime.ts:{generateSessionCoachReply}
   Evidence: src/server/persistence/chatMessages.server.ts:{appendChatMessage}
6. Hookify gating on “add to chat” evaluates rules and records decisions before allowing navigation to chat.
   Evidence: src/server/function/hookifyAddToChat.server.ts:{handleHookifyAddToChatServer}
   Evidence: src/server/lib/hookifyRuntime.ts:{evaluateAddToChatContent}
   Evidence: src/server/persistence/hookifyDecisions.server.ts:{recordHookifyDecision}

Key touchpoints between modules:
- Viewer loader → Session discovery + Chatbot state + Rule inventory + UI settings.
  Evidence: src/features/viewer/viewer.loader.ts:{viewerLoader}
- Chat stream → Misalignment detection + tool events + persistence.
  Evidence: src/server/chatbot-api/stream.ts:{handleSessionChatStream}
  Evidence: src/features/chatbot/misalignment-detector.ts:{detectMisalignments}
  Evidence: src/server/persistence/chatToolEvents.server.ts:{insertChatToolEvent}

Persistence and side-effect points:
- Local JSON persistence for chat messages/threads/tool events.
  Evidence: src/server/persistence/chatMessages.server.ts:{schedulePersist}
  Evidence: src/server/persistence/chatThreads.server.ts:{schedulePersist}
  Evidence: src/server/persistence/chatToolEvents.server.ts:{schedulePersist}
- Filesystem scanning for discovery and repo-root resolution.
  Evidence: src/lib/viewer-types/viewerDiscovery.server.ts:{discoverProjectAssets}
  Evidence: src/server/lib/sessionRepoRoots.server.ts:{resolveRepoRootForAssetPath}

Dependency edge list:
- App Shell & Routing → Viewer Feature (route component wiring).
  Evidence: src/routes/(site)/viewer/route.tsx:{Route}
- Viewer Feature → Session Discovery & Uploads (loader + upload APIs).
  Evidence: src/features/viewer/viewer.loader.ts:{viewerLoader}
  Evidence: src/features/viewer/viewer.discovery.section.tsx:{useViewerDiscovery}
- Viewer Feature → Chatbot / Session Coach (chat state + hookify).
  Evidence: src/features/viewer/viewer.workspace.chat.ts:{useViewerWorkspaceChat}
- Chatbot / Session Coach → AI Runtime & Providers (streaming generation).
  Evidence: src/server/chatbot-api/stream.ts:{handleSessionChatStream}
  Evidence: src/server/lib/aiRuntime.ts:{generateSessionCoachReply}
- Chatbot / Session Coach → Persistence & Local Stores (messages, misalignments, tool events).
  Evidence: src/server/chatbot-api/stream.ts:{handleSessionChatStream}
  Evidence: src/server/persistence/chatMessages.server.ts:{appendChatMessage}

5) **Architecture Assessment**

Best-fit archetype: TanStack Start web application with local-first persistence and AI-assisted session analysis.
Evidence: src/start.ts:{startInstance}; src/router.tsx:{getRouter}; src/server/persistence/chatMessages.server.ts:{chatMessagesCollection}; src/server/lib/aiRuntime.ts:{generateSessionCoachReply}

Strengths / constraints implied by the architecture:
- Strength: Clear separation between route definitions, server functions, and persistence repositories for core workflows (viewer loader + chatbot).
  Evidence: src/routes/(site)/viewer/route.tsx:{Route}; src/server/function/chatbotState.ts:{fetchChatbotState}; src/server/persistence/chatMessages.server.ts:{appendChatMessage}
- Strength: Local-first data stores enable fast UI iteration without external DB dependencies.
  Evidence: src/server/persistence/chatMessages.server.ts:{chatMessagesCollection}; src/server/persistence/sessionUploads.server.ts:{sessionUploadsCollection}
- Constraint: Some API routes directly import persistence, reducing layering consistency.
  Evidence: src/routes/api/uploads/index.ts:{Route}
- Constraint: Session snapshot falls back to fixture data if asset is missing, which can mask live-data errors.
  Evidence: src/server/lib/chatbotData.server.ts:{loadSessionSnapshot, loadFixtureSnapshot}

Top 5 improvement opportunities:
1. **Route layering** — Move upload persistence calls behind server functions to keep route handlers thin.
   Impact: Medium (consistent layering, easier testing)
   Risk: Low
   Scope: Route handlers + new server functions
   Evidence: src/routes/api/uploads/index.ts:{Route}; src/server/persistence/sessionUploads.server.ts:{saveSessionUpload}
2. **Separate persistence I/O from collection state** — Extract JSON read/write helpers from chat/tool persistence modules to reduce mixed responsibilities.
   Impact: Medium (clearer boundaries, easier replacement of storage backend)
   Risk: Medium
   Scope: `chatMessages.server.ts`, `chatThreads.server.ts`, `chatToolEvents.server.ts`
   Evidence: src/server/persistence/chatMessages.server.ts:{schedulePersist}; src/server/persistence/chatThreads.server.ts:{schedulePersist}; src/server/persistence/chatToolEvents.server.ts:{schedulePersist}
3. **Chat stream orchestration split** — Split streaming orchestration vs. persistence into dedicated service/usecase modules to reduce coupling.
   Impact: Medium
   Risk: Medium
   Scope: `chatbot-api/stream.ts` and related persistence calls
   Evidence: src/server/chatbot-api/stream.ts:{handleSessionChatStream}; src/server/persistence/chatMessages.server.ts:{appendChatMessage}
4. **Session snapshot fallback signaling** — Surface explicit “missing snapshot” errors to UI instead of always falling back to fixture data.
   Impact: Medium (reduces silent data mismatch)
   Risk: Low
   Scope: `chatbotData.server.ts` + UI handling
   Evidence: src/server/lib/chatbotData.server.ts:{loadSessionSnapshot, loadFixtureSnapshot}
5. **Split large Gemini parser module** — `gemini.ts` exceeds the 400 LOC threshold; extract normalization helpers to keep single-responsibility modules.
   Impact: Low-Medium (maintainability)
   Risk: Low
   Scope: `src/lib/session-parser/gemini.ts`
   Evidence: src/lib/session-parser/gemini.ts:{tryParseGeminiConversationBlob, normalizeGeminiEventShape}
