# ChatDock Attachment Follow-up

## Context
- The shimmer "Add to chat" buttons on session cards and timeline entries currently only emit log statements.
- ChatDock lacks an attachment API, so queued data is not persisted or rendered anywhere.
- Users receive no feedback after tapping the new buttons.

## Next Steps
1. **Define attachment payloads**: Decide what data ChatDock needs for a session (full file path, repo metadata, cached File) and for a timeline event (event object, index, snippet). Document shape in `ChatDock` props/types.
2. **Plumb handlers through ChatDock**: Replace the temporary loggers in `viewer.page.tsx` with real functions that push attachments into ChatDock state (or a zustand store) and expose them via props/context.
3. **UX feedback**: Show immediate confirmation after clicking "Add to chat"—e.g., toast, badge, or disabled state until processed.
4. **Persistence / reconciliation**: Decide whether attachments survive reloads (persist in local storage) or clear when the session changes.
5. **Testing**: Add unit tests covering the new store/helpers plus UI tests ensuring buttons trigger attachment creation.

## Status
- Pending design + implementation.
