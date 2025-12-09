What are the most important questions to confirm before implementation?

  1. Which concrete workflows should the first agent cover (misalignment analysis, session
     summary, code diffs, etc.) so the orchestration API matches the expected inputs/outputs?
  2. Are there environment or deployment constraints (e.g., Vercel edge limits, model IDs to
     expose, feature flags) that must dictate provider routing and runtime selection?
  3. How should telemetry/observability be structured—do we need tracing IDs, quotas, or per-
     user attribution for agent runs to satisfy ops requirements?
  4. Should TanStack AI always go through Agents for complex actions, or only when a user
     toggles a specific search param/setting?Context

- Current TanStack Start app already centralizes AI providers via `ai`/AI SDK (LM Studio, Google, Codex/Gemini CLI) but lacks an orchestration layer for multi-step workflows.
- The user wants to integrate `openai-agents-js` so server-side workflows can reuse the same providers, while TanStack AI keeps powering the ChatDock UI and tools.
- Need a clean plan to add dependencies, provider adapters, server functions, and documentation/tests without violating the repo's AGENTS rules (route loaders, server fns, no data-fetching effects).

Success criteria
- `@openai/agents` + `@openai/agents-extensions` installed and wired so agents can call every existing AI SDK provider via a shared adapter factory.
- Agent workflows callable from TanStack AI chat/loader routes through server functions, with model selection + params stored alongside existing config/search params.
- Tests/telemetry show agent actions streaming correctly without breaking current chat/misalignment flows; lint + unit/e2e suites pass.
- Ops/docs describe env vars, provider naming, and how to enable/disable agent-backed tools in local + prod environments.

Deliverables
- New server-only provider factory (e.g., `src/server/ai/agentsModels.server.ts`) plus orchestration module(s) that encapsulate agent definitions and workflows.
- Router loader/server function updates exposing agent-backed actions to the ChatDock/TanStack AI layer, along with any new query/mutation helpers.
- Updated README or dedicated doc (`docs/ai/agents.md`) and `.env.example` entries covering new config requirements.
- Automated tests (unit for provider routing, integration/e2e covering a sample agent run) and telemetry hooks ensuring visibility.

Approach
1. **Dependencies & scaffolding** – Add `@openai/agents` + `@openai/agents-extensions` via `pnpm`, verify versions align with existing AI SDK release (`ai@5.x`), and stub new server directories under `src/server/ai/agents`.
2. **Provider adapter factory** – Implement `getAgentsModel(modelId)` (or similar) that wraps AI SDK providers through `aisdk(...)`, centralizes env validation, and enforces naming/feature parity with existing search params.
3. **Agent definitions** – Create composable agent configs (tools, memory, guardrails) that map to current workflows (e.g., misalignment analysis, session summary). Keep orchestration logic server-side and pure; expose typed inputs/outputs.
4. **Server entry points** – Wire TanStack Start loaders/server fns (e.g., `/api/chatbot/agentsRun`) to invoke agent workflows. Keep data fetching in loaders, propagate outputs via query clients, and ensure router invalidations happen after mutations.
5. **TanStack AI bridge** – Update ChatDock/service hooks to register agent-backed tools/actions, ensuring UI state lives in URL/search params and no fetching occurs in `useEffect`. Provide feature flags/search params for selecting agent strategies per session.
6. **Observability & errors** – Extend `~/lib/logger` events to capture agent run metadata (durations, provider/model names, tool results) and make sure failures degrade gracefully to existing chat fallbacks.
7. **Docs + env** – Document env requirements, provider prefixes, and troubleshooting in `docs/ai/agents.md` + README sections; add `.env.example` entries and call out required secrets.
8. **Testing + rollout** – Add Vitest coverage for provider routing + agent utilities, update e2e ChatDock scripts to cover an agent-driven run, run `pnpm lint`, `pnpm test`, and relevant Playwright flows before landing.

Risks / unknowns
- Provider compatibility: AI SDK provider wrappers must implement streaming + tool call semantics expected by `openai-agents-js`; mismatch may need custom adapters.
- Resource/perf limits: Agent orchestration may require longer-running requests, so Nitro route timeouts or Vercel Edge constraints must be verified.
- Env/config drift: Different environments (local LM Studio vs. prod cloud) may expose inconsistent model IDs; need deterministic prefixes and validation.
- Tooling overlap: TanStack AI tools and agent tools could duplicate responsibilities; must define a clear ownership boundary to avoid recursive loops.

Testing & validation
- `pnpm lint`, `pnpm test`, plus targeted Vitest suites for new agent modules.
- Playwright scenario covering an end-to-end ChatDock request that triggers an agent workflow (both local LM Studio + CI mock endpoints).
- Manual server-function smoke test via `curl`/`pnpm ts-node` to ensure agents stream tokens/events correctly.
- Verify telemetry/log output in staging to confirm metadata fields populate as expected.

Rollback / escape hatch
- Guard agent-backed routes/tools behind a feature flag/search param + env switch so deployments can disable the integration without code changes; reverting the dependency + modules via git rollback remains the final fallback.

Owner/Date
- Codex / 2025-12-09
