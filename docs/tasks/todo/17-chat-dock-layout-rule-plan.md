Context
- Rule Inventory, Chat dock, and Session Coach areas exhibit messy layouts, truncated data, and poor responsiveness, especially at half-window sizes.
- Rule violations currently lack clear linkage to Inspector events and are missing severity-aware badges in chat/coach surfaces.
- Filters, nested rule paths, and “Add to chat” plumbing are unreliable, blocking analysis workflows.

Success criteria
- Rule Inventory displays full nested instruction paths, readable descriptions, functional severity filters, and responsive layout without horizontal scrolling.
- Rules link directly to their triggering Inspector events; “Add to chat” reliably surfaces those events (with rule metadata) in the Chat dock/Session Coach.
- Chat entries show a severity-colored badge containing the violated rule header whenever a violation is present.
- Layouts for Chat dock and Session Coach remain usable at half-screen widths without overflow or clipped text.

Deliverables
- Refactored Rule Inventory UI components/styles (with grouping, truncation handling, nested paths, responsive layout, severity filters).
- Event-to-rule linkage plumbing plus front-end affordance to navigate/highlight corresponding Inspector events.
- Backend/API adjustments ensuring nested paths and rule metadata are provided to both Rule Inventory and chat surfaces.
- Chat badge component wired into Chat dock/Session Coach plus updated “Add to chat” flow.
- QA/test checklist or automated tests covering filters, layout responsiveness, chat badge rendering, and event-link navigation.

Approach
1) Discovery & contracts
   - Audit current Rule Inventory, Inspector, Chat dock data flow; document required fields (nested path, rule header, severity, event ids).
   - Align with backend engineer on payload updates and guarantees for violation metadata.
2) Backend updates
   - Extend rule parsing to emit nested instruction paths and link rule IDs to events; ensure APIs used by Rule Inventory and chat include these fields.
   - Fix “Add to chat” endpoint so event props (with rule data) are delivered consistently.
3) Front-end data plumbing
   - Update data loaders/hooks to consume new backend fields; add graceful fallbacks/logging if data is temporarily missing.
4) UI/UX implementation
   - Rebuild Rule Inventory layout using responsive Grid/Flex, remove redundant session column, show nested paths, add ellipsis/tooltip or expanders for long descriptions, and wire working severity filter interactions.
   - Add UI controls to jump from a rule to its linked Inspector event (highlight/scroll).
   - Implement severity-colored rule badge positioned on the front-facing event prop in Chat dock/Session Coach; ensure only one badge renders per message for now.
5) Integration & polish
   - Validate half-screen responsiveness for Rule Inventory, Chat dock, Session Coach; adjust CSS as needed.
   - Add tests (unit/visual/integration) and document usage plus any feature flags or migration notes.

Risks / unknowns
- Assumes backend can deliver nested paths and rule-event linkage; legacy sessions may lack this metadata, requiring fallback UI.
- Potential complexity displaying multiple rule-event associations; currently limited to a single badge/link (needs confirmation for future expansion).
- Color palette/accessibility for severity badges must meet contrast requirements; may require design input.
- Linking to Inspector events depends on stable event ids and timeline behavior; navigation might need new APIs if not already present.

Testing & validation
- Unit/UI tests for Rule Inventory filters, nested path rendering, tooltip/expander, and badge component (all severity levels).
- Integration tests for “Add to chat” flow, ensuring events with violations produce badges and appear in Session Coach.
- Manual/automated responsive checks at half-window and mobile breakpoints for Chat dock, Session Coach, and Rule Inventory.
- Regression passes on Explorer/Inspector to ensure no adverse effects on existing navigation or timelines.

Rollback / escape hatch
- Guard new layouts and badge rendering behind feature flags; retain legacy components/routes for rapid revert if issues arise.
- If backend payload updates fail, fall back to current UI while logging missing metadata to observability.

Owner/Date
- Frontend & Backend pairing team / 2024-05-21
