# Task for CLI agent

## Objective
Implement sticky positioning for the "Session Flow" navigation bar to remain visible during scrolling.

## Implementation details
- Locate the CSS class associated with the "Session Flow" navigation container (e.g., by inspecting HTML elements or existing CSS patterns).
- Modify the identified class to include:
  - `position: sticky;`
  - `top: 0;`
  - `z-index: 1000;`
  - `background-color: var(--your-background-color);`
  - `backdrop-filter: blur(8px);`
  - `border-bottom: 1px solid rgba(255, 255, 255, 0.1);`
- Verify the parent container of the navigation bar does not have `overflow: hidden` (if it does, adjust parent styles to allow scrolling).
- Preserve existing responsive behavior by maintaining mobile-friendly padding/margins.

## Constraints
- Do not alter existing CSS properties unrelated to sticky positioning.
- Ensure compatibility with all modern browsers (Chrome, Firefox, Safari, Edge).
- Maintain the original navigation bar's visual hierarchy and spacing.
- Use `var(--your-background-color)` if available; otherwise, default to a neutral color like `#ffffff`.

## Acceptance criteria
- Scrolling down the page keeps the navigation bar fixed at the top of the viewport.
- The background color and glass-morphism effect are applied without visual artifacts.
- Navigation bar remains above other content elements during scrolling.
- No layout shifts or unexpected behavior occurs when interacting with the page.
- Tests verify behavior across mobile and desktop breakpoints.
