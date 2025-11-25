* Affected files:

  * `src/routes/(site)/events/index.tsx` (or equivalent page that renders the “Timeline tracing beam” layout): owns the main grid/stacking for the timeline, dropzone area, chat dock, and sticky navbar; current structure is causing bad viewport sizing, misaligned chat dock, and missing sticky behavior.
  * `src/components/events/TimelineTracingBeam.tsx` (or the tracing-beam wrapper you imported from the UI kit): currently renders the beam as a static bar pinned to the far left of the viewport instead of as a scroll-progress indicator bound to the timeline section.
  * `src/components/events/SessionUploadDropzone.tsx` (existing dropzone implementation that was disabled or moved) and any local wrapper in the events page: dropzone is no longer active and is positioned too low in the page hierarchy.
  * `src/components/events/ChatDock.tsx` plus its container in the events page: layout uses absolute/fixed positioning or an oversized flex column so the dock drifts to the side when the viewport is wide or fullscreen.
  * Layout/shell styles, likely `src/components/layout/AppShell.tsx` or global styles (Tailwind classes on the root `<body>`/shell): use of `h-screen`, nested `overflow-hidden`, and full-width containers is fighting the new design and breaking consistent viewport behavior.

* Root cause:

  * The new marketing/events layout was dropped in without re-anchoring it to the existing shell constraints: several wrappers still use `h-screen`/fixed heights and `overflow-hidden`, so the timeline panel and chat dock are being sized relative to the viewport instead of the content container, which breaks at different screen sizes and in fullscreen. The dropzone component appears to have been disabled or left in its old location instead of being moved into the new “Upload & Stream / Session ingest controls” block near the top. The tracing beam component was wired as a decorative gradient on the extreme left of the page instead of being bound to the scroll position of the timeline section (no scroll progress mapping, wrong parent for `position: absolute`). The navbar is either inside an overflowing container or missing `sticky top-0 z-50`, so once the hero scrolls out of view it behaves like a normal block and disappears instead of pinning to the top.

* Proposed fix:

  * Layout and viewport:

    * In the events route, change the top-level page container to use `min-h-screen` instead of `h-screen`, and remove unnecessary `overflow-hidden` from intermediate wrappers; keep `overflow-x-hidden` only at the shell level if needed.
    * Wrap the main content in a centered container, e.g. `<div className="mx-auto w-full max-w-6xl px-4 lg:px-8">`, and structure the body as a responsive grid: left column for the timeline + tracing beam, right column for the chat dock. Avoid `w-screen` on children; use `w-full` inside the max-width container.
  * Dropzone:

    * Re-enable the existing dropzone component and place it high in the page under the “Upload & Stream / Session ingest controls” heading, before the timeline list. Concretely: import `SessionUploadDropzone` (or your current dropzone) into the events route, render it in the ingest card where the “Upload files / Upload folder” controls sit now, and ensure it’s not inside a scroll-locked panel.
    * Restore its props/state to match the previous working page (session persistence, folder selection, etc.) and keep all fetching logic on the server/loader side per AGENTS; only UI wiring should live here.
  * Chat dock placement:

    * Move `<ChatDock />` into the right column of the main grid and make it `sticky` instead of `fixed`/absolute: e.g. `<div className="lg:col-span-1"><div className="sticky top-24"><ChatDock /></div></div>`.
    * Remove any explicit `left/right` offsets that push it out of the central max-width container, and ensure the parent grid itself is centered; this keeps the dock visually aligned with the timeline card when fullscreen.
  * Tracing beam behavior:

    * Update the tracing beam wrapper to follow the UI kit’s pattern: wrap the timeline list in a `relative` container and render the beam as an `absolute left-0` or `left-4` child inside that container, not at the viewport edge.
    * Use the same scroll-progress logic as the demo (e.g. Framer Motion `useScroll({ target: ref, offset: ["start start", "end start"] })`) and set the beam’s height from `scrollYProgress` so it grows as the user scrolls down the timeline and shrinks when they scroll up. Ensure the scroll target is the timeline section, not the whole page/body.
  * Sticky navbar:

    * Hoist the navbar container so it’s a direct child of the page shell, outside any `overflow-hidden` blocks, and apply `className="sticky top-0 z-50"` (plus backdrop if desired).
    * Ensure the content below has enough top padding/margin to account for the navbar’s height so it doesn’t overlap the hero when pinned.
  * Tests:

    * Add a Playwright test for the events page that: (1) verifies the dropzone is present and enabled near the top of the page, (2) scrolls the timeline and asserts the gradient beam’s height increases/decreases with scroll, (3) confirms the navbar remains visible at the top of the viewport after scrolling past the hero, and (4) checks that the chat dock stays visually adjacent to the timeline content, not hard against the viewport edge, at a large viewport width.
    * Add a basic React testing-library snapshot or DOM test for the events route verifying the layout hierarchy (navbar → hero → ingest/dropzone → timeline + tracing beam → chat dock) so future refactors don’t accidentally bury key sections.

* Documentation gaps:

  * Add a short “Events / Timeline tracing beam layout” section to your UI docs or `docs/pages/events.md` describing: (1) grid structure (timeline left, chat dock right, centered max-width), (2) where the dropzone must live, (3) how the tracing beam’s scroll target is configured, and (4) navbar stickiness requirements.
  * Update any design system notes for custom scroll indicators to specify that progress bars are bound to section scroll, not full-page scroll, and must be implemented inside relative containers to avoid the beam being pinned to the viewport edge.

* Open questions/assumptions:

  * Assumes the actual paths are close to the ones listed above and that the dropzone/chat-dock components already exist and previously worked on another page; if they were inlined only on this page, their logic will need to be re-extracted into reusable components before relocation.
  * Assumes mobile behavior should keep the dropzone at the top and stack the chat dock below the timeline; if a different mobile layout is required, the grid/stack rules will need explicit `md:`/`lg:` breakpoint tuning.
