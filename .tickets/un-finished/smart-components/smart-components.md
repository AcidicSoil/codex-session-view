These APIs only have effect inside an `assistant-ui` runtime subtree. Implement them on the same React tree that renders your copilot/chat experience. ([assistant-ui.com][1])

## 1) `makeAssistantVisible` placement

Use it on **leaf UI controls** the assistant should be able to “see” (HTML structure) and optionally “click” (tool exposure). Wrapping higher-level containers is less useful because only the outermost readable wrapper contributes its HTML. ([assistant-ui.com][2])

Concrete targets in your codebase:

* Chat composer controls (send button, retry button, etc.) in `src/components/chatbot/ChatDockComposer.tsx` and `src/components/chatbot/ChatDockBootstrapCard.tsx`.
* Reusable prompt-input controls in `src/components/ai-elements/prompt-input/*` (buttons, command items, attachments UI).
* “Suggestion pill” buttons and other user-action affordances in `src/components/ai-elements/*` (e.g., suggestions).
* Collapsible “task/tool” UI triggers users interact with in `src/components/ai-elements/task.tsx` and `src/components/ai-elements/tool.tsx`.

## 2) `useAssistantInstructions` placement

Put it in a **feature-level wrapper** that represents one coherent assistant experience (one role, one domain). The hook sets system instructions for the assistant-ui component subtree. ([assistant-ui.com][3])

Concrete targets in your codebase:

* A “Session coach” wrapper colocated with chat mode selection/bootstrapping under `src/features/chatbot/*` (your chat modes and runtime live here).
* A route-level wrapper that mounts the chat dock, so instructions differ per route or per mode without leaking into unrelated screens.

## 3) `makeAssistantTool` placement

Render tool components **once** inside the same copilot subtree so they register with the assistant context. `makeAssistantTool` exists specifically to make tools composable as React components. ([assistant-ui.com][4])

Concrete targets in your codebase:

* The top-level component that mounts your chat dock and message list for the session coach (same place that owns the chat runtime calls like `requestChatStream`).
* If you already render tool UIs (collapsible tool blocks), keep those UIs in `src/components/ai-elements/tool.tsx` and register the corresponding tools near the chat root.  ([assistant-ui.com][5])

## 4) Model Context placement (`api.modelContext().register(...)`)

Register model context where you have **the freshest, highest-signal session/user state** available, because it’s meant for dynamic, per-user/per-session context. ([assistant-ui.com][6])

Concrete targets in your codebase:

* The component that receives the “chatbot state” payload (session snapshot, misalignments, context preview) from `fetchChatbotState` and owns mode/thread changes, since that’s where your authoritative context is assembled.
* If you expose different contexts per mode (“session” vs “general”), register different model context blocks based on the active mode definition.

[1]: https://www.assistant-ui.com/docs/architecture?utm_source=chatgpt.com "Architecture"
[2]: https://www.assistant-ui.com/docs/copilots/make-assistant-readable?utm_source=chatgpt.com "makeAssistantVisible"
[3]: https://www.assistant-ui.com/docs/copilots/use-assistant-instructions?utm_source=chatgpt.com "useAssistantInstructions"
[4]: https://www.assistant-ui.com/docs/copilots/make-assistant-tool?utm_source=chatgpt.com "makeAssistantTool"
[5]: https://www.assistant-ui.com/docs/guides/ToolUI?utm_source=chatgpt.com "Generative UI"
[6]: https://www.assistant-ui.com/docs/copilots/model-context?utm_source=chatgpt.com "Model Context"
