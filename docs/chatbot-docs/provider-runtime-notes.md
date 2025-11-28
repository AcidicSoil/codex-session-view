# Multi-provider runtime wiring

## Gemini CLI
- Uses `createGeminiProvider` from `ai-sdk-provider-gemini-cli` with OAuth personal auth by default (`gemini` CLI flow caches credentials in `~/.gemini/oauth_creds.json`).
- Quick start:
  1. `pnpm dlx @google/gemini-cli-core install` (or follow the upstream README) and run `gemini` once to finish the login flow.
  2. Leave `GEMINI_AUTH_TYPE` unset for OAuth; set `GEMINI_AUTH_TYPE=api-key` + `GEMINI_API_KEY=<token>` to force API key usage.
  3. Optional: `GEMINI_CACHE_DIR` to relocate the CLI cache, `GEMINI_PROXY` for corporate proxies, and `GEMINI_VERTEX_*` envs when targeting Vertex.
- When the CLI is missing or logged out, the chatbot now surfaces a `MODEL_UNAVAILABLE` error instead of crashing—users see the friendly message “Gemini CLI provider is not available…”.

## Codex CLI
- Uses `codexCli` from `ai-sdk-provider-codex-cli`, mirroring the behavior outlined in `gemini-cli_codex-cli_provider-registration-noAPI_AUTH.md` and the upstream README. OAuth tokens live in `~/.codex/auth.json` after `codex login`.
- Setup checklist:
  1. Install the latest Codex CLI (`pnpm dlx @openai/codex@latest` or `npm i -g @openai/codex`).
  2. Run `codex login` so the OAuth tokens land in `~/.codex/auth.json`. (Optional) Set `AI_CODEX_CLI_API_KEY` to inject an API token for backup usage.
  3. Tune sandbox/approvals with `AI_CODEX_CLI_APPROVAL_MODE`, `AI_CODEX_CLI_SANDBOX_MODE`, `AI_CODEX_CLI_ALLOW_NPX`, etc.
- If the binary is missing or approvals reject the run, `/api/chatbot/stream` responds with `MODEL_UNAVAILABLE` and the UI tells the user the Codex provider needs attention.

## LM Studio
- Runs through the OpenAI-compatible endpoint documented under `docs/lmstudio/*.md`. Default base URL `http://127.0.0.1:1234/v1` with API key placeholder `lm-studio`.
- Update `AI_LMSTUDIO_BASE_URL`/`AI_LMSTUDIO_API_KEY` to match your LM Studio server or remote GPU host.
- Quick start:
  1. Install LM Studio and the `lms` CLI (`npx lmstudio install-cli`).
  2. Start the server (`lms server start`) or enable the Developer server inside the desktop app.
  3. Set `AI_LMSTUDIO_BASE_URL` (default `http://127.0.0.1:1234/v1`) and `AI_LMSTUDIO_API_KEY` (LM Studio ignores the value but requires a string).
  4. Select “LM Studio Local” inside the Chat Dock—this model now appears for both Session and General chat modes.
- When the local server is offline the backend returns `MODEL_UNAVAILABLE` so the UI can inform the user without crashing.

## Logging & errors
- Each provider now pipes verbose diagnostics through `~/lib/logger`, so server logs / console capture show approval/sandbox mismatches, CLI initialization failures, and LM Studio connectivity hints.
- Missing critical envs throw early with a descriptive error so Start loaders can surface actionable remediation steps.
- `/api/chatbot/stream` and the Chat Dock handle provider failures gracefully. When a provider is missing credentials, not installed, or offline the response payload looks like:
  ```json
  { "code": "MODEL_UNAVAILABLE", "message": "LM Studio provider is not reachable..." }
  ```
  The UI displays the message inline while developers see the structured log (with providerId, modelId, etc.).
