Context
- Instruction sources (AGENTS.md, .ruler/, docs/agents, etc.) are parsed via `loadAgentRules`/`parseAgentRules`, but the system cannot currently detect duplicate content across differently named files.
- Duplicate instruction bodies can enter the runtime unnoticed, inflating rule counts, slowing parsing, or causing conflicting guidance.
- Hashing each file’s bytes during parsing lets us identify identical documents regardless of name/path and short-circuits redundant work.

Success criteria
- Every instruction file parsed through CLI/server code produces a deterministic cryptographic hash (e.g., SHA-256) of its exact bytes.
- Hashes are stored with associated metadata (path, timestamp, rule count) for later duplicate checks during the same session/run.
- When two sources have identical bytes, their hashes match and the system flags/logs/skips duplicates without reparsing.
- Different content always yields different stored hashes; no false duplicate detections.
- Hashing adds negligible overhead to the existing rule-loading pipeline and handles large files without excessive memory usage.

Deliverables
- Updated parsing/loading utilities (likely `src/server/lib/chatbotData.ts` and `src/lib/agents-rules/parser.ts` or adjacent helpers) that compute & persist hashes.
- A lightweight persistence/cache module (in-memory map + optional disk persistence) for instruction hashes + metadata.
- Logging or reporting hook that surfaces detected duplicates (and optionally skips reparsing) for CLI + server flows.
- Automated tests covering identical/different file cases plus large-file hashing performance assumptions.
- Documentation snippet (README or docs/tasks follow-up) describing the dedup mechanism for contributors.

Approach
1) Inventory all instruction ingestion paths (server rule loader, CLI tooling, tests) to ensure hashing logic is invoked consistently; abstract shared helper if needed.
2) Implement a streaming SHA-256 helper that ingests file content via buffer chunks (reuse Node crypto) and returns hex hash.
3) Extend `loadAgentRules` (and any other loaders) to compute the hash before parsing, record `{hash, path, size, mtime}` inside a central cache, and short-circuit parsing if the hash already exists (while still tracking alternative paths referencing it).
4) Surface duplicate detection via structured logging + telemetry hooks, and ensure downstream consumers can access metadata listing which files share a hash.
5) Add persistence strategy (in-memory Map keyed by hash with optional JSON snapshot if runs need cross-process reuse); document retention/invalidations (e.g., clear when repo root changes).
6) Write unit tests for the hashing helper and integration tests that feed mock files with identical/different content to guarantee dedup accuracy; run existing suites to confirm no regressions.
7) Update docs (task notes/README) to explain hashing purpose, usage, and maintenance requirements.

Risks / unknowns
- Need to confirm all instruction consumers funnel through a single loader; otherwise duplicates may slip through.
- Large instruction files could introduce hashing overhead; must benchmark chunk size/time.
- Determining how/where to persist hashes across runs (disk vs memory) without corrupting caches when files change.
- Coordination with existing caching (`rulesCache`) to avoid stale hash entries when files mutate but share filename.

Testing & validation
- Unit tests for hash helper (same bytes → same hash, small change → different hash, supports streaming input).
- Integration tests for `loadAgentRules`: create temp files with duplicate/different content and assert dedup map + logging behave as expected.
- Optional performance sanity test measuring time to hash a large synthetic instruction file.

Rollback / escape hatch
- Gate new hashing/dedup logic behind a feature flag or environment toggle so we can revert to legacy behavior quickly if issues arise.

Owner/Date
- Codex CLI Agent / 2025-12-07
