Implementation plan, mapped directly to the TODO list + PRD, with concrete code touchpoints.

* Chat runtime + providers (Session + General)

  * In `src/lib/ai/client.ts`, treat this as the canonical provider/model abstraction. Fill out the `providers` map and model IDs for every custom provider you care about (OpenAI, Anthropic, local, etc.), and expose a narrow runtime API:

    * `generateSessionCoachReply({ session, messages, modelId })` and
    * `runGeneralChatTurn({ messages, modelId })` returning `{ textStream, usage, modelId }`.
    * Ensure these use one consistent low-level call (e.g., Vercel AI SDK or direct HTTP) that reads provider credentials from env and respects the token limits and default model in `chatModeConfig`.
  * In `src/features/chatbot/chatModeConfig.ts`, keep `session` as-is and now mark `general.enabled = true`, setting its `defaultModelId` to a safe, cheap general model (e.g., the same one you wired for `runGeneralChatTurn`). Also keep a `MODE_NOT_ENABLED` code path in place for any unknown `mode`.
  * In `src/server/chatbot-api.server.ts`, replace `synthesizeAssistantText`/`streamFromText` with real calls into `lib/ai/client`:

    * For `mode === 'session'`, keep the existing context-builder + misalignment pipeline, but route the final “assistant text” through `generateSessionCoachReply` so the LLM is actually generating the explanation while still receiving the structured context and misalignment summary.
    * For `mode === 'general'`, branch early: no AGENTS/misalignment logic, no session context—just call `runGeneralChatTurn` with the raw chat transcript (user/assistant messages) and stream the result back via your existing streaming helper. This completes “General Chat mode” in the PRD: `mode="general"` now produces open-domain replies instead of `MODE_NOT_ENABLED`.

* Chat state persistence + “New chat”

  * Use the existing `{ sessionId, mode }`-scoped persistence from `chatMessagesStore` and `chatbotState` as the single storage layer for both session coach and general chat. `ViewerChatState` is already sourced from `fetchChatbotState({ sessionId, mode: 'session' })` in `viewer.loader.ts`; extend this to respect `mode` for general chat when you wire the mode toggle (see below).
  * In `src/server/function/chatbotState.ts` (or wherever `fetchChatbotState` is defined), preserve the current `reset` query parameter behavior: when `reset=true`, clear chat messages for `{ sessionId, mode }` and return an empty messages array plus misalignments for the fresh session. You already saw this pattern in the server fn that checks `reset` and reloads from `chatMessagesStore`; keep that contract.
  * In `src/components/chatbot/ChatDockPanel.tsx`, add a “New chat” button in the header for the feature-enabled path:

    * On click, call a small client helper that hits `fetchChatbotState({ sessionId, mode, reset: true })` via the existing server fn wrapper.
    * On success, replace local `messages` state with the returned `messages` (expected to be empty) and keep `misalignments` untouched (you still want current session’s AGENTS state in Session Coach; for General Chat, you can ignore misalignments entirely).

* Chat input behavior (`Enter` vs `Ctrl+Enter`)

  * In `FeatureEnabledChatDock`’s `Textarea` in `ChatDockPanel.tsx`, wire the key handling directly to the existing `handleSend` hook:

    * `onKeyDown`:

      * If `event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !isStreaming`, `event.preventDefault()` and call `handleSend()`.
      * If `event.key === 'Enter' && (event.shiftKey || event.metaKey || event.ctrlKey)`, allow the newline (no prevention).
    * Keep the send `Button` calling `handleSend` as well to support mouse clicks.
  * That satisfies the TODO: Enter sends; Ctrl/Cmd/Shift+Enter inserts a newline without changing the streaming logic you already have in `handleSend`.

* ChatDock UI and effects (Session Coach, then General)

  * Session Coach header + controls:

    * In `ChatDockPanel.tsx`, wrap the card header in a small header bar that shows:

      * Left: static mode label “Session Coach” (Phase 3 PRD requirement).
      * Center/right: Misalignment banner + summary/commit pop-out buttons (`SummaryPopout`, `CommitPopout`) that are already implemented.
      * Rightmost: “New chat” button as described above.
  * Enter General Chat UX later when you hook up the mode toggle (see PRD Phase 4): once you enable the toggle, the same header should show `[Session Coach | General Chat]` and swap the label, but still reuse the same conversation shell. For General Chat, hide MisalignmentBanner and SessionAnalysisPopouts so misalignment UX stays Session-only.
  * For the text effects:

    * Reuse your existing aceternity components (`TextGenerateEffect`, `PlaceholdersAndVanishInput`) from the viewer’s other sections: wrap the assistant message bubble rendering to animate the current streaming assistant message (use `pending` flag and `assistantMessageIdRef` you already have to know which one is “live”).
    * Wrap the `Textarea` + send button in the vanish-input shell so, after `handleSend`, the text visibly “leaves” the input while you clear `draft` and immediately append the optimistic user message.

* Evidence / inline sources for flagged files

  * The context builder is already attaching misalignment ranges and session assets; keep that logic server-side. Wire the evidence visualization entirely UI-side:

    * Extend the assistant message type (`ChatMessageRecord`) with an optional `evidence` field (array of `{ path, ruleId, snippet? }`) when the runtime returns something that references specific AGENTS violations.
    * In `ChatDockPanel`, when rendering assistant messages in Session Coach mode, map those into a small “Evidence” section under the bubble that lists each `path` and rule label, linking back to the viewer explorer or timeline, and visually aligning with how `MisalignmentBanner` and timeline badges show severity (reuse `getSeverityVisuals`).
    * This satisfies the “flagged files not following instruction files” evidence TODO without entangling the chat runtime with UI components.

* Model selector + provider wiring in the UI

  * Expose a `ChatModelChoice` in `ViewerChatState` (e.g., `initialModelId` coming from `chatModeConfig[mode].defaultModelId`). `ChatDockPanel` should own a `selectedModelId` piece of state initialized from that.
  * Render a compact model selector in the ChatDock header (next to “Session Coach” / “General Chat”):

    * For MVP, a simple `<Select>` listing `AI_MODEL_IDS` from `lib/ai/client.ts` grouped by provider; wire `onValueChange` to update `selectedModelId`.
    * When sending `requestChatStream`/`requestChatAnalysis`, include `modelId: selectedModelId` in the body so the backend picks the right provider/model via `lib/ai/client`.
  * This completes the “finish wiring in providers” TODO: UI chooses the model; `chatModeConfig` and `lib/ai/client` validate it; the runtime actually calls the appropriate LLM.

* General Chat completion summary

  * After the above, “general chat mode completed” means:

    * `chatModeConfig.general.enabled === true` and has sane defaults.
    * `runGeneralChatTurn` in `lib/ai/client.ts` (or a sibling runtime module) performs a pure open-domain chat call independent of AGENTS/misalignment.
    * `server/chatbot-api.server.ts` branches correctly on `mode` and streams general replies.
    * `ChatDockPanel` passes either `'session'` or `'general'` plus `modelId` and `{ sessionId }` and displays responses with the same UI, while misalignment banner + evidence surfaces show only in Session Coach mode.
