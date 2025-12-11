Context
- Timeline command filtering was prototyped with toggles + free-text input, but the user wants a single combobox control that supports both exact command families (sed, rg, git, apply_patch, etc.) and ad-hoc text queries, wired through URL/search + UI settings.
- Existing command metadata parsing is inconsistent, so badges on timeline cards show generic labels instead of the actual command token or touched file, and filters often produce zero matches despite relevant events.
- Range controls must expose both numeric inputs and a slider so analysts can set start/end indices precisely while keeping the URL/search + loader data in sync.

Success criteria / acceptance
- Command filters are managed by a combobox that lists known command families, supports selecting multiple families without an arbitrary cap, allows typed filtering, and reflects selections via removable chips + URL/search state for future extensibility.
- matchesCommandFilter correctly matches LocalShellCall events for at least git, sed, rg, apply_patch, pnpm, npm, yarn, curl, plus arbitrary substring queries, verified by unit tests.
- Timeline event cards render at most two badges per event face: one for the literal command token (e.g., `rg`) and one for the primary filename derived from stdout/path, each with tooltips for full command/path.
- Range controls display synchronized numeric inputs and a range slider; adjustments immediately update timelinePreferences, router search params, and loader-provided ranges without desync.
- pnpm lint and pnpm test pass after updates.

Deliverables
- Updated command metadata utilities with richer parsing + tests.
- New combobox-based ToolCommandFilter component (+ any supporting UI primitives) wired into TimelineWithFilters and uiSettingsStore.
- Timeline badge rendering updates to show command/file badges accurately.
- Documentation snippet (append to docs/tasks or existing README section) describing the command filter UX + badge semantics.
- Test coverage for command filtering (unit + component) and regression of range control serialization.

Approach
1) **Audit current data + helpers** – Review `extractCommandMetadata`, `matchesCommandFilter`, and `buildEventBadges` with real fixture data to catalog gaps (missing command token parsing, stdout file detection) and document required metadata fields.
2) **Enhance metadata + tests** – Extend command taxonomy definitions (aliases, regex tweaks), normalize tokens, and add vitest coverage in `src/lib/session-events/__tests__` proving classification + query matching for sample LocalShellCall events and fallback behavior for FunctionCall/WebSearch events.
3) **Rebuild ToolCommandFilter as combobox** – Replace ToggleGroup/Input UI with a multi-select combobox (likely `src/components/ui/combobox.tsx` + chips) that supports selecting any number of command families plus a typed query; ensure it updates `timelinePreferences.commandFilter`, syncs via `applyViewerSearchUpdates`, and persists through URL reloads while remaining extensible.
4) **Wire filtering + range state** – Confirm `matchesCommandFilter` integrates before other filters in `TimelineWithFilters`, verify no-match behavior, and double-check `TimelineRangeControls` keeps slider + numeric inputs synchronized with router search + loader defaults.
5) **Badge improvements** – Update `buildEventBadges` + `AnimatedTimelineList` to show only the primary command token + up to one filename badge (with tooltips) based on new metadata so cards stay legible.
6) **Docs + validation** – Update docs to describe the new UX, then run `pnpm lint` and targeted `pnpm test` suites; add or update Playwright coverage if feasible for the combobox + range flow.

Risks / unknowns
- Some events may lack command strings or mix tools in stdout/stderr, so badges/filters must degrade gracefully without hiding useful events.
- The new combobox must remain accessible and keyboard-friendly; relying solely on mouse interactions risks usability regressions.
- Search-param churn from rapid slider/input changes could cause router spam; may need debouncing or transition wrappers if performance drops.

Testing & validation
- Vitest suites for command metadata/filter matching and range helper serialization.
- Component tests (React Testing Library) for ToolCommandFilter interactions (selecting/removing families, typing queries) and verifying `matchesCommandFilter` integration.
- Manual + Playwright smoke flows covering range slider + inputs, command combobox selection, badge rendering, and URL persistence.
- `pnpm lint` and `pnpm test` prior to completion.

Rollback / escape hatch
- Keep previous toggle/input implementation behind a feature flag or git history checkpoint so we can quickly revert to the old controls if the combobox introduces regressions.

Owner/Date
- Codex / 2025-12-11
