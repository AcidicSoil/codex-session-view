Direct answer (aligned? 1–4 bullets, evidence-cited)

prompt is required and must be a non-empty string (z.string().min(1)), so any client that sometimes omits prompt (or sends "") will be rejected with 400 INVALID_INPUT. Evidence: streamInputSchema requires prompt and streamChatFromPayload returns jsonResponse({ error: 'INVALID_INPUT', ... }, 400) on schema failure. (src/server/chatbot-api/schema.ts, src/server/chatbot-api.server.ts)

mode defaults to "session" when omitted, and the server immediately gates it via assertChatModeEnabled(mode); so a client relying on “default mode” is aligned only if the intended default truly is session. Evidence: mode: ... .default('session') and assertChatModeEnabled(input.data.mode) with 403 on failure. (src/server/chatbot-api/schema.ts, src/server/chatbot-api.server.ts)

metadata is accepted by the stream contract but is only forwarded in session mode; in general mode it’s ignored (not passed to handleGeneralChatStream). If the client expects metadata to affect general-mode behavior, that expectation is not aligned. Evidence: session path passes metadata: input.data.metadata ?? undefined; general path does not include metadata. (src/server/chatbot-api.server.ts)

modelId is optional and is used for both modes via resolveModelForMode(mode, modelId); invalid combinations become 400 INVALID_MODEL. This is aligned if the client treats modelId as a hint/override rather than a guaranteed accepted value. Evidence: modelId: z.string().optional() and try/catch around resolveModelForMode(...) returning { error: 'INVALID_MODEL' ... }, 400. (src/server/chatbot-api/schema.ts, src/server/chatbot-api.server.ts)

Risks/unknowns

Null vs undefined mismatch: metadata, modelId, threadId, clientMessageId do not accept null; clients that serialize optional fields as null will fail validation (400). (src/server/chatbot-api/schema.ts)

Field-shape drift on metadata: only { misalignmentId, ruleId, severity, eventRange{startIndex,endIndex} } is allowed; any extra keys will be rejected under Zod’s default object behavior (unless .passthrough() is used elsewhere, which it isn’t here). (src/server/chatbot-api/schema.ts)

Client alignment is unverified: no client payload-construction code is shown, so we can’t confirm whether it sends metadata in general mode, uses null, or relies on mode defaulting.

Next smallest concrete experiment (1 action)

Run: ck --regex "streamInputSchema|streamChatFromPayload|clientMessageId|metadata|modelId|/chatbot|handle(Session|General)ChatStream" src and inspect the client-side call site that constructs the stream payload to confirm exact keys + null/undefined behavior.

If evidence is insufficient, attach next

The file(s) that construct and POST the stream payload on the client, typically matching one of these patterns:

src/**/chatbot*.* (client helper/module)

src/**/stream*.* (streaming fetch wrapper)

src/routes/** entries that call the stream endpoint (Remix/Next route actions/loaders)

Any fetch("/...") or api.*.stream(...) wrapper that includes sessionId, prompt, mode, metadata, `mode*
