# Timeline Search Filter Improvements

## Context

- The current search feature filters the timeline to 12 matches (for example) but acts as a simple filter list.
- Users want "Find in Page" style navigation to jump between specific matches without manually scrolling.
- Currently, there is no visual indicator of *which* match is focused (e.g., it might say "Showing 12 matches" or a static number, but doesn't update to "3 of 12" as you navigate).

## Success Criteria

- **Active Index Indicator:** UI displays "${current} of ${total}" matches (e.g., "1 of 12").
- **Keyboard Navigation:**
  - `Enter`: Jumps to next match.
  - `Shift+Enter`: Jumps to previous match.
  - Logic wraps around (Next on last match goes to first).
- **Auto-Scroll (Centering):** When the active index changes, the timeline automatically scrolls the target event to the **center** of the viewport.
- **Visual Buttons (Optional):** Add small "Up" (^) and "Down" (v) chevron buttons next to the input for mouse-only navigation.

## Deliverables

- Updated Search/Filter React component.
- `useSearchNavigation` hook (or internal logic) to handle the `activeMatchIndex` state.
- Integration with the Virtualizer/Scroll container to trigger `scrollIntoView({ block: 'center' })`.

## Approach

1) **State:** Add `activeMatchIndex` (number, default -1 or 0) and `totalMatches` (derived from filtered list length).
2) **Input Handler:**
   - On text change: Reset `activeMatchIndex` to 0 (first match) or -1. Update `totalMatches`.
   - On `KeyDown`:
     - If `Enter`: `setIndex((prev) => (prev + 1) % total)`.
     - If `Shift+Enter`: `setIndex((prev) => (prev - 1 + total) % total)`.
3) **Scroll Effect:**
   - Watch `activeMatchIndex`.
   - When it changes, find the DOM node for that specific event ID.
   - Trigger `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
4) **UI Update:**
   - Update the status text area to show `${activeMatchIndex + 1} of ${totalMatches}` when a search is active.

## Risks / Unknowns

- **Virtualization:** If the target match is not currently rendered in the DOM (due to being far off-screen in a virtualized list), `document.getElementById` will fail.
- **Mitigation:** We must use the Virtualizer's `scrollToIndex` method (if available) instead of raw DOM manipulation, or ensure the index is effectively communicated to the list component.

## Testing & Validation

- **Manual Test:** Search for a common term (e.g., "User"). Press Enter repeatedly. Verify the view scrolls and centers on each successive message.
- **Edge Case:** Search for a term with 0 results (ensure no crash). Search for 1 result (ensure Enter doesn't jump or jitter).

## Owner/Date

- Gemini / 2025-12-08
