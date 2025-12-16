Title:

* Chat Dock 2.0: Fix persistence, history management, routing, layout utilization, rule/session visibility, and related regressions

Summary:

* Chat Dock has multiple regressions across state persistence, routing, layout, and chat history management that create “zombie” conversations, inconsistent behavior between Session Coach vs General tabs, and unreliable user control over chat context. Users also lack visibility into which session and rules are currently bound, and renaming chat threads is broken (title cap + spacebar not registering). Additional UX gaps include duplicate “New chat” actions, unbounded page scrolling, and a reported `react-markdown` crash affecting shared features (e.g., Summary/Hook Discovery). Severity was explicitly called “Critical (Feature Blocker / Data Loss)” (per user).

Background / Context:

* Area: Chat Dock route with tabs including **Session Coach** and **General**, plus related flows like **Session Explorer/Timeline → “ADD TO CHAT”**, **Instruction Source**, **Conversations (History)** list, and **Logger** view.
* Users want Chat Dock to behave as a full-width desktop workspace with persistent, controllable conversation state; explicit clear behavior; manageable history; rule/session controls; and stable rendering.
* Local model providers (e.g., **LM Studio Local**) introduce workflow friction when models unload and must be reloaded (per user request).

Current Behavior (Actual):

* “New chat” clears the view temporarily, but prior conversation history reappears after switching tabs and returning (“zombie chats”). (per user)
* Persistence is inconsistent across tabs:

  * **General** tab persists chat history.
  * **Session Coach** does not persist chat history unless the user clicks a chat thread in history. (per user)
* Two separate “New chat” buttons exist; no dedicated “Clear Chat” action exists. (per user)
* Chat message area is not a fixed scrollable container; long threads expand the page, creating very large scrolling windows. (per user)
* Desktop layout on the Chat Dock route is “squished” and leaves significant unused whitespace; Instruction Source placement wastes space / feels detached. (per user)
* Chat history (Conversations) does not reliably render on load until a refresh (history latency). (per user)
* Message ordering is incorrect (AI/user messages appear in illogical order; described as newest responses under oldest input / newest user message above assistant response in some views). (per user)
* “ADD TO CHAT” routes content only to **Session Coach**; does not also populate **General** chat. (per user)
* Switching to **General** tab clears the active session context entirely. (per user)
* Chat Dock applies hardcoded repository context/rules from `codex-session-view` even when the active session belongs to a different repository. (per user)
* Logger container lacks scrolling. (per user)
* Chat history renaming issues:

  * Hard cap truncates titles.
  * Space bar does not register during rename input.
  * Restrictions exist that block normal text entry. (per user)
* Visibility gap: no clear indicator of which session is loaded/bound and which rules are loaded/bound at any moment. (per user)
* Crash: Shared features (e.g., “Summary”, “Hook Discovery”) reportedly crash due to a `react-markdown` `className` prop error. (per user)

Expected Behavior:

* “New chat” persistently resets the active conversation state; switching tabs/routes does not resurrect cleared history.
* Both **Session Coach** and **General** tabs persist chat state consistently without requiring manual thread selection.
* A dedicated **Clear Chat** action exists and is distinct from **New chat** (no duplicate labels for different intents).
* Chat message list is contained in a fixed-height, scrollable region; header and composer remain anchored.
* Desktop layout uses available width with no large unused blank areas; main components fill the route appropriately.
* Chat History is aligned left as a fixed-width navigation sidebar; content area uses remaining space.
* Instruction Source is placed inline with Chat Dock or moved into a sidebar/sheet to avoid wasting primary space.
* “ADD TO CHAT” routes content to the appropriate contexts (Session Coach and General, per requirement).
* Session context is not lost when navigating to General; context binding is predictable and visible.
* Repository/rule binding respects the actual active session repository (no hardcoded repo leakage).
* Logger scrolls within its container.
* Renaming chat threads supports normal, unrestricted text input: spaces, long titles, special characters.
* UI exposes an at-a-glance state of active session + active rules; and provides controls to manage rules and inject session context.
* Shared components do not crash on markdown rendering.

Requirements:

* Persistence & state

  * Fix “New chat” persistence so cleared state does not resurrect after tab switching.
  * Make Session Coach persistence match General persistence (auto-save/auto-persist on input; no dependency on clicking a history item).
  * Add explicit **Clear Chat** action to wipe current context without ambiguous “new thread” semantics.
  * Remove/merge duplicate “New chat” buttons; ensure distinct labels and intent.
* History management

  * Chat history UI supports select/resume, delete, rename.
  * Remove title hard cap; allow long, free-form titles.
  * Fix rename input handling so spacebar and all standard keystrokes work; no arbitrary restrictions.
  * Fix history load latency (renders without manual refresh).
* Layout & scrolling

  * Desktop: eliminate “squished” center column; utilize available width; no large unused whitespace on routes.
  * Chat history: fixed-width left sidebar; chat content centered/expanded appropriately.
  * Instruction Source: move inline with Chat Dock or into a sidebar/sheet (collateral area).
  * Chat window: fixed scrollable container for messages; prevent infinite page growth.
  * Logger: scrollable container (no overflow lock).
* Routing & context

  * “ADD TO CHAT” from Session Explorer/Timeline must populate **General** chat as well as Session Coach. (per user)
  * Switching tabs (including General) must not clear active session context unexpectedly.
  * Remove hardcoded `codex-session-view` repository context; bind rules/context to the actual active session repository.
* Controls & transparency

  * Add **Add Session Context** button to manually inject/refresh session context in the chat stream.
  * Add rules management UI (sidebar/drawer/sheet): toggle rules on/off and add rules manually.
  * Add a persistent state card showing:

    * Active session identifier/name
    * Active rules (count and/or list)
