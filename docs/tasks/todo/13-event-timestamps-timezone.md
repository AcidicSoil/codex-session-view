Context

* Inspector timeline cards currently render server/UTC timestamps, so event times appear ~6 hours ahead of local time for US-based users.
* Users need accurate local-time ordering to correlate activity with outside systems, so timezone errors undermine the debugging workflow.
* The existing data pipeline for events is unclear (server loader vs. client), so we must verify where timezone metadata is lost before fixing it.

Success criteria

* Event cards always display the moment in the viewer's local timezone, regardless of the event's origin timezone.
* Re-rendering or reloading the inspector preserves local-time rendering with no noticeable lag or flicker.
* Automated regression coverage fails if future changes reintroduce UTC/raw timestamp rendering.

Deliverables

* Updated Inspector timeline rendering logic (and any supporting data adapters) that convert event timestamps using the browser's locale-aware APIs.
* Regression tests (unit and/or component) covering multiple timezone offsets and DST boundaries.
* Documentation or changelog entry describing the corrected behavior and any new constraints on event payloads.

Approach

1. Trace the data path for event timestamps (server loader → client hooks/components) to confirm their current format (e.g., ISO UTC string, epoch) and determine where conversion should occur.
2. Define a timezone handling strategy (preferably storing timestamps in UTC but rendering through a shared formatting utility that uses `Intl.DateTimeFormat` or equivalent, with DST-safe behavior and configurable display precision).
3. Refactor the Inspector timeline component(s) to use the new formatter, ensuring memoization or derived data avoids `useEffect` fetching and keeps responsibilities separated per AGENTS.md.
4. Add targeted unit tests for the formatter plus component-level tests (e.g., Vitest + React Testing Library) that mock different `Intl` timezone offsets to verify correct output; include DST edge cases.
5. Update docs/changelog to record the fix and guide future contributors on timestamp expectations; run the full test suite (`pnpm test`) before shipping.

Risks / unknowns

* Event payloads may already include locale-rendered strings, in which case double-formatting could occur if not validated.
* Cross-browser timezone quirks (Safari vs. Chromium) or differing Intl support could affect rendering consistency.
* Historical events lacking timezone metadata might need fallback logic, which could require data migration or defaults.

Testing & validation

* Unit tests for the shared timestamp formatter covering multiple offsets and DST transitions.
* Component/integration test for the Inspector timeline verifying local-time rendering when provided UTC timestamps.
* Manual QA: load the Inspector in at least two OS/browser timezone settings (e.g., PST, EST) to confirm alignment with actual system clocks; run `pnpm test` to ensure suite passes.

Rollback / escape hatch

* If formatter changes introduce regressions, revert the component to the prior stable formatter and gate the new logic behind a feature flag or configuration switch until data discrepancies are resolved.

Owner/Date

* Codex / 2025-12-13
