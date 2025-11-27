Context
- General + Session chat modes need real model providers, runtime helpers, and UI affordances per docs/next-task-plan.md and docs/chatbot-TODO.md.
- Chat state persistence/reset, evidence surfacing, and aceternity visual effects remain partially stubbed in ChatDockPanel and related server fns.
- Input ergonomics (Enter vs modifiers) and model selection must be solidified before broader rollout.

Success criteria
- General chat mode enabled with default model, streaming actual LLM replies, and bypassing misalignment context.
- Session mode still routes through context/misalignment builder but now delegates generation to lib/ai/client with selectable models.
- Chat UI supports Enter-to-send, modifier newlines, New chat reset workflow, aceternity effects, evidence blocks, and model selector.
- Chat state persists per {sessionId, mode}; reset=true clears conversation but keeps relevant misalignment state; no regressions for existing viewers.

Deliverables
- Updated server/runtime code (lib/ai/client.ts, chatbot-api.server.ts, chatbot state fn) plus chatModeConfig defaults.
- Enhanced ChatDockPanel + related components for header, buttons, selectors, evidence, and effects.
- Any new helper modules/types plus Storybook/docs snippets if needed.
- Tests covering provider selection, server handlers, and key UI behavior (unit/integration/snapshot as appropriate).

Approach
1) Define provider/model map + runtime helpers in `src/lib/ai/client.ts`, align `chatModeConfig` defaults, and export model metadata for UI.
2) Update `chatbot-api.server.ts` (and associated server fns) to call the runtime helpers, branch on mode, respect `modelId`, and keep existing context builder for session mode.
3) Ensure chat state persistence/reset flows handle both modes via existing server function + `chatMessagesStore`, returning appropriate payloads.
4) Revamp `ChatDockPanel` header with mode label, misalignment controls, new chat button, model selector, and evidence rendering for assistant messages.
5) Implement Enter/Ctrl/Shift handling in the textarea + apply aceternity send/stream effects and optimistic message updates.
6) Wire general chat toggle path (even if UI toggle arrives later) so session/general share shell but show/hide misalignment UI per mode.
7) Add/extend tests (server, hooks, component) and docs (CHANGELOG or README snippet) to capture new behavior.

Risks / unknowns
- Provider credentials/model IDs may vary across environments; need env validation + fallbacks.
- Streaming + aceternity effects could introduce hydration/Suspense regressions if not wrapped in `startTransition` per AGENTS guidance.
- Evidence schema from runtime may evolve; UI must degrade gracefully when missing data.
- Chat reset must not drop misalignment context unexpectedly, risking user confusion.

Testing & validation
- Unit tests for lib/ai/client provider selection + chat state helpers.
- Server integration tests (or mocked tests) for chatbot API streaming both modes.
- Component tests (Vitest + React Testing Library or Storybook interaction) for ChatDockPanel input handling, new chat, model selector.
- Manual verification of streaming UI + effects in viewer route across desktop browsers.

Rollback / escape hatch
- Feature-flag general chat enablement and model selector; can revert to `MODE_NOT_ENABLED` and previous mock responses by toggling `chatModeConfig` or guarding routes.

Owner/Date
- Codex / 2025-11-26
