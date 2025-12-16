# Chat Dock and Session Intelligence regressions

## Context
The Chat Dock currently breaks user-critical workflows:
- **Add to Chat** sends sessions and/or timeline events only to **Session Coach**, not **General**.
- Switching between **General** and **Session Coach** causes loss of loaded session context, and cleared chats can reappear after tab changes.
- **Chat history rendering** can fail to appear or persist until another message is sent.
- **Cross-repo rule sourcing** appears hardcoded: when a session from another repository is loaded, the dock continues to show the wrong rule set.
- **Message ordering** is not chronological.
- The Chat Dock pane is constrained by a fixed width and the **Instruction Source** UI uses space in a way that truncates chat content.
- **Session Intelligence** (Summary and Hook Discovery / Run Conversation Analyzer) crashes with a React error boundary showing `Unexpected 'className' prop, remove it`.
- The **Logger** route’s logs container does not scroll and the page grows indefinitely.

## Success criteria / acceptance
1. Clicking **Add to Chat** for a session or timeline event results in:
   - The same session/event context being available in **General** and **Session Coach**.
   - The user seeing a persistent indicator of the active session/event context in both tabs.
2. Switching between **General** and **Session Coach** does not:
   - Clear the active session/event context.
   - Drop chat history.
   - Resurrect a chat that the user intentionally cleared.
3. Chat history renders immediately on load and on any relevant state change (tab switch, session change) without requiring a new message.
4. Rule/instruction source reflects the active session’s repository; loading a session from repo B updates the rule set and UI to repo B.
5. Message list ordering is consistent and predictable (chronological by timestamp or sequence), with newest content appended at the end.
6. Chat pane does not truncate long content at the default layout; Instruction Source is accessible without reducing chat readability.
7. Summary and Hook Discovery execute without a React error boundary crash; results render successfully.
8. Logger route log list scrolls within a bounded container; page layout remains stable with large log volumes.
9. "New chat" and an explicit "Clear chat" action behave deterministically, and a chat history side panel exists to resume prior chats intentionally.

## Deliverables
- Fixes to Chat Dock routing, shared session/event context propagation, and tab state persistence.
- Reliable chat history render and deterministic message ordering.
- Dynamic loading and display of repository-specific rules/instruction source.
- Responsive/expandable Chat Dock layout; Instruction Source relocated or collapsible.
- Session Intelligence crash fix and shared output renderer stabilization.
- Logger route scrollable container.
- Chat history side panel + explicit Clear Chat UX, with persistence aligned to the product’s chosen storage model.
- Regression coverage: unit tests for state/model logic, and at least one end-to-end test for each critical workflow.

## Approach
### 1) Repository and component discovery (no assumptions about file paths)
- Locate the UI entry points for:
  - Session Explorer "Add to Chat".
  - Timeline Inspector "Add to Chat".
  - Chat Dock tabs: General and Session Coach.
  - Session Intelligence modal: Summary and Hook Discovery.
  - Logger route.
- Identify the state mechanism used (React local state, context, Zustand/Redux, URL state, etc.) and where conversation threads and session context live.

### 2) Define a single source of truth for session/event context
- Create/confirm a shared "active context" model that is independent of the selected tab.
  - Includes: active session id, optional event ids, repo identifier, and a human-readable label for UI.
- Ensure Add to Chat writes to this shared model, not a tab-specific store.
- Ensure both General and Session Coach read from the same shared model to render the context indicator and to send prompts with the correct context.

### 3) Fix Add to Chat broadcast behavior
- Update the Add to Chat action handler so that:
  - The active context is set once, globally.
  - Any tab-specific thread behavior (General vs Coach) does not block context visibility.
- Add a regression guard: if Add to Chat is invoked while General is active, Session Coach must still reflect the same context when the user switches tabs (and vice-versa).

### 4) Stabilize tab switching behavior (no context loss)
- Ensure tab switching is purely a view concern:
  - Does not clear active context.
  - Does not reset thread state unless the user explicitly starts a new chat or clears.
- Identify and remove any implicit "reset on unmount" behavior (e.g., unmounting tab contents causing state loss).
  - Prefer keeping stores above the tab switch boundary.

### 5) Fix chat history rendering latency
- Identify why history is not rendering until a new message is sent.
  - Common failure modes: missing subscription to store changes, memoization keyed incorrectly, virtualization not invalidating, or asynchronous hydration not triggering a rerender.
