Direct answer (1–4 bullets, evidence-cited)

Disconnect cleanup is mostly covered and idempotent: the stream registers request.signal.addEventListener('abort', close) and also calls cleanup() from ReadableStream.cancel(). The close() function guards with closed to avoid double-closing, clears the heartbeat interval, calls unsubscribe(), and controller.close(). Evidence: abort listener + cancel() cleanup + closed guard + clearInterval(heartbeat) + unsubscribe() + controller.close().

Heartbeat exists but can be late for some infrastructures: it sends { type: 'ping' } every 15s via setInterval(() => send({ type: 'ping' }), 15000), but it does not send an immediate first byte unless an upload event arrives before 15s. Evidence: heartbeat interval is 15,000ms; send() is only invoked from the watcher callback or the interval.

Resilience gaps for reconnection/ordering: messages are emitted only as data: <json>\n\n with no id: and no event: types, so clients can’t resume with Last-Event-ID, and the server can’t express event classes without encoding them in JSON. Evidence: controller.enqueue(encoder.encode(\data: ${JSON.stringify(payload)}\n\n`))` only.

Error handling is thin: if subscribeToUploadWatcher(...) throws, or if controller.enqueue(...) throws due to a disturbed controller (edge cases), there’s no try/catch and no controller.error(...) path. Evidence: start(controller) { ... const unsubscribe = subscribeToUploadWatcher(...); ... controller.enqueue(...) ... } without error handling.

Risks/unknowns (bullets)

Whether request.signal reliably aborts on client disconnect in your actual deployment/runtime (Node adapter, proxies, serverless), or whether only cancel() triggers.

Whether subscribeToUploadWatcher is guaranteed to be safe to call unsubscribe() exactly once and safe if close() is invoked multiple times.

Whether upstream proxies/LBs require earlier keep-alive bytes (some terminate “idle” SSE connections faster than 15s, and some require an initial flush almost immediately).

Potential listener leak: request.signal.addEventListener('abort', close) is never removed; usually fine because the request dies, but worth confirming in long-lived server processes.

Next smallest concrete experiment (1 action)

Run a manual disconnect test and watch server logs/resources: open an SSE connection, then drop it and confirm unsubscribe() and interval cleanup happen exactly once (and no further sends occur). Example: curl -N http://localhost:<port>/api/uploads/<id>/watch then Ctrl+C; add a temporary log inside close() and inside the watcher’s unsubscribe() implementation to confirm ordering and idempotence.

If evidence is insufficient, name the exact missing file/path pattern(s) to attach next

src/server/lib/sessionUploadWatchers.server.ts (the subscribeToUploadWatcher implementation: does it handle rapid reconnects, multiple subscribers, and idempotent unsubscribe?)

src/server/persistence/sessionUploads.server.ts (the getSessionUploadSummaryById implementation/signature: sync vs async, and any side effects)

Any server adapter/runtime glue that affects streaming/SSE behavior (e.g., React Start / Nitro / Node handler config) if it exists under something like src/server/** or src/routes/** hosting configuration.
