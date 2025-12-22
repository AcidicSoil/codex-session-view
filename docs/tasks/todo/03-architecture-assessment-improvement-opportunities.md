Context
- Architecture assessment in `docs/architecture-analysis.md` lists five improvement opportunities that are not yet incorporated into task planning artifacts.
- Existing plans in `docs/tasks/todo/01-architecture-plan.md` and `docs/tasks/todo/02-session-observability-gaps.md` should reflect and map those opportunities where applicable.
- Goal is to make improvement opportunities actionable and traceable to plan steps without adding speculative scope.

Success criteria
- `docs/tasks/todo/01-architecture-plan.md` includes an explicit section that enumerates all five improvement opportunities from the architecture assessment with evidence references.
- `docs/tasks/todo/02-session-observability-gaps.md` is updated only where an opportunity directly overlaps (or explicitly notes no overlap).
- `docs/architecture-analysis.md` remains the source of truth; plans reference it without rewording into new, unsupported claims.

Deliverables
- Updated `docs/tasks/todo/01-architecture-plan.md` with a concise "Improvement Opportunities" section referencing the five items from the architecture assessment.
- Updated `docs/tasks/todo/02-session-observability-gaps.md` with a brief "Related Opportunities" note or an explicit "No overlap" statement.
- Any cross-reference links or citations between the plan docs and `docs/architecture-analysis.md`.

Approach
1) Extract the five improvement opportunities from the "Architecture Assessment" section in `docs/architecture-analysis.md`.
2) Add a dedicated "Improvement Opportunities" section to `docs/tasks/todo/01-architecture-plan.md` mapping each item to planned phases or TODOs (no new assumptions).
3) Review `docs/tasks/todo/02-session-observability-gaps.md` for overlaps; add a short alignment note or explicitly state no overlap.
4) Validate references remain consistent and no new scope is introduced beyond the architecture assessment.

Risks / unknowns
- Opportunity overlap with session observability may be partial; need to avoid forcing unrelated scope into the observability plan.
- Terminology drift between docs could cause confusion if rephrased too aggressively.

Testing & validation
- Documentation checks only: confirm all five opportunities are present and referenced; verify no additional claims beyond `docs/architecture-analysis.md`.

Rollback / escape hatch
- Revert plan edits if they introduce scope creep or misalign with the architecture assessment.

Owner/Date
- codex / 2025-12-22