* Provider/model UX

  * Add provider setting to **Keep Model Loaded** (toggle/checkbox) for local providers (e.g., LM Studio) to reduce reload friction. (per user)
* Stability

  * Fix reported `react-markdown` crash involving `className` prop affecting Summary/Hook Discovery and other shared components.

Out of Scope:

* Not provided

Reproduction Steps:

1. Open Chat Dock → Session Coach tab.
2. Start a chat; click “New chat” to clear.
3. Switch to another tab (e.g., General or another route) and return to Session Coach.
4. Observe previously cleared conversation reappears (“zombie chat”).
5. In Chat Dock, compare persistence:

   * Start chat in General; navigate away/back; observe it persists.
   * Start chat in Session Coach; navigate away/back without clicking a history thread; observe it does not persist. (per user)
6. In Conversations list, attempt to rename a thread:

   * Type a multi-word title with spaces.
   * Observe spacebar not registering and title truncation due to cap.
7. Create a long conversation; observe the chat page grows with unbounded scrolling rather than a contained scroll region.
8. From Session Explorer/Timeline, click “ADD TO CHAT”; observe content appears only in Session Coach, not General.
9. Switch to General tab; observe session context clears unexpectedly.
10. Navigate to affected shared feature (e.g., Summary/Hook Discovery) that renders markdown; observe crash attributed to `react-markdown` `className` prop error. (per user)

Environment:

* OS: Unknown
* Browser: Unknown
* Device: Desktop (explicitly referenced), other form factors unknown
* App/Build: Unknown
* Route/Area: Chat Dock; Session Coach tab; General tab; Session Explorer/Timeline; Logger view
* Provider examples: LM Studio Local (others implied)
* Libraries mentioned: `react-markdown` (per user)

Evidence:

* Reported crash cause: `react-markdown` `className` prop error (exact stack trace not provided). (per user)
* Reported UI behaviors (per user):

  * “New chat” state resurrects after tab switching
  * Session Coach persistence requires clicking a history thread; General persists automatically
  * Duplicate “New chat” actions; missing “Clear Chat”
  * Rename field blocks spacebar; titles capped/truncated
  * Layout squished with unused whitespace; Instruction Source placement inefficient
  * Chat window not a fixed scrollable container; Logger lacks scrolling
  * “ADD TO CHAT” routes only to Session Coach
  * General tab clears session context
  * Hardcoded repository context (`codex-session-view`) applied incorrectly
  * Chat history load latency; message ordering issues

Decisions / Agreements:

* Severity labeled “Critical (Feature Blocker / Data Loss)” (per user).
* Target layout direction: left fixed-width chat history; main chat uses remaining width; collateral panels (Instruction Source + rules) moved inline or to right sidebar/sheet. (per user)
* Add transparency/controls: Add Session Context button, rules management UI, and a state card for active session + active rules. (per user)

Open Items / Unknowns:

* Exact error text/stack trace for the `react-markdown` crash.
* Exact browsers/OS/build versions where each issue is reproduced.
* Intended semantics difference (if any) between “New chat” vs “Clear Chat” beyond “wipe context vs start new thread” (not fully specified).
* Desired maximum title length (user requested removing cap; any technical/storage constraints unknown).
* Exact placement decisions for Instruction Source vs rules UI (inline vs shared sidebar/sheet) beyond the acceptable options stated.

Risks / Dependencies:

* Provider “Keep Model Loaded” behavior depends on provider APIs/keep-alive semantics (LM Studio and “others like it”). (per user)
* Fixing persistence/routing may require changes across tab state management, session context binding, and history storage.
* Layout changes may impact multiple routes/components (Chat Dock, Logger, Instruction Source, Conversations sidebar).

Acceptance Criteria:

* [ ] Clicking “New chat” results in a persistent cleared state; switching tabs/routes and returning does not restore the prior conversation unless intentionally selected from history.
* [ ] Session Coach and General tabs both persist chat state consistently without requiring a history click.
* [ ] Only one “New chat” control exists per intended action; a distinct “Clear Chat” control exists for wiping the current context.
* [ ] Message list scrolls within a fixed container; header and composer remain fixed/anchored; page does not grow unbounded with long chats.
* [ ] Desktop layout uses available width with no large unused blank areas; history is a fixed-width left sidebar.
* [ ] Instruction Source is moved inline or to a sidebar/sheet without wasting primary chat space.
* [ ] Logger content scrolls within its container.
* [ ] “ADD TO CHAT” routes content to General chat as well as Session Coach (per requirement).
* [ ] Switching to General does not clear active session context unexpectedly.
* [ ] Repository/rule binding reflects the active session repository (no `codex-session-view` hardcoding leakage).
* [ ] Renaming a chat thread accepts spaces, long titles, and standard characters; no truncation cap is applied (or cap removed per requirement).
* [ ] UI displays active session + active rules in a visible state card; rules can be toggled and manually added via sidebar/drawer/sheet.
* [ ] Local provider settings include a “Keep Model Loaded” toggle that prevents repeated model reload friction (provider-dependent behavior).
* [ ] Markdown-rendering shared components no longer crash due to `react-markdown` `className` prop error.

Priority & Severity (if inferable from text):

* Priority: P0 (inferred from “Critical (Feature Blocker / Data Loss)” per user)
* Severity: S0 (inferred from “Feature Blocker / Data Loss” per user)

Labels (optional):

* bug, regression, chat-dock, ui, ux, persistence, routing, layout, history-management, markdown-crash
