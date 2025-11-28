Context
- Chatbot orchestrator is partially wired for OpenAI-compatible providers, but Gemini CLI, Codex CLI, and LM Studio integrations remain incomplete which now blocks Session Coach flows (ref .taskmaster/docs/v1/prd.md, docs/chatbot-docs/*, docs/lmstudio/*).
- Recent regressions broke Chat Dock rendering/logging, and provider failures currently crash the server (`MODEL_UNAVAILABLE`, LM Studio models not surfacing), so we must stabilize runtime + UI before enabling more providers.
- Provider auth mechanisms differ (CLI auth, OAuth, OpenAI-compatible HTTP); registry/UI must keep AGENTS constraints intact without client fetching while staying compliant with TanStack Start loader rules.

Success criteria
- Provider registry exposes Codex CLI, Gemini CLI, LM Studio, and existing providers with accurate metadata (model IDs, capabilities, auth expectations) plus shared availability between Session Coach + General chat.
- Server/runtime streams chat via each provider (including CLI-backed auth) using Vercel AI SDK integrations with graceful error handling + structured console logging so UI never crashes when a model is missing.
- LM Studio dynamically lists installed models from its `/v1/models` endpoint; UI model pickers stay in sync without hardcoded placeholders.
- Configuration docs/env templates describe CLI setups, env vars, LM Studio requirements, and troubleshooting of `MODEL_UNAVAILABLE` or offline providers.
- Tests (unit + integration/e2e) cover provider resolution, LM Studio sync, logger behavior, and missing-auth scenarios.

Deliverables
- Updated provider registry + orchestrator modules (e.g., `src/server/lib/aiRuntime.ts`, `src/server/function/chatbotState.ts`, Chat Dock components) supporting new providers + graceful error flows.
- CLI-aware auth adapters leveraging `ai-sdk-provider-codex-cli`, `ai-sdk-provider-gemini-cli`, and LM Studio OpenAI-compatible endpoints with shared provider options between both chat modes.
- LM Studio model-sync helper tied into runtime + documented instructions across `docs/chatbot-docs/*`, `docs/lmstudio/*`, `.env.example`.
- Improved diagnostics (console/server logs) and fallback UI states to prevent crashes plus Playwright/Vitest/e2e coverage for provider availability.

Approach
1) Inventory current AI provider + Chat Dock touchpoints (model definitions, env readers, TanStack loader/server fn usage, logger) and capture regression list from docs/tasks/todo + logs/dev-server-error.
2) Rework provider abstraction: map ProviderId → factory (OpenAI-compatible, Gemini CLI, Codex CLI, LM Studio) with auth checks, CLI detection, LM Studio dynamic sync, and structured `ProviderUnavailableError`s.
3) Update Chat Dock state + UI wiring to consume shared provider/model lists for both chat modes, provide resilient error handling, and reinstate missing components/logging.
4) Document provider setup/troubleshooting (docs/chatbot-docs, docs/lmstudio) plus `.env.example` updates; include manual steps for CLI auth + LM Studio server boot.
5) Expand testing (unit + e2e) covering provider unavailability, LM Studio dynamic models, Chat Dock rendering, logger output; ensure dev server stays green via pnpm test suites.

Risks / unknowns
- CLI providers require installed binaries + prior OAuth login; need detection + UI messaging when binaries/tokens missing.
- Streaming semantics differ (Codex CLI chunking, LM Studio responses) and could break watchers/loggers if not normalized.
- LM Studio endpoint unavailability or missing downloaded models must not crash; need fallback caching + refresh path.
- Browser build must avoid bundling Node APIs (e.g., `node:events`) when polyfills leak into client components.
- Legacy fixtures (e.g., `session-large.json`) missing in CI can break Chat Dock load if not handled gracefully.

Testing & validation
- Unit tests for provider factory/config logic (mock env + CLI presence), LM Studio sync helper, and error boundary responses.
- Integration/e2e tests (Playwright or API-level) verifying Chat Dock renders, provider selection shared across modes, and server returns structured errors instead of crashing.
- Manual checklist: run `codex login`, `gemini login`, start `lms server start`, send chat via each provider verifying logs and UI states.

Rollback / escape hatch
- Feature flag or config toggle to revert to OpenAI-compatible provider only; ability to disable individual providers via env if they misbehave.

Owner/Date
- Codex / 2025-11-28
