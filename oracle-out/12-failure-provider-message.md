Direct answer (1–4 bullets, evidence-cited)

Actionable provider messages are preserved via pass-through, because getProviderErrorMessage returns error.data?.error?.message ?? error.message for isAiProviderError(error) and otherwise falls back to error.message / string / generic text. Evidence: const aiMessage = ... ?? error.message; if (aiMessage) return aiMessage; ... if (error instanceof Error) return error.message; if (typeof error === 'string') return error; in src/server/chatbot-api/errors.ts:getProviderErrorMessage.

Sensitive-data leakage is not actively prevented, because there is no redaction/sanitization before (a) logging and (b) returning the message to the client. Evidence: handleAnalyzeChat sets const message = getProviderErrorMessage(error) then logs error: message and responds jsonResponse({ code: 'MODEL_UNAVAILABLE', message }, 503) in src/server/chatbot-api/analyze.ts (provider-unavailable branch).

The “normalization” is minimal (mostly “choose a message”), not a safe normalization contract. It does not constrain length/content, strip request details, or map to a safe allowlist—so any provider-supplied text is effectively trusted. Evidence: no filtering logic in getProviderErrorMessage; direct return of aiMessage / error.message / error.

Potential over-classification increases exposure, because isAiProviderError only checks that error.data exists and is an object ('data' in error && typeof ...data === 'object'), so non-provider errors that happen to have a data object could be treated as provider errors and their messages propagated to logs/client. Evidence: src/server/chatbot-api/errors.ts:isAiProviderError and the if (isProviderUnavailableError(error) || isAiProviderError(error)) { ... return ...503 } branch in analyze.ts.

Risks/unknowns (bullets)

Unknown whether your upstream AI runtime/provider SDK ever includes prompt excerpts, repository paths, headers, or request identifiers inside error.data.error.message or error.message; if it does, those will be logged and returned.

Unknown what ProviderUnavailableError contains (message composition, whether it embeds provider response bodies, etc.); it is treated as safe to display via getProviderErrorMessage.

Unknown where logWarn ultimately forwards/persists logs; if logs are user-accessible in any environment, the same leakage risk applies (and possibly worse if logs include more context elsewhere).

Next smallest concrete experiment (1 action)

Run: ck --regex "getProviderErrorMessage|isAiProviderError|MODEL_UNAVAILABLE" src and inspect all call sites plus any code that constructs/throws ProviderUnavailableError (and other provider errors) to see what message bodies can contain before they reach getProviderErrorMessage.

If evidence is insufficient, exact missing file/path pattern(s) to attach next

src/server/lib/aiRuntime* (especially the definition/throw sites for ProviderUnavailableError and any provider error wrapping)

src/lib/ai/** (provider client adapters; anywhere errors from OpenAI/Anthropic/etc. are normalized into error.data.error.message)

src/lib/logger.ts and src/lib/logger.types (to confirm log sinks, redaction, and whether logs are exposed)

src/server/chatbot-api/response.ts (to confirm response shaping/serialization and whether additional error details are included)
