Title:

* Fix Chat Dock regressions: “Add to Chat” routing, context persistence, cross-repo rules, message rendering/order, AI Analysis crashes, logger scroll, New Chat persistence

Summary:

* Multiple Chat Dock regressions break core workflows: sessions/events sent via “Add to Chat” are routed incorrectly and session context is lost when switching tabs.
* Chat history rendering and ordering are unstable, repository-specific rules appear hardcoded to a default repo, and layout constraints truncate content.
* “AI Analysis” features (Summary + Hook Discovery analyzer) crash the UI with an error boundary, and the logger route grows unbounded due to a non-scrollable log container.

Background / Context:

* Users can send sessions and/or timeline events into the Chat Dock via “ADD TO CHAT” from at least two entry points: Session Explorer and Timeline Inspector/event cards.
* Chat Dock has multiple tabs/contexts (“General” and “Session Coach”), plus “Session Intelligence” views (Summary, Hook Discovery).
* Multi-repo usage is expected; sessions may come from different repositories with different rule sets.

Current Behavior (Actual):

* “ADD TO CHAT” sends sessions/events only to “Session Coach”, not “General”.
* Requirement clarification from user: data must be available in both “General” and “Session Coach” for the feature to work as intended.
* When “General” tab is selected, session context is missing (“no longer the session context”).
* Switching back to “Session Coach” also loses the previously loaded session context.
* Chat history does not stay rendered until another message is sent (history appears “stale/empty” until interaction).
* Loading a session from another repo with different rules does not update displayed/applied rules; rules appear hardcoded and always show the same set.
* Message ordering is incorrect: the user’s first input appears at the top, but the newest output appears directly underneath it (chronology scrambled).
* Chat Dock responds with rule/context content not related to the loaded session; repeatedly references `codex-session-view` and React-oriented content even when sessions are from other repos (e.g., `crawl4ai-webScraper`, `lms-dspy-SessionAnalyst`).
* Chat Dock view pane is fixed width; content in chat (e.g., wide tables/snippets) is cut off/truncated; “Instruction Source” area consumes space and contributes to truncation.
* “AI Analysis”/Summary flow crashes with error boundary: `Unexpected 'className' prop, remove it`.
* Hook Discovery → “Run Conversation Analyzer” loads a model and starts analysis, then fails shortly after and ends with the same crash/error message as Summary.
* Logger route: log container is not scrollable; as logs grow the page grows indefinitely.
* Chat Dock “New chat” clears temporarily, but after switching tabs and returning, the previous chat reappears.

Expected Behavior:

* “ADD TO CHAT” broadcasts the selected session/event to both “General” and “Session Coach” contexts.
* Switching between “General” and “Session Coach” does not drop loaded session context or conversation state unless the user explicitly clears it.
* Chat history renders immediately and stays rendered without requiring a new message to “wake” the UI.
* Repository-specific rule context updates based on the repository associated with the currently loaded session; no default/hardcoded repo leakage.
* Messages display in a coherent chronological order.
* Chat Dock layout is responsive/expandable so no chat content is cut off; “Instruction Source” is placed inline with the Chat Dock and does not reduce readable chat area.
* Summary and Hook Discovery analyzer complete without crashing and render their output normally.
* Logger view uses a scrollable container so the page height remains stable as logs grow.
* “New chat” (or explicit “Clear chat”) persists across tab switches; previous chats only appear via an intentional history mechanism.

Requirements:

* Route/broadcast “Add to Chat” payloads to both destinations: “General” + “Session Coach”.
* Preserve session context across Chat Dock tab switches (General ↔ Session Coach).
* Persist chat history rendering without requiring additional user messages.
* Ensure rule/instruction source reflects the active session’s repository (no hardcoded default rules).
* Fix message ordering to a consistent chronological sequence.
* Remove/resolve the crash on Summary and Hook Discovery “Run Conversation Analyzer” that surfaces `Unexpected 'className' prop, remove it`.
* Make logger container scrollable to prevent unbounded page growth.
* Chat Dock layout: avoid fixed-width truncation; move “Instruction Source” inline and allow expansion so chat content is never cut short.
* Add explicit “Clear chat” behavior that truly clears/persists across navigation, plus a dedicated chat history side panel for continuing past chats by choice.

