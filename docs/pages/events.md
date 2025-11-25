# Events / Timeline Tracing Beam Layout

This page captures the structural requirements for the viewer/events route so the “Upload & Stream” experience stays aligned with the new marketing shell.

## Grid + Shell

- The route renders inside `src/features/viewer/viewer.page.tsx` and always wraps the body in `min-h-screen` with a centered `max-w-6xl` container.
- Content is structured as a responsive grid: the left column hosts the timeline hero (AnimatedTabs + sticky reveal cards) while the right column holds the chat dock. Use `xl:grid-cols-[minmax(0,1fr)_360px]` and keep children at `w-full` so fullscreen and ultrawide layouts don’t drift.
- The floating navbar (`FloatingNavbar`) sits above the grid, outside any `overflow-hidden` wrappers, so its `sticky top-6` behavior survives through scroll.

## Dropzone Placement

- `SessionUploadDropzone` renders directly inside `UploadControlsCard`, immediately under the “Session ingest controls” heading.
- The dropzone is not nested inside scroll-locked panes; it lives near the top of the timeline column to stay visible the moment the page loads.
- All drag/drop interactions route through the upload controller: dropping a single file streams it immediately, while multi-drop/folder selection persists the entire batch before reconciliation.

## Tracing Beam Binding

- `TimelineTracingBeam` wraps `TimelineWithFilters` so the gradient beam lives inside a `relative` container rather than the viewport edge.
- The component tracks `scrollYProgress` for the timeline section only (`offset: ['start 0.85', 'end 0.15']`) and scales the beam from the top, giving a proper scroll-progress indicator instead of a static decoration.
- The virtualized list auto-resizes between 480px and 960px tall (clamped to `window.innerHeight - 320px`) so shorter viewports keep the controls visible without locking the layout to one size.
- Tests reference `data-testid="timeline-tracing-beam"`—do not remove it if you refactor; update the Playwright assertions instead.

## Sticky Navbar & Chat Dock

- `Header` (global nav) stays sticky via `sticky top-0 z-50`, and the floating navbar handles in-page anchors. Avoid wrapping either inside containers that set `overflow: hidden` or `overflow: auto`.
- The chat dock sits in the right grid column within a `sticky top-24` wrapper. Keep it inside the central container so it stays visually aligned with the tracing beam when toggling fullscreen.

## Filter Menu

- Timeline and session explorer filters live inside `ViewerFilterDropdown`, a dropdown button rendered next to the floating navbar.
- `UploadTimelineSection` and `SessionList` register their filter toolbars via `onFiltersRender`, so those panels no longer render inline—re-mounting them elsewhere requires calling the same registration hook.
- The dropdown is safe to reuse elsewhere: pass the rendered filter nodes to `ViewerFilterDropdown` to share the grouped UI across routes.