- Add explicit render invalidation hooks where needed so that:
  - Loading a thread, switching tabs, and receiving async messages immediately updates the view.

### 6) Enforce deterministic message ordering
- Decide the ordering key (server timestamp, client timestamp, or monotonically increasing sequence).
- Normalize message objects at ingestion time.
- Ensure rendering sorts consistently and handles partial/streamed assistant responses without reordering earlier messages.

### 7) Correct repository-specific rule/instruction sourcing
- Replace any default/hardcoded rule source behavior with dynamic resolution keyed by the active context’s repository.
- Ensure the Instruction Source UI displays:
  - Which repository/rule set is active.
  - When it last updated (optional but useful for debugging).
- Add cache invalidation: loading a session from a new repo must invalidate the previous repo rules.

### 8) Layout fixes: avoid truncation, make Instruction Source non-blocking
- Remove fixed-width constraints on the chat pane where they truncate content.
- Move Instruction Source controls inline (header row) and/or make the panel collapsible.
- Validate with long tables and code blocks so content remains readable without hidden overflow.

### 9) Fix Session Intelligence crash (`Unexpected 'className' prop`)
- Identify the shared renderer used to display Summary and Hook Discovery outputs.
- Audit the props being passed into the renderer and remove/replace any invalid prop usage.
- Add a single wrapper component for markdown/rich-text rendering and use it consistently across all AI-output surfaces.
- Add a regression test that renders representative output payloads for Summary and Hook Discovery without triggering the error boundary.

### 10) Logger route: bounded, scrollable logs
- Add a fixed height/max-height container for logs and ensure internal scrolling.
- Confirm long-running logging sessions do not change overall page height.

### 11) New Chat persistence, Clear Chat, and Chat History side panel
- Define conversation thread lifecycle:
  - "New chat" creates a new thread id and switches to it.
  - "Clear chat" clears the current thread’s message list (optionally with confirmation).
  - Prior threads are accessible via a history side panel and do not reappear unless selected.
- Choose persistence aligned with the product:
  - If chats are server-stored, wire history panel to the existing API.
  - If chats are client-only, persist thread metadata and messages to local storage with a bounded limit.
- Ensure tab switching never overrides the current thread selection.

## Risks / unknowns
- The underlying architecture (single vs multiple stores, SSR/hydration, streaming responses) is unknown until code discovery.
- "Broadcast to both" can mean either shared context only, or duplicated message injection into both threads; default plan assumes shared context with distinct threads.
- Chat history persistence expectations (device-local vs server, retention policy, privacy constraints) may require product clarification; implement behind a feature flag if uncertain.
- The Session Intelligence crash could be caused by a renderer version mismatch or a wrapper component; changes should be scoped to the smallest shared surface.

## Testing & validation
- Unit tests:
  - Active context store: set, clear, repo switch, event add/remove.
  - Message normalization and ordering.
  - Thread lifecycle: new chat, clear chat, history selection.
- Component tests:
  - General and Session Coach render the same active context indicator.
  - Instruction Source updates on repo change.
  - Markdown/rich output renderer renders without error boundary.
- End-to-end tests (Playwright/Cypress):
  1. Add to Chat from Session Explorer → verify context visible in General and Session Coach after tab switches.
  2. Add to Chat from Timeline Inspector → verify context visible in both tabs.
  3. Switch tabs repeatedly → no context loss; history remains.
  4. New chat + clear chat → tab switch does not resurrect cleared chat; history panel restores prior thread only when selected.
  5. Run Summary + Hook Discovery → outputs render; no crash.
  6. Logger route with many entries → container scrolls, page height stable.

## Rollback / escape hatch
- Gate any state model changes and the new history side panel behind feature flags.
- Keep the legacy thread/context behavior available for quick rollback until acceptance tests pass.
- If the Session Intelligence fix requires dependency upgrades, isolate the change to a wrapper component to minimize blast radius.

## Owner / date
- Owner: Session Viewer / Chat Dock engineering
- Date: 2025-12-15

## Assumptions / open points
- General and Session Coach are distinct conversation threads but share a single active session/event context.
- Session Intelligence outputs are rendered through a shared markdown/rich-text renderer.
- Repo-specific rules are derived from a repository identifier attached to the loaded session.
