Context

* Session Viewer scroll freezes after clicking "Load session", suggesting some focus trap or overflow lock persists once the detail pane opens.
* Issue blocks analysts from browsing other sessions without a full page refresh, hurting core discovery workflows.
* Current behavior likely ties to Session Viewer modal/panel logic that manipulates scrolling or focus for accessibility.

Success criteria

* Reproducing steps on latest main no longer freeze the page or list scrolling.
* Loading any session preserves native scroll for the containing viewport (page or session list) across Chrome, Firefox, and Safari.
* No regressions in accessibility behaviors (focus trapping, keyboard navigation) or layout (session detail, sticky headers) during/after loading a session.

Deliverables

* Code changes in the Session Viewer feature restoring scrolling without regressions.
* Automated coverage (unit or component test) demonstrating scroll lock toggles correctly when sessions are opened/closed.
* Documentation and/or changelog entry explaining the regression and fix.

Approach

1. Reproduce freeze in local dev with multiple sessions to confirm exact triggers, viewport (body vs. panel), and recent commits involved.
2. Trace Session Viewer mount/unmount flow (SessionList, detail panes, overlays, focus locks) to locate any persistent `overflow: hidden`, pointer-event blocks, or `useScrollLock` usage.
3. Audit global listeners (keydown, wheel, pointer) or modal helpers that may be invoked by `Load session`; document the intended scroll management behavior.
4. Design sustainable fix (e.g., scoped scroll lock tied to modal visibility, route state, or virtualization container) that respects AGENTS rules (route loaders, no effect-based data fetch) and avoids god modules; add targeted module if current file mixes responsibilities.
5. Implement fix with clear separation (transport vs. domain vs. UI), update persistence hooks/stores if they mediate scroll state, and ensure cleanup on navigation/close.
6. Add automated test(s) plus manual QA checklist verifying scroll + focus interactions, run full `pnpm test`, and update docs/changelog.

Risks / unknowns

* Root cause may stem from third-party component behavior (e.g., radix dialog) requiring upstream patching.
* Session list virtualization/performance optimizations could interact with scroll restoration, complicating fixes.
* If scroll locking is shared with other viewers/modals, changes must avoid regressing those flows.

Testing & validation

* Automated: Component/unit tests covering scroll lock helper(s) and Session Viewer open/close semantics.
* Manual: Cross-browser verification (Chrome, Firefox, Safari) on macOS/Windows, keyboard-only navigation, and screen reader smoke test to ensure focus states remain correct.
* Regression: Validate long session lists, multi-repo views, and repeated open/close cycles.

Rollback / escape hatch

* If regressions appear, revert to previous scroll lock helper behavior and gate the new logic behind a feature flag or route-level opt-in while investigating.

Owner/Date

* Codex / 2025-12-14
