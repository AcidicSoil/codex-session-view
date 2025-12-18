# Session Export Feature

The Session Inspector now supports granular data exports directly from the timeline header. Click **Export** to open the modal and choose:

- **Scope** – Entire session, current filter view, selected range (based on timeline range controls), or the last selected event.
- **Formats** – Markdown (`.md`), JSON (`.json`), CSV (`.csv`), or plaintext (`.txt`).
- **Options** – Opt in to timestamps or hidden metadata (IDs, diagnostic fields); secrets such as session instructions stay redacted.

Downloads are generated client-side from the parsed session data and use filenames like `session-range-partial-20251213-153000.md`. JSON exports include `metadata.schemaVersion`, `metadata.scope`, and `metadata.isPartial` so future importers can distinguish partial vs full session snapshots. Gemini CLI session files (`.json`, `.jsonl`, `.ndjson`) and checkpoint exports are parsed using the same normalization layer, so exports retain their structure regardless of the original source.
