# Logs and Artifacts Handling

## Goals
- Keep session data local-first and traceable.
- Avoid committing large binaries into the repo.
- Make it obvious where logs and session artifacts live.

## Session uploads (raw files)
- **Upload location:** `~/.codex/sessions/uploads/` (created automatically).
- **Session index:** `data/session-uploads.json` (metadata + content snapshot for persisted uploads).
- **Parsed snapshots:** `data/session-snapshots.json` (normalized events/meta used by the Viewer and Session Coach).

Uploads are written to disk when the “Persist uploads” toggle is enabled. When disabled, uploads stay in memory for the current session only and are not written to the JSON indexes.

You can override the upload directory with `CODEX_SESSION_UPLOAD_DIR` if you need to store sessions on a different volume.

## External / bundled sessions
The Viewer discovers sessions from the following locations (read-only):
- `~/.codex/sessions/**/*.jsonl|ndjson|json`
- `sessions/**/*.jsonl|ndjson|json`
- `artifacts/sessions/**/*.jsonl|ndjson|json`

These are synchronized into the session index so the UI can show metadata, status, and timestamps.

## Browser logs
- **Frontend logs directory:** `logs/frontend/`
- **Log format:** newline-delimited text files (`.log`) written by Browser Echo.
- **How to capture:** the UI and API use server functions to append and read log entries.

## Size constraints and large artifacts
- **Do not commit large artifacts** (e.g., >100MB session exports or large GIFs) into the repo.
- Store large artifacts locally in `~/.codex/sessions` or `artifacts/` and share a **path or link** instead of the binary.
- If you need to ship a demo asset, prefer:
  - A compressed `.mp4` or `.webm` over a `.gif`.
  - A short, trimmed clip rather than a full-length recording.

## Recommended workflow
1. Upload session files through the Viewer to cache and index them.
2. Keep heavy raw assets in `~/.codex/sessions` or `artifacts/`.
3. Share references (paths/links) in issues or support threads instead of attaching binaries.
4. Use the Session Explorer to verify session status, timestamps, and IDs.

## Retention and cleanup
- Remove stale uploads by deleting files in `~/.codex/sessions/uploads`.
- Clear the JSON indexes in `data/` if you want to reset the local workspace.
- Browser logs can be cleared via the UI or by deleting `logs/frontend/*.log`.
