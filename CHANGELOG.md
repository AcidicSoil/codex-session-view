# Changelog

## [Unreleased]
- Added first-class Gemini CLI session ingestion (JSON fallback parser, `GEMINI_SESSION_DIR` discovery opt-in, `.json` upload UX) plus documentation in `docs/gemini-cli-support.md`.
- Updated session export docs to clarify that Gemini-derived sessions retain tool metadata when re-exported.
- Fixed Session Intelligence “Hookify Analysis Results” layout so Hook Discovery panels clamp to the viewport, maintain sticky headers, and expose the Summary footer without clipping; refreshed scroll spec + e2e coverage.
