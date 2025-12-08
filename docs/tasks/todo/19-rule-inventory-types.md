Context
- `src/server/lib/ruleInventory.ts` imports Node’s `path.relative`, but client components import its exported types, pulling Node-only code into the browser bundle and causing runtime errors.
- Chat/Inspector views crash (“Module node:path externalized”) and the viewer gets stuck on load because of this bundling mismatch.

Success criteria
- Viewer routes load without `node:path` runtime errors; Rule Inventory types are accessible from client code without importing server modules.
- Server logic retains nested-path calculation (`normalizeSourcePath`) while type definitions remain browser-safe.

Deliverables
- New browser-safe shared module for `RuleInventoryRule`/`RuleInventoryEntry` types.
- Updates to `src/server/lib/ruleInventory.ts` to consume shared types and keep Node imports server-only.
- Client components updated to reference the shared types module.

Approach
1) Create `src/lib/ruleInventoryTypes.ts` exporting shared interfaces (and any enums) with no Node imports.
2) Update `src/server/lib/ruleInventory.ts` to import types from the new module; leave business logic and `normalizeSourcePath` server-side.
3) Update client consumers (`SessionRuleSheet`, `RuleInspectorSheet`, others if any) to import types from the shared module.
4) Verify no other files import the server module from the client bundle; adjust as needed.

Risks / unknowns
- Need to ensure there aren’t additional type imports (e.g., via `~/server/...`) that also require refactoring.
- Potential lingering bundler caches; plan a dev server restart after refactor.

Testing & validation
- Run `pnpm build` (or `pnpm dev`) and load viewer routes to confirm no `node:path` errors.
- Manually check Rule Inventory UI still renders nested paths correctly.

Rollback / escape hatch
- If regressions occur, revert to prior state by pointing client imports back to server file (temporary), but leave Node import guarded until a better solution lands.

Owner/Date
- Fullstack team / 2024-05-21
