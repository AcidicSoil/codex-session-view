## Issue Ticket: Session observability gaps + unclear log/artifact handling under repo size constraints

**Type:** Product/Engineering Issue (Backend + Platform/DevEx)
**Priority:** High (blocks debugging and operational control when running many sessions)

### 1) Context

* Workflow involves running multiple “sessions” (user reports triggering ~20 sessions) and needing to monitor completion/state.
* Project/repo context includes large artifacts:

  * “project has >100mb”
  * “demo gif has 31mb”
* User uncertainty about where logs should be pushed/stored (“did you push the logs here?”).

### 2) Observed Behavior

* Session management does not provide enough visibility to determine which sessions are still running vs finished when many sessions exist.
* The “Open Session” action is unclear to users (“what does open session do?”).
* Users are unclear where logs should be pushed/uploaded and are encountering practical limits with large artifacts (repo size >100MB; demo GIF 31MB), creating confusion about expected storage/transport paths for debugging evidence.

### 3) Expected Behavior

* Users can reliably determine session state across many concurrent/recent sessions (e.g., running/queued/succeeded/failed) along with relevant timing metadata (start/end/last update) and identifiers.
* “Open Session” behavior is clearly described so users understand what it does and what to expect when using it.
* Clear, consistent expectations for log and artifact handling:

  * Where logs should be placed/linked for debugging.
  * What size constraints apply to repos/artifacts.
  * What the supported workflow is when artifacts exceed typical repository limits.

### 4) Impact / Requirement

* **Operational risk:** Inability to identify active vs completed sessions increases wasted compute, delays incident/debug cycles, and raises the chance of leaving long-running sessions unattended.
* **Reliability/data correctness risk:** Logs are essential for backend diagnosis; uncertainty about log location/storage reduces traceability and slows root-cause isolation.
* **DevEx friction:** Size constraints and unclear artifact expectations lead to failed/avoided sharing of evidence (logs, demos), increasing support overhead and slowing iteration.

### 5) Reproduction (from user report)

1. Trigger ~20 sessions in the product/workflow.
2. Navigate to the sessions view/listing.
3. Attempt to determine which sessions are still running vs completed.
4. Use “Open Session” and observe that its intent/behavior is not self-evident.
5. Attempt to share/push logs and demo assets; observe practical constraints and confusion when repo/artifacts are large.

### 6) Evidence (from screenshot text)

* “you project has >100mb”
* “did you push the logs here?”
* “ah you bundle codex here and the demo gif has 31mb ^^”
* “what does open session do?”
* “i would be really cool to see which sessions are still running”
* “i have triggered around 20 sessions and so i can see which one is finished and one is still working”
