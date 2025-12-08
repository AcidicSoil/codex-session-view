Context
- Instruction files (AGENTS.md, .ruler docs, etc.) are parsed without content-based awareness, so duplicate content under different filenames is loaded multiple times.
- We need deterministic content hashing (e.g., SHA-256) during parsing to detect and flag duplicates while leaving unique files untouched.

Success criteria
- Every instruction file parsed emits a SHA-256 (or equivalent) hash stored alongside existing metadata.
- Duplicate detection compares hashes regardless of file name and reports duplicates via an internal interface + logging.
- Non-duplicate files continue to parse unchanged aside from the extra hash metadata.

Deliverables
- Hashing helper (streaming) and metadata storage integrated into instruction parsing pipeline.
- Duplicate-check interface (e.g., `checkDuplicateInstructionFile`) plus supporting cache structure.
- Tests validating hash generation, duplicate detection, and non-duplicate behavior.
- Documentation/update notes summarizing the new dedup flow.

Approach
1) Identify the central instruction ingestion path (e.g., `loadAgentRules`/related CLI functions) and ensure all parsing calls route through it; factor a shared helper if needed.
2) Implement a streaming SHA-256 hash helper using Node crypto that accepts file streams/buffers to avoid high memory use for large files.
3) Extend the metadata/index data structures to store `{hash, path, size, mtime, id}` per instruction source; ensure caches persist across the run.
4) Add a duplicate-check function that, given file info, computes the hash, compares against stored hashes, logs/returns duplicates, and reuses existing rule data instead of reparsing.
5) Update parsing flow so duplicates are short-circuited (or flagged) while unique files proceed as before; integrate with logging/error conventions.
6) Write targeted unit tests (hash helper, duplicate detection) and integration tests covering identical/different content scenarios.
7) Document the behavior (README or dev docs) and ensure future contributors know how to use/maintain the dedup interface.

Risks / unknowns
- Must guarantee every instruction entry hits the dedup logic; any bypassed path will reintroduce duplicates.
- Need to balance cache persistence with invalidation (file changes, repo switches).
- Hash computation overhead on large files needs profiling; ensure streaming implementation is efficient.

Testing & validation
- Unit tests for hashing helper + duplicate interface.
- Integration tests simulating multiple instruction files with same/different contents.
- Regression test pass for existing parser behavior.

Rollback / escape hatch
- Feature flag or environment toggle to disable hash dedup if unexpected regressions appear.

Owner/Date
- Codex CLI Agent / 2025-12-07
