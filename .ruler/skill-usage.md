# Codex skills usage

- For every UI/frontend related task (new components, refactoring existing component, scanning through existing components, removing/replacing components, etc. ), first interpret the task under the applicable `AGENTS.md` rules, then apply `~/.codex/skills/frontend-design/SKILL.md`.
- For every logic/backend task (refactors, features, tests, docs, workflows, integrations, etc.), first interpret the task under the applicable [`AGENTS.override.md`, `src/AGENTS.md`] rules.
- Always reference `src/AGENTS.md` and follow section `MODULE AND FILE DESIGN` for all work/tasks performed under `src/`.
- Always report files that exceed the 400 line threshold at the end of each turn, use `pnpm thres` to locate these files. Any file reported and located under `src/` shall be considered in your end-turn report.
- Before ending turn, review work performed this run by referencing all sections under `file size and responsibility rules`. Report your findings if any work performed did not align with the rules.
