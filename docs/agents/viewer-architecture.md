# Viewer Architecture & Implementation Notes

This document captures the technical details that would otherwise bloat the top-level README. It covers how the viewer route is composed, what guarantees the virtualized timeline provides, and the configuration heuristics that keep uploads organized.

## Route + Loader Flow

- `src/routes/(site)/viewer/index.tsx` renders `ViewerPage`, which is backed by `src/features/viewer/viewer.loader.ts`.
- The loader calls a dedicated server function that performs filesystem discovery before render. Because the loader ignores client search params, every revalidation always re-hits the server function and never discards the discovered sessions.
- Repo/branch grouping, search text, size ranges, ASC/DESC toggles, and expand state all live in client state inside `DiscoverySection`, ensuring instant, in-memory filtering without retriggering the loader.
- When `SESSION_COACH_ENABLED` resolves truthy (default: `true` for dev, `false` for prod), the loader also calls `fetchChatbotState` so the viewer hydrates with the latest `{ sessionId, chat history, misalignments, context sections }`. Because this rides through a TanStack Start server function, the client never runs manual `fetch` calls in `useEffect`.

## Session Coach Chatbot

- **Models & persistence**: Shared types live in `src/lib/sessions/model.ts`. `chat-messages` and `misalignments` TanStack DB collections (under `src/server/persistence`) keep per-session, per-mode chat turns and status transitions scoped to the current process, mirroring the existing todos/session upload stores.
- **AI pipeline**: `src/lib/ai/client.ts` centralizes provider limits + prompt helpers; `features/chatbot/context-builder.ts` builds trimmed prompt sections, while `misalignment-detector.ts` heuristically tags rules parsed from `src/lib/agents-rules/parser.ts`. Fixture snapshots live in `tests/fixtures/` for regression tests/token budgeting.
- **APIs**: `src/server/chatbot-api.server.ts` powers `POST /api/chatbot/stream` (streaming session mode) and `POST /api/chatbot/analyze` (summary/commit pop-outs). Non-session modes short-circuit with `{ code: 'MODE_NOT_ENABLED' }`. Misalignment status mutations use `createServerFn` via `src/server/function/misalignments.ts`.
- **Hookify gate**: Every "Add to chat" action now calls `hookifyAddToChat` (`src/server/function/hookifyAddToChat.ts`), which evaluates the prompt against AGENT rules via `hookifyRuntime` and persists the decision in the `hookify-decisions` collection. High/critical hits block the action and surface the brutalist Hook Gate UI, while lower severities inject markdown annotations ahead of the prompt so Session Coach always sees the warnings.
- **Viewer integration**: `viewer.loader.ts` now returns `{ ...snapshot, sessionId, sessionCoach }`. `ViewerPage` swaps the legacy `ChatDock` for `components/chatbot/ChatDockPanel`, which renders persisted chat history, inline streaming, summary/commit buttons, and acknowledgement/dismissal controls without any client-side fetching in `useEffect`.
- **Feature flag**: `src/config/features.ts` reads `SESSION_COACH_ENABLED` with sane defaults (true locally, false in prod unless overridden). When disabled, `ChatDockPanel` falls back to the classic placeholder UI so no UX surface disappears.

## Virtualized Timeline Invariants

- `TimelineView` precomputes cumulative offsets from measured row heights. The first rendered item must be the last offset less than or equal to the viewport’s top; otherwise tall rows disappear mid-scroll. The helper `findLastOffsetBeforeOrEqual` enforces that rule for both the start and end indices.
- Measurements come from `Row`’s `useLayoutEffect`. Estimated heights only seed the offsets until a row is measured—don’t rely on them for logic.
- Programmatic scrolls (`scrollToIndex`) jump directly to the measured offset, so keep offsets up to date if you introduce new animations or height adjustments.
- Timeline numbering (the `#N — …` prefix) always reflects the event’s original chronological position, even when filters hide intermediate events or the UI toggles into descending order. The numbering metadata is derived once from the raw event stream and shared with the virtualized list so re-sorting never re-labels entries.

## Timeline Range & Command Filters

- `TimelineRangeControls` (`src/components/viewer/TimelineRangeControls.tsx`) owns the dual numeric inputs + slider. Inputs clamp to `[0, totalEvents - 1]`, automatically swap if a user enters values out of order, and keep the “Showing N of M events” summary in sync with router search params via `applyViewerSearchUpdates`.
- Command families live in `src/lib/session-events/toolMetadata.ts` as declarative metadata (id, regex pattern, category, hint). `ToolCommandFilter` renders them through the taki-ui combobox so analysts can pick any number of families *or* type ad-hoc substrings in the same control. Selections sync to `timelinePreferences.commandFilter`, persist via `useUiSettingsStore`, and hydrate from the `cmd/cmdQ` URL params during navigation.
- Badges on each timeline event call `buildEventBadges`, ensuring the newly parsed `commandToken` + first file path always surface directly on the collapsed card face so there’s no mismatch between the filters and what users read in the list.

## Search Highlighting Defaults

- Both the timeline (`AnimatedTimelineList`) and the session explorer (`SessionList`) now parse the search box text into tokens or regex literals, require every matcher to hit, and share the same `HighlightedText` wrapper for rendering matches.
- Highlight spans are rendered inline via `<mark>` with MagicUI-inspired styling to keep accessibility intact while avoiding hydration flicker; `findHighlightRanges` enforces limits so virtualized lists keep scrolling under 5 ms.
- When we eventually add a user-facing settings surface, expose a toggle that pipes through to `HighlightedText` so advanced users can disable the markup without touching the filter semantics.

## Session Metadata Heuristics

To group sessions correctly, the viewer looks for repository info in this order:

1. `repository_url` or `repo_url` field on the session meta line.
2. `git.repo` / `git.remote` from the captured session header.
3. `repoLabel` (if provided by your capture tooling).
4. The parent folder of `cwd` (e.g., `/path/to/<repo>/src` → `<repo>`).

If none of those exist, the session is grouped under **Unknown repo**. To avoid fallback heuristics, update your capture pipeline to emit `repository_url` or `repoLabel` in the first line of each session file.

## UI Toolkit & Configuration Notes

- **shadcn/ui**: use `npx shadcn@latest add <component>` to pull in primitives (e.g., button, card, input). Components live under `src/components/kibo-ui/` to match existing conventions.
- **Tailwind CSS v4**: configured via `app.config.ts`; global styles live in `src/app/styles/`. Treat it as CSS-first—utility classes come directly from Tailwind’s new compiler.
- **TypeScript**: Route files must be `.tsx`. Aliases: `@` resolves to the repo root and `~` resolves to `./src`, matching the TanStack Start defaults.

Keeping these details collected here prevents the README from drifting into implementation minutiae while still giving contributors a single reference for deeper technical context.
