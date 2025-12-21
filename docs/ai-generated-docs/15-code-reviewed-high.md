- Summary:
      - What changed: Updated Playwright e2e flows to match the new Viewer UI (upload drawer,
        new filter panel text, navigation via Explorer/Inspector/Chat) and removed the
        obsolete logs-route assertions.
      - Top risks:
          - Drawer close behavior is unverified; relying on Escape can leave overlays open
            and make tests flaky. (e2e/app.spec.ts:22–26, 33–36, 56–60, 70–83)
          - Search/filter assertions are too broad and can pass even if filtering is broken,
            reducing signal. (e2e/app.spec.ts:43–51)
          - Coverage loss for /api/logs and the logs UI is unverified; if the feature still
            exists, regressions will be missed. (e2e/app.spec.ts:54–68 + removed section)
      - Approval: request_changes
  - Affected files:
    - e2e/app.spec.ts — syncs tests with current Viewer UI; removes logs tests (modified)
  - Root cause & assumptions:
    - The UI moved uploads into a drawer, changed copy/labels, and split Viewer subroutes;
        tests were failing due to stale selectors. The update aligns to new UI structures and
        removes references to missing /logs route.
    - Assumptions:
      - The logs page and /api/logs endpoint are intentionally removed or deprecated.
      - The upload drawer can always be closed via Escape, and closing is not required
            for interaction reliability.
      - There is at least one repository accordion in the session explorer after upload.
  - Findings (repeat per finding):
    - [MEDIUM] [Testing & Quality Signals] Upload drawer close not verified → likely
        flakiness
      - Where: e2e/app.spec.ts:22–26, 33–36, 56–60, 70–83
      - Evidence: Tests open the drawer and rely on page.keyboard.press('Escape') without
            asserting the drawer is closed.
      - Impact: If focus isn’t on the drawer or Escape is intercepted, the overlay can
            remain and block clicks/scrolls, causing intermittent failures in CI.
      - Standards: N/A (test reliability)
      - Repro: Run pnpm test:e2e with slow machines or different focus order; drawer may
            remain open and block nav clicks.
      - Recommendation: After Escape, assert the drawer content is hidden, or close via
            an explicit close button (e.g., locate the “✕” close control) and assert it’s
            gone.
      - Tests: Add a positive “drawer opened” assertion then “drawer closed” assertion
            around file upload in each flow.
    - [LOW] [Testing & Quality Signals] Search/filter assertions are too broad
      - Where: e2e/app.spec.ts:43–51
      - Evidence: await expect(page.getByText(/session/i).first()).toBeVisible();
      - Impact: The assertion can succeed even if filtering does nothing, since “session”
            appears in many UI strings. This reduces test signal.
      - Standards: N/A
      - Repro: Break filter logic; test still passes because “session” appears elsewhere.
      - Recommendation: Assert a specific repo label or session filename from the fixture
            (or assert a change in visible session count).
      - Tests: Add an assertion that a known session card appears when search text is set
            and disappears when changed.
    - [LOW] [Testing & Quality Signals] Coverage removal for logs feature is unverified
      - Where: e2e/app.spec.ts:removed section, git diff
      - Evidence: Tests for /api/logs and /logs UI were removed without replacement.
      - Impact: If the logs feature is still supported, regressions will go undetected.
      - Standards: N/A
      - Repro: Introduce a regression in log capture; CI won’t detect it.
      - Recommendation: Confirm whether /logs and /api/logs are removed. If still
            supported, reintroduce a minimal smoke test for log ingestion or update to the
            new route.
      - Tests: Either reinstate a minimal API smoke test or add a new UI assertion for
            the current logs view.
  - Performance:
    - Hotspots: None introduced (tests only).
    - Complexity notes: Selector breadth increases risk of false positives; not a runtime
        perf concern.
    - Bench/Monitoring plan: N/A.
  - Integration:
    - API/contracts: No direct API validation remains for /api/logs if it still exists.
    - DB migrations: N/A.
    - Feature flags & rollout: N/A.
    - Resilience: N/A.
    - Rollback plan: Revert e2e changes if CI fails.
  - Testing:
    - Coverage: Updated coverage for viewer navigation and chat flows; removed explicit
        logs coverage.
    - Gaps: Missing verification that upload drawer is closed; search/filter test is weak;
        no coverage for logs feature if it still exists.
    - Flakiness risks: Drawer close relies on Escape; broad regex selectors.
    - Targeted test plan:
      - Given the upload drawer is opened, when Escape is pressed, then the drawer
            content should be hidden or the overlay removed.
      - Given search text is applied, when a known fixture repo label is used, then only
            matching sessions are visible.
  - Docs & Observability:
    - Docs to update/create: None required if logs feature was removed; otherwise update
        testing docs to note coverage change.
    - Logs/Metrics/Traces/Alerts: N/A.
    - Runbook: N/A.
  - Open questions:
    - Is /api/logs and/or a /logs page still part of the product? If so, what is the new
        route or UI surface?
    - Is there a stable, test-friendly selector for the upload drawer close button so we
        can avoid Escape?
  - Final recommendation:
    - Decision: request_changes
    - Must-fix before merge:
      - Make drawer-close deterministic and asserted in tests.
      - Strengthen at least one filter/search assertion to avoid false positives.
      - Clarify or reinstate logs coverage if the feature still exists.
    - Nice-to-have post-merge:
      - Add stable data-testid hooks for drawer controls and filter panels to reduce
            selector fragility.
    - Confidence: medium
