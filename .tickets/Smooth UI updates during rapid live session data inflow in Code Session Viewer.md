Title:

* Smooth live update rendering in Code Session Viewer to prevent flicker/jumping under high-frequency inflow

Summary:

* During an active live session in the Code Session Viewer, rapid incoming updates (new events/log entries) render abruptly and feel visually jarring (“violent”), with content flashing or jumping.
* Implement update-handling that preserves UI stability under high-frequency changes (e.g., buffering/batching and removing hostile animations/layout churn) so users can follow the session comfortably.

Background / Context:

* Issue occurs specifically during an active live session when the app receives a stream of rapid updates (new events/log entries).
* Assistant analysis attributes instability to repeated full reload/reparse and per-event state commits during parsing, combined with virtualization + animations + measurement feedback loops.

Current Behavior (Actual):

* Rapid updates are rendered abruptly and feel “violent and jarring.”
* UI content “flashing or jumping aggressively” as new data arrives.
* Assistant-identified contributors (implementation-level, per assistant):

  * SSE watcher triggers `reloadActiveSession()` on every update, causing repeated full resets/rebuilds via `loader.start(file)` under rapid traffic.
  * Parser dispatches React state updates per event (`dispatch({ type: 'event' })`), cloning the events array each time (`events: [...state.events, action.event]`), causing reconciliation thrash.
  * Timeline rows animate on view-entry (`initial` → `whileInView`, `viewport={{ once: false }}`), which repeatedly re-triggers in virtualized contexts (remount/enter view), perceived as flashing.
  * Virtualizer measures DOM each render (`getBoundingClientRect()` in `useLayoutEffect`) and feeds measurements back, amplifying layout churn during frequent commits.
  * Full-list dedupe (`dedupeTimelineEvents(events)`) runs on every events change, causing repeated O(n) work and frame drops.

Expected Behavior:

* UI remains visually stable while processing rapid incoming data during live usage.
* Updates are presented smoothly without distracting flicker/jumps.

Requirements:

* Handle high-frequency live updates gracefully to maintain visual stability.
* Implement an update mechanism such as buffering/batching and/or smoother transitions to prevent flickering/jumping during live sessions.
* Proposed implementation tactics (per assistant; treated as candidate requirements/approach, not confirmed decisions):

  * Decouple ingest rate from render rate (flush on `requestAnimationFrame` or every 50–200ms).
  * Stop full reloads per watcher ping; instead delta/tail updates or throttle/debounce reload cycles.
  * Batch parsed events into single commits (≤ ~20 commits/sec target suggested by assistant).
  * Throttle persistence/snapshot writes to the same batching cadence (or “done”).
  * Remove/limit `whileInView` animations on virtualized rows; animate only new tail item (or none).
  * Reduce measurement churn (ResizeObserver or accept estimated heights unless necessary).
  * Incremental dedupe using a `seen` set rather than re-filtering whole list each update.

Out of Scope:

* Not provided.

Reproduction Steps:

1. Start a live session in Code Session Viewer.
2. Receive a rapid stream of updates (new events/log entries).
3. Observe abrupt rendering (flashing/jumping).

Environment:

* OS: Unknown
* Browser: Unknown
* App version/build: Unknown
* Device: Unknown
* Deployment (prod/stage/local): Unknown

Evidence:

* User phrasing: “violent” (per user).
* Symptom description: “flashing or jumping aggressively” (per assistant).
* Reference file: Smooth UI updates.md.

Decisions / Agreements:

* No explicit decisions recorded.
* Proposed approach (per assistant): buffering/batching and/or smoother transitions; stop full reload per update; remove hostile animations; reduce layout measurement churn; incremental dedupe.

Open Items / Unknowns:

* Which UI surfaces are affected (event list, detail pane, both): Unknown
* Whether auto-scroll behavior contributes to jumps: Unknown
* Target behavior when user is actively scrolling/reading older entries: Unknown
* Acceptable latency introduced by buffering/batching: Unknown
* Update frequency/volume that triggers the problem: Unknown
* Source code referenced by user (“Here’s the source code.”) is not provided in the captured content.

Risks / Dependencies:

* Not provided.

Acceptance Criteria:

* During an active live session receiving rapid incoming updates, the UI does not visibly flicker or jump distractingly.
* Incoming updates are presented more smoothly (e.g., via buffering/batching and/or transitions) while preserving usability for tracking the session.
* UI remains readable and visually stable under high-frequency updates (no repeated remount-driven animations; no per-event commit thrash).

Priority & Severity (if inferable from text):

* Not provided.

Labels (optional):

* bug
* ui
* live-session
* stability
