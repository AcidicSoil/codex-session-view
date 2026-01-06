Direct answer (1–4 bullets, evidence-cited)

It does clear “stale” params for the specific keys it owns when writing: rangeStart, rangeEnd, cmd, cmdQ, sessionId are either set to normalized values or deleted if invalid/empty (delete result[key]). Evidence: applyViewerSearchUpdates deletes each key when the “next” value is missing/blank/invalid and only writes when checks pass (e.g., typeof next.startIndex === 'number' && next.startIndex >= 0). (src/features/viewer/viewer.search.ts:applyViewerSearchUpdates)

It normalizes filters but only superficially: cmd families are trimmed, empties removed, and de-duped via Set, then joined as a comma string; cmdQ and sessionId are trimmed. Evidence: normalizedFamilies = Array.from(new Set(next.commandFamilies.map(...))) and next.commandQuery.trim(), next.sessionId.trim(). (viewer.search.ts:applyViewerSearchUpdates)

It does not fully normalize “range semantics”: it does not enforce startIndex <= endIndex, does not coerce to integers, and will persist floats (e.g., 1.5) as long as they’re >= 0. Evidence: the only gate is >= 0, no ordering/int checks exist. (viewer.search.ts:applyViewerSearchUpdates)

It will leave stale URL params for everything else: it starts from { ...prev } and only mutates/deletes the five known keys; any unrelated search params remain untouched. Evidence: const result: Record<string, unknown> = { ...prev } plus only key-specific deletes/sets afterward. (viewer.search.ts:applyViewerSearchUpdates)

Risks/unknowns (bullets)

Invalid ranges can enter via parsing: parseViewerSearch() / viewerSearchToRangeState() will happily produce startIndex: -1 or endIndex: -5 from the URL because toNumber() only checks “finite,” not “>= 0,” and viewerSearchToRangeState() passes through whatever numbers exist. Whether that becomes a UX bug depends on downstream consumers. (viewer.search.ts:toNumber, parseViewerSearch, viewerSearchToRangeState)

Real normalization may be happening at call sites (e.g., an updater that swaps start/end or clears range when session changes). That can’t be confirmed from this file alone.

URL churn risk: cmd family order is preserved based on first occurrence (insertion order of the Set), not sorted; depending on how next.commandFamilies is built, URLs may change order without semantic changes.

Next smallest concrete experiment (1 action)

Run: ck --regex "applyViewerSearchUpdates\\(" src and inspect each updater function to see whether it (a) enforces startIndex <= endIndex / integer coercion, (b) clears range/filter when sessionId changes, and (c) intentionally preserves other query params.

If evidence is insufficient, name the exact missing file/path pattern(s) to attach next

Attach the call sites returned by: src/** matches for applyViewerSearchUpdates( (i.e., the specific files under src/features/viewer/** and likely src/routes/** that update viewer URL search state).

Also attach any viewer route/search wiring files that serialize search params (common patterns: src/routes/**viewer**, src/features/viewer/**route**, or router config where search is read/written).
