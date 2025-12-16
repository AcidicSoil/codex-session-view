Context

* Chat Dock regressions still exist around conversation lifecycle, cross-tab persistence, routing, layout, instructions/rules visibility, and provider ergonomics as captured in `01-issues-fix-todo_chatdock.md`.
* Users observe “zombie” chats after switching tabs, duplicate New Chat controls, missing Clear Chat, inconsistent repo/rule binding, ADD TO CHAT routing gaps, layout wasting screen real estate, and logger/chat scroll issues.
* Additional UX requests include rule/session transparency, manual context injection, rule toggles, rename fixes, and a “Keep Model Loaded” option for local providers like LM Studio.

Success criteria

* Both Session Coach and General chats persist accurately (no resurrected chats) and ADD TO CHAT payloads appear in both contexts without manual intervention.
* Chat history UI supports free-form renaming, delete, archive, clear, and selection workflows with zero latency or key-input bugs; new Clear Chat action behaves distinctly from New Chat.
* Layout improvements (left history sidebar, inline/collateral instruction + rules, fixed scroll containers for chat/logs) ship and pass responsive QA without truncating content.
* Repo/rule binding + state card always reflect the active session, and rules can be toggled/managed; manual “Add Session Context” and provider “Keep Model Loaded” controls function as designed.
* Summary/Hook Discovery markdown rendering is stable (no `react-markdown` className crash) across shared surfaces.

Deliverables

* Refactored Chat Dock layout (history sidebar, main chat, instruction/rule panel) plus updated logger container.
* Shared persistence module enforcing per-thread/thread lists, clear/new semantics, ADD TO CHAT broadcast, repo/rule binding, state card, manual context injection, rule toggles, Keep Model Loaded setting.
* Updated UI components: single New Chat button, dedicated Clear Chat action, rename dialog/input without limits, instruction/rule panels, Add Session Context button, provider toggle.
* Automated tests (unit + Playwright) covering persistence, routing, layout behavior, rename input, rule/session card, Add Session Context, provider toggles, markdown renderers.

Approach

1. **Lifecycle & persistence audit** – Revisit chat state stores (threads, messages, context) to ensure Session Coach/General share the same persistence semantics; define APIs for new Clear Chat and ADD TO CHAT fan-out.
2. **Routing & repo binding** – Update Add-to-Chat entry points + server handlers so both tabs receive context; ensure repo/rule context derives from active session metadata and surfaces via a visible state card and manual “Add Session Context” control.
3. **History & controls** – Rebuild conversation sidebar to allow rename/delete/archive without caps, fix key handling, introduce Clear Chat action, and dedupe New Chat controls.
4. **Layout & scroll** – Restructure Chat Dock route with CSS grid (left sidebar, flexible chat column, collateral instruction/rule panel) and convert chat/log containers into fixed-height scrollable regions; reposition Instruction Source accordingly.
5. **Rules & provider UX** – Implement rule toggle drawer/sheet and provider “Keep Model Loaded” toggle with state handling + telemetry; ensure manual rule addition is supported.
6. **Stability & testing** – Replace legacy markdown renderers with `FormattedContent`, expand Vitest/Playwright coverage, and add telemetry hooks for key flows.

Risks / unknowns

* Provider Keep-Loaded toggle may require deeper integration with lmstudio adapters or external APIs; scope creep possible.
* Layout refactor touches multiple components/routes (Chat Dock, instructions, logger) and may introduce regression risk without thorough responsive testing.
* Manual rule/context controls may need backend endpoints not yet implemented; clarify expected behavior.

Testing & validation

* Vitest: chat persistence reducers, rename handlers, rule toggles, provider toggle logic, markdown renderer smoke tests.
* Playwright: Add-to-Chat fan-out, New vs Clear chat, history rename/delete, state card updates, Add Session Context button, rules drawer, logger scroll containment, layout responsiveness.
* Manual verification of LM Studio Keep-Loaded toggle and repo/rule indicators against multi-repo sessions.

Rollback / escape hatch

* Gate new layout + controls behind feature flags; retain previous Chat Dock UI as fallback until QA passes. Log telemetry to monitor adoption before removing flags.

Owner/Date

* Codex Assistant / 2025-12-16
