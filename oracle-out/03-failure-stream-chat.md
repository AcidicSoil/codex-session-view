## 1) Direct answer (1–4 bullets, evidence-cited)

* **Invalid input → stable `400` JSON shape**: `streamInputSchema.safeParse(payload)` failure returns `jsonResponse({ error: 'INVALID_INPUT', issues: input.error.flatten() }, 400)`. Evidence: `streamChatFromPayload` early return.
* **Disabled mode → stable `403` JSON shape (code-only)**: `assertChatModeEnabled(input.data.mode)` is wrapped in `try/catch` and returns `jsonResponse({ code: error.code ?? 'MODE_NOT_ENABLED' }, 403)`. Evidence: `streamChatFromPayload` mode gate.
* **Invalid model selection → stable `400` JSON shape**: `resolveModelForMode(...)` failure returns `jsonResponse({ error: 'INVALID_MODEL', message: ... }, 400)`. Evidence: `streamChatFromPayload` model resolution catch.
* **Provider “unavailable” → stable `503` JSON shape; other provider failures are *not* mapped here**: only `isProviderUnavailableError(error)` returns `jsonResponse({ code: 'MODEL_UNAVAILABLE', message: ... }, 503)`; otherwise it logs and `throw error`, so the HTTP code/shape depends on the upstream framework handler. Evidence: final `catch` in `streamChatFromPayload` (`return ...503` vs `throw error`).

Routing is consistent with the above: the route handler attempts `request.json()`, sets `body=null` on parse failure, and then calls `streamChatFromPayload(body)`; this deterministically produces the `INVALID_INPUT` `400` case for malformed JSON. Evidence: `src/routes/api/chatbot/stream.ts` POST handler.

## 2) Risks/unknowns (bullets)

* **Non-unavailable provider/runtime errors can escape as non-deterministic HTTP/shape** because `streamChatFromPayload` rethrows for anything not matched by `isProviderUnavailableError`. If the SSR handler returns a generic 500 HTML/plain response, client retry logic can break.
* **Streaming-specific failure modes may bypass JSON** depending on how `handleGeneralChatStream` / `handleSessionChatStream` construct streaming responses (e.g., headers already sent, partial body written).
* **`jsonResponse` contract is unknown** (content-type, envelope, consistent fields like `code` vs `error`) which affects client parsing and stability guarantees.
* **Mismatch across endpoints**: `analyzeChatFromPayload` returns `{code:'MODE_NOT_ENABLED'}` with **HTTP 200** when `mode !== 'session'`, while `streamChatFromPayload` uses **403** for disabled modes—clients might assume uniform semantics across endpoints.

## 3) Next smallest concrete experiment (1 action)

* Run: `ck --regex "throw error|jsonResponse\\(|isProviderUnavailableError|ProviderUnavailableError|handle(Session|General)ChatStream" src/server/chatbot-api src/server/chatbot-api.server.ts src/routes/api/chatbot/stream.ts`
  Purpose: confirm whether *any* upstream layer catches the rethrow and normalizes it to a stable `{code|error,...}` JSON response (and identify additional mapped error categories beyond “provider unavailable”).

## 4) If evidence is insufficient, exact missing file/path pattern(s) to attach next

* `src/server/chatbot-api/response.ts` (definition of `jsonResponse`, headers, envelope consistency)
* `src/server/chatbot-api/errors.ts` (definition of `isProviderUnavailableError`, what else is classified)
* `src/server/chatbot-api/stream.ts` (streaming response format + error handling inside streaming)
* Any SSR/server error boundary/middleware that converts thrown errors into responses, likely one of:

  * `src/server/**/request*.ts`, `src/server/**/router*.ts`, `src/server/**/middleware*.ts`, `src/routes/**/__root*` (TanStack SSR error handling)
