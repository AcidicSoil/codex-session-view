Dec 5, 2025, 3:33 AM
rollout-2025-12-04T15-24-07-019aeb40-3f8b-7c80-beb8-ace3ceb0284d.jsonl

<conversation>
 "PENDING/_App Organization and Design Tips .md"
</conversation>

# Create Plan From Conversation

Goal: infer the user’s needs and the assistant’s recommendations from an exported conversation, then draft a single coherent task plan in `docs/tasks/todo/<XX>-<name>.md`.

Input:

* A multi-turn conversation between a user and an LLM, in any export format.
* The conversation may be fragmented, repetitive, and span multiple topics.

Your job:

* Read the entire conversation.
* Infer the underlying problems, goals, and constraints expressed by the user.
* Infer the main recommendations, ideas, and proposed directions expressed by the LLM.
* Merge these into a concise, implementation-ready plan using the standard plan structure.

Plan requirements (keep qualitative, but complete):

* Context: brief recap of the core problem(s), goals, and any key background.
* Success criteria / acceptance: list of conditions that, if true, mean the plan has succeeded.
* Deliverables: list of tangible outcomes to produce (changes, artifacts, decisions, or processes).
* Approach: ordered outline of how to proceed from understanding to completion.
* Risks / unknowns: important uncertainties, dependencies, or open questions.
* Testing & validation: how to check that outcomes meet the success criteria.
* Rollback / escape hatches: how to revert, pause, or adjust course if needed.
* Owner / date: responsible role or team, and today’s date.

Constraints:

* Work only with what is present or strongly implied in the conversation.
* Combine overlapping points into a single coherent picture.
* Do not quote the conversation verbatim unless necessary; focus on intent and meaning.
* When information is missing, state assumptions explicitly in the plan.

Suggested prompt body:

```md
Context
- ...

Success criteria / acceptance
- ...

Deliverables
- ...

Approach
1) ...
2) ...
3) ...

Risks / unknowns
- ...

Testing & validation
- ...

Rollback / escape hatch
- ...

Owner / date
- <role or team> / <YYYY-MM-DD>
```
