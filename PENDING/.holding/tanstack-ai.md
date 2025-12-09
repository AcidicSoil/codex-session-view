The correct place to plug TanStack AI into `codex-session-view` is the existing Session Coach chat pipeline that powers the Viewer “Chat” tab, specifically at the server layer in `src/server/lib/aiRuntime.ts` and the `/api/chatbot/stream` route.

Call chain (where the AI actually lives)

From the Viewer “Chat” tab down to the model, the path is:

1. UI: `ViewerChatView` renders the Chat dock
   `src/features/viewer/views/ViewerChatView.tsx` → `<ChatDockPanel ... />`

2. UI controller: `ChatDockPanel` wires state and handlers
   `src/components/chatbot/ChatDockPanel.tsx`

3. Client runtime: `useChatDockController` sends the chat request

   * Uses `requestChatStream` from `~/features/chatbot/chatbot.runtime`

4. HTTP client: `requestChatStream` posts to the streaming endpoint
   `src/features/chatbot/chatbot.runtime.ts` → `fetch('/api/chatbot/stream', { method: 'POST', ... })`

5. HTTP route: `/api/chatbot/stream` server handler
   `src/routes/api/chatbot/stream.ts` → `streamChatFromPayload(body)`

6. Chatbot server core: `streamChatFromPayload`
   `src/server/chatbot-api.server.ts` → chooses mode (session/general), builds context, then calls:

   * `generateSessionCoachReply`
   * `runGeneralChatTurn`
   * `generateSessionAnalysis` (for analysis endpoint)

7. AI runtime: all model calls centralized in `aiRuntime`
   `src/server/lib/aiRuntime.ts` currently uses the `ai` SDK (`streamText`, `generateText`) and custom providers

This last layer (7) is where TanStack AI slots in.

Concrete integration point for TanStack AI

`src/server/lib/aiRuntime.ts` is the abstraction layer between your domain (Session Coach, General Chat, Analysis) and the underlying LLM SDK. It already encapsulates:

* Provider selection and configuration (`resolveProvider`, `providerFactories`)
* Session coach streaming (`generateSessionCoachReply`)
* General chat streaming (`runGeneralChatTurn`)
* Non-streaming analysis (`generateSessionAnalysis`)
* Conversion of a `ChatStreamResult` into an HTTP stream used by `/api/chatbot/stream` (`streamResultToResponse`)

Right now, those functions call `streamText` / `generateText` from the `ai` SDK:

```ts
const result = streamText({
  model: provider(definition.providerModel),
  system: buildSessionCoachSystemPrompt(...),
  messages: toCoreMessages(options.history),
  temperature: definition.defaultTemperature,
  maxOutputTokens: definition.maxOutputTokens,
});
```

and return a `ChatStreamResult` that the rest of the app consumes.

TanStack AI’s server API gives you a `chat()` call and helpers like `toStreamResponse()` for SSE responses (see `api.tanchat` example in the docs) . That is semantically equivalent to what `aiRuntime` already expects: an async stream of chunks that can be wrapped into a `ReadableStream`/`Response`.

Therefore, the appropriate integration point is:

* Replace the internals of:

  * `generateSessionCoachReply`
  * `runGeneralChatTurn`
  * `generateSessionAnalysis`
* So that they call `chat()` from `@tanstack/ai` (and its adapters) instead of `streamText` / `generateText` from `ai`.

You keep:

* The shape of `ChatStreamResult` and the `streamResultToResponse` contract intact.
* All upstream code (`chatbot-api.server.ts`, HTTP routes, client `requestChatStream`, `useChatDockController`, `ChatDockPanel`, and `ViewerChatView`) unchanged.

That places TanStack AI squarely in the “engine room” of the Codex Session Viewer’s Chat dock / Session Coach, which is the actual “codex-session-view” AI surface, without disturbing the viewer UI or routing.
