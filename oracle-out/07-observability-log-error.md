Direct answer (1–4 bullets, evidence-cited)

Persisted on server only, and only for error level: when typeof window === 'undefined' && level === 'error', logError() schedules appendServerLog({ level, scope, message, meta }), which appends a single-line entry to a local file (logs/dev.log by default). Evidence: emit() conditional in src/lib/logger.ts, and file append implementation in src/lib/logger.server.ts.

Forwarding from browser is best-effort (not reliable): on the client, every log level calls forwardToServer(...), which queueMicrotasks a forwardBrowserLog(payload) call and swallows both sync and async errors (no retry/backoff, no persistence on failure). Evidence: forwardToServer() in src/lib/logger.ts.

Metadata is optional and not enforced for diagnosis: persisted lines and forwarded payloads include {level, scope, message, timestamp, meta} where meta is caller-supplied and JSON-serialized; there’s no guaranteed inclusion of request ID / session ID / user ID / route / model/mode unless every call site provides it. Evidence: payload shape in forwardToServer() and serializeMeta() in src/lib/logger.ts, and line format in appendServerLog() in src/lib/logger.server.ts.

Risks/unknowns (bullets)

Unknown browser ingestion/persistence path: src/lib/logger.client.ts is not shown, so it’s unclear where browser logs go, whether they’re authenticated, batched, rate-limited, or actually persisted server-side.

Silent logging failures: both the server file append (appendServerLog(...).catch(() => {})) and browser forwarding swallow errors, so logging can fail without any signal. Evidence: emit() and forwardToServer() in src/lib/logger.ts.

Deployment persistence risk: file-based logs (SERVER_LOG_DIR/SERVER_LOG_FILE) may not persist in serverless/ephemeral filesystems or may not be collected into centralized logging without extra plumbing. Evidence: src/lib/logger.server.ts.

Timestamp ambiguity: server file lines use a fresh server timestamp, not the original browser payload timestamp; cross-client ordering and correlation may be confusing. Evidence: server timestamp creation in appendServerLog() and browser timestamp in forwardToServer().

Next smallest concrete experiment (1 action)

Run ck --regex "forwardBrowserLog|logger\\.client|appendServerLog\\(|SERVER_LOG_(DIR|FILE)" src and then open src/lib/logger.client.ts plus the server route/handler it calls to confirm whether browser logs are persisted and what metadata is attached.

If evidence is insufficient, exact missing file/path pattern(s) to attach next

src/lib/logger.client.ts

src/lib/logger.types.ts

Any server ingestion endpoint(s) hit by forwardBrowserLog (attach matches): src/routes/**/*log*.*, src/server/**/*log*.*, and/or any file containing forwardBrowserLog( usage outside src/lib/logger.ts
