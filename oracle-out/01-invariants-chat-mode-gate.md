1. Direct answer (1–4 bullets, evidence-cited)

* **For streaming, `assertChatModeEnabled` does gate both `session` and `general`—at least in `streamChatFromPayload`.** The function calls `assertChatModeEnabled(input.data.mode)` after schema validation and before model resolution / stream dispatch, so both `handleGeneralChatStream` and `handleSessionChatStream` are behind the same gate. (Evidence: `src/server/chatbot-api.server.ts:streamChatFromPayload` calls `assertChatModeEnabled(input.data.mode)` before the `if (input.data.mode === 'general') ... else ...` dispatch.)
* **The gate is currently a single feature flag applied to *all* modes.** `getChatModeDefinition` sets `enabled = featureFlags.sessionCoach.enabled()` regardless of `mode`, so turning that flag off disables *both* `session` and `general` streaming. (Evidence: `src/features/chatbot/chatModeConfig.ts:getChatModeDefinition`.)
* **For analysis, `general` is blocked via an early return that bypasses `assertChatModeEnabled` entirely.** `analyzeChatFromPayload` returns `{ code: 'MODE_NOT_ENABLED' }` with HTTP **200** when `mode !== 'session'`, so “general analyze” is disabled even if the feature flag is on, and it’s not using the same gating mechanism or status code as streaming. (Evidence: `src/server/chatbot-api.server.ts:analyzeChatFromPayload` `if (input.data.mode !== 'session') return jsonResponse({ code: 'MODE_NOT_ENABLED' }, 200)`.)
* **Whether there are bypasses across *all* API entry points cannot be concluded from the provided files alone.** You’ve shown two entry points (`streamChatFromPayload`, `analyzeChatFromPayload`), both of which prevent access when disabled (albeit inconsistently for analyze), but this does not prove other routes/controllers don’t call stream/analyze handlers directly without the assert. (Evidence: absence of other call sites in provided snippets.)

2. Risks/unknowns (bullets)

* **Unknown call sites:** There may be other API entry points (routes, actions/loaders, RPC handlers) that invoke `handleGeneralChatStream`, `handleSessionChatStream`, or `handleAnalyzeChat` directly, bypassing `assertChatModeEnabled`.
* **Flag coupling risk:** Using `featureFlags.sessionCoach.enabled()` to gate *both* `session` and `general` may be unintended coupling; it makes “general chat” availability depend on a “session coach” flag.
* **Inconsistent contract for analyze:** Returning **200** with `{code:'MODE_NOT_ENABLED'}` (instead of 403 like streaming) can cause client-side logic drift (e.g., treating it as success and caching, or not triggering auth/feature messaging).
* **Mode expansion risk:** If additional modes are introduced later, the current design will automatically gate them behind the same flag unless per-mode gating is added.

3. Next smallest concrete experiment (1 action)

* Run: `ck --regex "assertChatModeEnabled" src`
  Then verify every externally reachable request path (routes/controllers) funnels through a call site, and separately inspect any code paths that call `handleGeneralChatStream|handleSessionChatStream|handleAnalyzeChat` without going through `streamChatFromPayload/analyzeChatFromPayload`.

4. If evidence is insufficient, exact missing file/path pattern(s) to attach next

* Route/entry wiring that exposes these functions: `src/routes/**` (especially any `*chat*`, `*chatbot*`, `*api*` files)
* Server entry points / controllers beyond the one file shown: `src/server/**` and specifically `src/server/chatbot-api/**` (other exported handlers)
* Any direct handler usage: files matching `src/**/stream.ts`, `src/**/analyze.ts`, and any files containing `handleGeneralChatStream`, `handleSessionChatStream`, or `handleAnalyzeChat` call sites.
