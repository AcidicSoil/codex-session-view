Context

* Prework provides two architecture documents to turn into a concise action plan: `docs/architecture-analysis.md` and `docs/architecture-deconstruction.md`.
* Scope centers on viewer/chatbot architecture, server functions, persistence, AI runtime, and improvement opportunities already identified in prework.
* Missing source of truth for additional constraints beyond prework; proceed using prework only.

Prework summary

* Viewer, chatbot, server functions, persistence, AI runtime, and rule engine are the core modules identified. Evidence points include `src/features/viewer/*`, `src/features/chatbot/*`, `src/server/function/*`, `src/server/persistence/*`, `src/server/lib/aiRuntime.ts`, and `src/lib/agents-rules/*`.
* Data flow: uploads -> session parsing -> viewer visualization -> chatbot streaming with misalignment detection and AI runtime. Evidence paths include `src/routes/api/uploads/*`, `src/lib/session-parser/streaming.ts`, `src/server/chatbot-api/stream.ts`.
* Agent-centric map: Memory (chat threads/messages/uploads/misalignments), Evaluation (misalignment detection, Hookify), Toolkit (timeline tools). Evidence includes `src/server/persistence/*`, `src/server/lib/hookifyRuntime.ts`, `src/server/lib/tools/timelineTools.ts`.
* Improvement opportunities from prework: unify client/server session state, add persistent storage for uploads, strengthen rule parsing, expand tooling, migrate chatbot API to type-safe server fn. Evidence includes `src/server/persistence/sessionUploads.server.ts`, `src/lib/agents-rules/parser.ts`, `src/server/lib/tools/timelineTools.ts`, `src/routes/api/chatbot/stream.ts`.
* Constraints: evidence formatting uses path/symbols from prework; do not add speculative assumptions.

Success criteria

* Plan references only prework-specified modules, flows, and opportunities.
* Each improvement opportunity is mapped to an actionable step with evidence cited.
* Missing details are explicitly marked as TODO with “Missing from prework: …”.

Deliverables

* `docs/tasks/todo/01-architecture-plan.md` (this plan).
* TODO (Missing from prework: any additional docs, code changes, or test artifacts required).

Approach

1. Summarize the current architecture based on the two prework docs, preserving evidence paths.
2. Translate the five improvement opportunities into phased tasks aligned to the existing module boundaries.
3. Enumerate required dependencies and ordering based on the data/control flow in prework.
4. Define acceptance checks and validation steps strictly from prework; mark missing items as TODO.

Dependencies

* Internal: viewer, chatbot, persistence, AI runtime modules cited in prework. Evidence: `src/features/viewer/*`, `src/server/chatbot-api/*`, `src/server/persistence/*`, `src/server/lib/aiRuntime.ts`.
* External: None stated in prework. TODO (Missing from prework: external services, providers, or tooling requirements).

Risks / unknowns (from prework only)

* Split client/server session state could cause inconsistency if not unified. Evidence: `sessionSnapshots.ts` (client) vs `sessionUploads.server.ts` (server) referenced in `docs/architecture-analysis.md`.
* In-memory persistence implies data loss on restart. Evidence: `localOnlyCollectionOptions` in `src/server/persistence/sessionUploads.server.ts`.
* Regex-based rule parsing is brittle. Evidence: `src/lib/agents-rules/parser.ts`.

Testing & validation

* TODO (Missing from prework: specific test suites, commands, datasets, or environments).

Rollback / escape hatch

* TODO (Missing from prework: rollback strategy or safe-guard requirements).

Owner/Date

* Codex / 2025-12-22

Prework references

* Source type: docs
* Key pointers (paths/symbols/links copied from prework):
  * `docs/architecture-analysis.md`
  * `docs/architecture-deconstruction.md`
  * `src/features/viewer/viewer.page.tsx`, `src/features/viewer/viewer.workspace.tsx`
  * `src/features/chatbot/misalignment-detector.ts`, `src/server/chatbot-api/stream.ts`
  * `src/server/function/sessionDiscovery.ts`, `src/server/function/chatbotState.ts`, `src/server/function/todos.ts`
  * `src/server/persistence/sessionUploads.server.ts`, `src/server/persistence/chatMessages.server.ts`
  * `src/server/lib/aiRuntime.ts`, `src/server/lib/aiRuntime.prompts.ts`
  * `src/lib/agents-rules/parser.ts`
  * `src/lib/session-parser/streaming.ts`
  * `src/server/lib/tools/timelineTools.ts`
