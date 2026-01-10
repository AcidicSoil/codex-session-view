Title:

* Adopt TanStack Virtual for large/variable-height lists (timeline, session repo, chat transcript, conversation history)

Summary:

* The app currently uses a bespoke variable-height virtualizer for the timeline and session repo list, and fully renders some unbounded lists (chat transcript, conversation history). This creates unnecessary maintenance surface area and increases the risk of performance degradation as item counts grow. Replace the custom virtualization logic and large `map(...)` renders with TanStack Virtual’s `useVirtualizer` to standardize range calculation, measurement, overscan, and scroll APIs.

Background / Context:

* Timeline uses a custom variable-height virtualization approach (manual scroll math, offset binary search, per-row measuring, absolute positioning), which overlaps directly with TanStack Virtual responsibilities.
* Session repo list uses the same bespoke virtualization stack.
* Chat transcript and conversation history are rendered via `map(...)` and can grow unbounded, increasing DOM and render cost over time.

Current Behavior (Actual):

* Timeline list relies on a custom virtualizer implementation.
* Session repo list relies on a custom virtualizer implementation.
* Chat message transcript renders all messages (no virtualization).
* Conversation history list renders all items (no virtualization).

Expected Behavior:

* Timeline and session repo lists use TanStack Virtual (`useVirtualizer`) for range calculation, measurement, overscan, and scroll control.
* Chat transcript and conversation history lists are virtualized to cap mounted DOM nodes to the visible range (plus overscan).
* Variable-height rows are measured robustly via `measureElement`/ResizeObserver-driven measurement.

Requirements:

* Replace timeline custom virtualization in:

  * `src/components/viewer/TimelineView.tsx`
  * `src/components/viewer/TimelineList.tsx`
  * `src/components/viewer/AnimatedTimelineList.tsx`
* Replace session repo custom virtualization in:

  * `src/components/viewer/SessionRepoVirtualList.tsx`
* Virtualize chat transcript in:

  * `src/components/chatbot/ChatDockMessages.tsx`
  * `src/components/viewer/ChatDock.tsx`
* Virtualize conversation history list in:

  * `src/components/ui/ai-chat-history/ConversationGroup.tsx` (and the parent list mapping groups)
* Use TanStack Virtual features to reduce bespoke cache/math:

  * `measureElement` for dynamic height measurement
  * `overscan`, `getItemKey`, `scrollToFn`, `scrollMargin` where applicable
* Preserve functional equivalence of existing list behavior (scrolling, item positioning, selection, and any existing animations) while changing the virtualization mechanism.
* Maintain a clear mapping from existing concepts to TanStack Virtual:

  * `totalHeight` → `virtualizer.getTotalSize()`
  * `visibleItems` → `virtualizer.getVirtualItems()`

Out of Scope:

* Virtualizing short lists (dropdowns, small menus) where item count remains low.

Reproduction Steps:

* Not provided.

Environment:

* Frontend appears to be a React + TypeScript codebase (TSX components referenced).
* OS/browser/build system/version: Unknown.

Evidence:

* Ranked target areas and file list for adoption (per assistant): timeline, session repo list, chat transcript, conversation history.
* Rationale: existing custom variable-height virtualization overlaps with TanStack Virtual; non-virtualized long lists risk DOM growth.

Decisions / Agreements:

* Prioritize TanStack Virtual adoption in this order (per assistant):

  1. Timeline event list
  2. Session repo list
  3. Chat message transcript
  4. Conversation history list
* Do not apply TanStack Virtual to short lists where payoff is low.

Open Items / Unknowns:

* Current performance baseline (FPS, commit time, render duration) and target thresholds: Unknown.
* Typical and worst-case item counts for each list: Unknown.
* Required scroll semantics for chat (e.g., auto-follow newest vs manual): Unknown.
* Specific animation/transition requirements in `AnimatedTimelineList.tsx`: Unknown.

Risks / Dependencies:

* Variable-height measurement correctness (resize, dynamic content expansion) depends on correct `measureElement` usage.
* Maintaining stable keys (`getItemKey`) is necessary to avoid scroll jumps and incorrect row reuse.
* Chat virtualization commonly needs careful handling of “stick to bottom” and scroll-to-item behavior (implementation-dependent; requirements not specified).

Acceptance Criteria:

* Timeline list uses TanStack Virtual and removes bespoke offset/range calculation and measurement cache logic while preserving visible behavior.
* Session repo list uses TanStack Virtual and removes bespoke virtualization logic while preserving visible behavior.
* Chat transcript and conversation history lists no longer mount all rows; mounted row count is bounded by viewport + overscan.
* Variable-height rows measure correctly during resize/content changes without persistent overlap/gaps/jumps in typical use.

Priority & Severity (if inferable from text):

* Not provided.

Labels (optional):

* performance
* virtualization
* tanstack-virtual
* react
* ui
