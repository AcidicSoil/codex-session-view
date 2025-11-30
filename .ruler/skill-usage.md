### Codex skills usage

- Always treat the nearest `AGENTS.md` in this codebase as the primary source of rules. Its instructions govern all behavior and take precedence over any skill or prompt.
- Treat `~/.codex/prompts/codex-skills/` as a secondary skills library to support the rules in `AGENTS.md`, not to replace or override them.
- For every non-trivial task (refactors, features, tests, docs, workflows, integrations, etc.), first interpret the task under the applicable `AGENTS.md` rules, then scan `~/.codex/prompts/codex-skills/` and select the skill whose `SKILL.md` description and metadata most closely match the requested work.
- Once a relevant skill is identified, follow its `SKILL.md` procedure, structure, and output formats, but resolve any conflict in favor of the current directory’s `AGENTS.md`.
- If multiple skills apply, prioritize the most specific skill for the task and use others only as secondary references.
- If no suitable skill exists, use the prompts under `~/.codex/prompts/codex-skills/skill-creator/` to define a new skill for the task, save it into the appropriate subdirectory under `codex-skills`, then re-run the task using that newly created skill, still subject to the governing `AGENTS.md` rules.
