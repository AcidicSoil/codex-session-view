# Session Coach Scroll Specification

Updated: 2025-12-18  
Owner: Codex

## Aesthetic Tokens

The industrial brutalist direction is encoded via dedicated CSS variables inside `src/styles/custom.css`.

- **Rails & thumb colors:** `--coach-scroll-rail`, `--coach-scroll-thumb`, `--coach-scroll-thumb-hover` drive the charcoal + acid-lime palette and power both default and `.dark` modes.
- **Focus outline:** `--coach-scroll-outline` defines the radial glow used for rested state borders and the higher-contrast outline applied while hovering/focusing (`data-coach-scroll-active="true"`).
- **Height rules:** `--coach-panel-max-height-tablet|laptop|desktop` clamp each pane (`ChatDock`, `AI Analysis`, `Hook Discovery`) so scrollbars engage before the column itself collapses. Media queries simply swap the variable target rather than redefining every rule.
- **Sticky layers:** `.coach-sticky-header` keeps analysis tabs and drawers visible with a blurred charcoal gradient. Sticky headers sit inside the scrollable viewport so they remain part of the trapped region while staying visually fixed.

Custom scrollbar skins are defined through `coach-scroll-area [data-slot='scroll-area-scrollbar|thumb']` selectors to keep Radix scrollbars consistent with the brutalist accents.

## Interaction Model

Each panel mounts inside `CoachScrollRegion`, which is responsible for registration, accessibility affordances, and wheel/keyboard choreography.

1. **Registration:** `CoachScrollProvider` assigns an `instructionsId` and collects regions ordered by their `order` prop. Regions announce themselves via `aria-label` and reuse the shared instructions paragraph.
2. **Focus capture:** `tabIndex=0` plus `onFocus` toggles `data-coach-scroll-active="true"`. Focusing automatically announces `"Focused scroll region: <label>"` via `aria-live="polite"`.
3. **Keyboard paging:** `PageUp`, `PageDown`, `Home`, and `End` manipulate the Radix viewport directly with smooth scrolling to prevent document-level jumps. During focus, pressing `Tab` cycles through registered regions (forward) or `Shift+Tab` (backwards) without leaving the scroll trap.
4. **Wheel prioritization:** Wheel + touch listeners stop propagation so the column never scrolls when the pointer is over a panel. Holding `Shift` while scrolling moves focus to the next/previous region and issues a matching live announcement.
5. **Overscroll containment:** `.coach-scroll-region` sets `overscroll-behavior: contain` to keep kinetic trackpad/touch inertia from tugging the parent container.

Assistive copy lives in the shared instructions paragraph (“Use Page Up or Page Down…”) and updates automatically when the provider adds/removes regions (e.g., future panels).

## Responsive Notes

| Breakpoint | Max Height Token | Behavior |
|------------|-----------------|-----------|
| `>=640px`  | `--coach-panel-max-height-tablet`  | Panels cap at ~78–82vh so on tablet the Chat Dock never forces the parent column off-screen. |
| `>=768px`  | `--coach-panel-max-height-laptop`  | Slightly taller envelope (82–86vh) allows side-by-side reading with AI Analysis open. |
| `>=1024px` | `--coach-panel-max-height-desktop` | Extends to ~90vh and expects dual scrollbars (chat + analysis) visible simultaneously. |

Sticky headers for AI Analysis tabs (`.coach-sticky-header`) remain inside each region so keyboard traps and touch scroll keep them anchored visually as required by the plan.

### Session Analysis Popout Parity

- The `SessionAnalysisPopouts` dialog mirrors these viewport clamps. Its wrapper (`DialogContent`) is limited to 70–95vh, while each tab content (`summary`, `commits`, `Hook Discovery`) sets `flex-1 min-h-0` so `CoachScrollRegion` owns the scroll budget.
- Hook Discovery / “Hookify Analysis Results” specifically wraps the scroll region with a flex container, ensuring the Summary footer never bleeds beneath the dialog edge and users can read the full markdown output without nested scroll clipping.

## Simultaneous Overflow Guidelines

- Hover or focus determines the active scroll region; only that pane reacts to wheel/touch events.
- `Shift + Scroll` rotates focus to the next pane and announces the transition.
- `startTransition` is used around synchronous updates that might suspend hydration (see `CoachScrollRegion` consumers) so SSR fallbacks never flash.
- Chat header + input live outside the scroll container, so they remain visible even when conversations stretch several screens. The new Playwright smoke test (`session coach scroll regions isolate wheel input`) checks that the composer’s bounding box does not move after injecting large scroll content.

## QA Script

1. Load `/viewer` at 1440×900, hover each `coach-scroll` panel, and confirm the acid-green border highlights and thumb glow.
2. Scroll the chat thread via mouse wheel; verify the AI Analysis column does not move and `window.scrollY` stays constant.
3. Repeat on Analysis and Hook Discovery panels; confirm sticky headers remain visible.
4. Keyboard test: focus Chat Dock, press `PageDown`, `Home`, `End`, and `Shift + Scroll` to cycle through other panels. Ensure the announcer text updates accordingly (`aria-live="polite"`).
5. Reduced motion / forced-colors: toggle OS settings and ensure scrollbars fall back to system defaults (via the `prefers-reduced-motion` guard and relying on high-contrast colors for rails/thumbs).

## Automated Coverage

- **Unit:** `tests/CoachScrollRegion.test.tsx` uses React Testing Library to assert that focus announcements fire, `aria-describedby` is wired, and shift-wheel cycling updates the live region text.
- **E2E:** The new Playwright test in `e2e/app.spec.ts` scrolls the Chat Dock viewport directly, verifies the composer header remains fixed, and ensures the outer page does not scroll—demonstrating independent scroll traps.

Runbook:

```bash
pnpm test --runInBand CoachScrollRegion
pnpm test:e2e --grep \"scroll regions\"
```

These scripts, plus `pnpm lint`, must stay green before shipping additional Session Coach changes.