Out of Scope:

* Not provided

Reproduction Steps:

1. From Session Explorer, click “ADD TO CHAT” on a session card.
2. Observe session data appears only in “Session Coach” and not in “General”.
3. Switch to “General” tab; observe session context is missing.
4. Switch back to “Session Coach”; observe session context is also missing/reset.
5. Observe chat history does not render/persist until sending a new message.
6. Load/send a session from a different repository with different rules; observe rules displayed/applied do not change and appear hardcoded (often referencing `codex-session-view`).
7. Review chat transcript ordering; observe newest assistant output appears directly under the first user input (scrambled chronology).
8. In Session Intelligence, click “Summary”; observe error boundary with `Unexpected 'className' prop, remove it`.
9. In Hook Discovery, click “Run Conversation Analyzer”; observe model starts loading, then fails and shows the same error.
10. Navigate to logger route (`/logs`); observe log container does not scroll and page height grows as logs accumulate.
11. Click “New chat” to clear; switch tabs and return; observe previous chat reappears.

Environment:

* App: Unknown (web app with Chat Dock, Session Explorer, Timeline Inspector, Logger route)
* OS: Unknown
* Browser: Unknown
* Build/commit/version: Unknown
* Affected repos referenced in behavior: `codex-session-view`, `crawl4ai-webScraper`, `lms-dspy-SessionAnalyst`

Evidence:

* Error message shown on crash: `Unexpected 'className' prop, remove it`.
* Logger mentions repeated boundary errors (e.g., `[catch-boundary] ERROR` / assertion text referenced).
* Mis-scoped rule/context examples mention `codex-session-view` and `ChatDock.tsx` while other repo sessions are active.

Decisions / Agreements:

* “Add to Chat” must send to both General and Session Coach (per user).
* Add “Clear chat” and a dedicated chat history side panel (per user).

Open Items / Unknowns:

* Exact UI locations/labels for “Add to Chat” entry points beyond Session Explorer and Timeline events: Not provided
* Exact stack traces, request IDs, and timestamps for AI Analysis crashes: Not provided
* Whether the crash affects additional markdown-rendered surfaces beyond Summary/Hook Discovery: Not provided
* Target behavior for history panel (retention rules, deletion, naming): Not provided

Risks / Dependencies:

* Multi-repo correctness depends on reliably associating session payloads to their originating repository and loading the correct rule source.
* AI Analysis failure blocks a core feature path (“Summary” and analyzer output rendering).
* State persistence bugs risk user confusion and perceived data loss when switching tabs or starting a “New chat”.

Acceptance Criteria:

* Clicking “ADD TO CHAT” for a session/event makes that same session/event available in both “General” and “Session Coach” without additional user actions.
* Switching General ↔ Session Coach preserves the loaded session context and current conversation state.
* Chat history is visible immediately on load/tab switch and remains visible without sending a new message.
* Loading a session from repo A then repo B updates displayed rules/instruction source to match repo B (no `codex-session-view` leakage unless repo B is `codex-session-view`).
* Message list ordering is consistent and chronological across the full conversation.
* Chat Dock pane does not truncate content at default viewport sizes; instruction source UI placement does not cause chat content cutoff.
* Summary and Hook Discovery “Run Conversation Analyzer” complete without triggering an error boundary; no `Unexpected 'className' prop, remove it` occurs.
* `/logs` keeps page layout stable and scrolls logs within a bounded container.
* “New chat” (or “Clear chat”) persists across tab switches; prior chats appear only via the history side panel.

Priority & Severity (if inferable from text):

* Priority: P0
* Severity: S0

Labels (optional):

* bug, regression, ui, chat-dock, routing, state-management, cross-repo, rendering, crash
