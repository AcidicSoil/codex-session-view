Context
- Codex Session Viewer currently ships TanStack AI 0.0.1 via `createServerFnTool` and a placeholder `aiChat` server function that buffers OpenAI output instead of exposing the new streaming + tool loop primitives.
- TanStack AI’s latest drop (0.0.2+) introduces the unified `chat`/`chatCompletion` split, automatic tool execution, SSE helpers, and React devtools integration that we want to leverage for production-ready multi-provider chat.
- The active providers we will support are the production-capable adapters already wired today (OpenAI-compatible, Gemini CLI, Codex CLI, LM Studio); we will retire the demo models and ensure every surface runs against real providers without introducing feature gates or backwards-compat shims (app is still unreleased).

Success criteria
- `@tanstack/ai`, `@tanstack/ai-client`, `@tanstack/ai-react`, and adapter packages updated to the new release with lockfile + type checks passing.
- Server-side chat entrypoints (`src/server/function/ai.ts` or successor routes) use `chat()` for streaming tool-aware loops and `chatCompletion()` for any non-stream, with `toStreamResponse` for HTTP transport.
- Provider configuration preserves the production adapters (OpenAI-compatible, Gemini CLI, Codex CLI, LM Studio) with env validation and per-provider health checks, while removing demo fallback models; missing secrets fail fast at boot with descriptive errors and no compatibility shims.
- React viewer flow consumes SSE streams (via `fetchServerSentEvents`) and exposes TanStack AI devtools when `AI_DEVTOOLS_ENABLED` env flag is true.
- Automated/unit/e2e tests cover the provider registry, server tool execution, and SSE client path so CI blocks regressions.

Deliverables
- Updated dependencies + pnpm lock.
- Refined server AI module(s) (`src/server/function/ai.ts`, possible new `src/server/ai/adapterRegistry.ts`, SSE route handler).
- Client hooks/components wiring TanStack AI connection + optional devtools toggle.
- Documentation updates (`docs/ai/README.md` or new guide) detailing env vars, provider setup, and rollout guardrails, plus clear migration notes for removing demo models.
- Removal/migration commits that eliminate demo adapters, configs, and datasets while preserving equivalent functionality via production providers.
- Test coverage additions (unit tests for provider selector/tool loop, Playwright e2e smoke for chat dock).

Approach
1) Inventory current AI touchpoints: search for `@tanstack/ai`, `createServerFnTool`, chat dock consumers, and env vars for each production provider (OpenAI-compatible, Gemini CLI, Codex CLI, LM Studio) plus any lingering demo references (model IDs, config, persisted data) that must be migrated or removed.
2) Upgrade dependencies: bump TanStack AI packages in `package.json`, run `pnpm install`, and address TypeScript/API migration steps from `docs/MIGRATION_UNIFIED_CHAT.md`.
3) Design provider registry: introduce a typed config layer (`~/lib/ai/providerRegistry.ts`) that maps env vars to the production adapters (OpenAI-compatible, Gemini CLI, Codex CLI, LM Studio) and exposes helper functions for selecting models + validating secrets, explicitly removing demo adapters and any compatibility shims.
4) Migrate demo artifacts: map demo model IDs/configs/tests to production equivalents, implement deterministic fixtures where needed, and delete demo-only files once parity is proven so no residual code references them.
5) Refactor server functions/routes: replace the buffered `aiChat` implementation with streaming `chat()` hooked to `toStreamResponse`, wire `chatCompletion()` for summary endpoints, and ensure tools are defined once with clear separation between server/client executions.
6) Update client integration: point the chat dock to the SSE endpoint using `useChat` + `fetchServerSentEvents`, add TanStack AI devtools (lazy-loaded, flag-gated), and ensure router loaders seed any required data (per AGENTS rules).
7) Expand tooling/tests: write unit tests for the provider registry + tool execution flow, extend Playwright chat scenarios to assert streaming + tool-call events, and add docs describing ops rollout (fail-fast env validation, no feature flags).

Risks / unknowns
- Missing provider env vars (OpenAI-compatible, Gemini CLI, Codex CLI, LM Studio) will now fail fast at boot, so documentation must clearly enumerate setup steps to keep onboarding smooth.
- Streaming SSE on Vercel/Nitro may require headers or adapter tweaks; test both prod + dev bundles.
- Tool execution loops can hang if models misbehave; agent loop strategies must guard iterations/timeouts.
- Devtools bundle weight + SSR constraints must be considered to avoid hydration issues noted in AGENTS.md.

Testing & validation
- `pnpm test` for unit coverage, especially new provider registry + tool manager tests.
- `pnpm test:e2e` (and `pnpm test:e2e:prod`) with `AI_*` envs targeting each production provider-backed SSE endpoint (OpenAI-compatible, Gemini CLI, Codex CLI, LM Studio) to validate real chat UX once demo adapters are gone.
- Manual smoke: run `pnpm dev`, trigger chat dock interactions against each available production provider (at least OpenAI-compatible), confirm devtools shows tool events and SSE stream chunks.
- Optional integration test invoking server fn directly (e.g., supertest) to ensure `toStreamResponse` headers + body semantics match expectations.

Rollback / escape hatch
- Revert to previous dependency versions and restore the buffered `aiChat` server fn; because the app is unreleased, rollback is a straight git revert without feature flags.

Owner/Date
- codex (GPT-5) / 2025-12-05
