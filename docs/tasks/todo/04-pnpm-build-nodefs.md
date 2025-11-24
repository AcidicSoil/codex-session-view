Context
- `pnpm build` fails because `src/server/persistence/sessionUploads.ts` imports `fs.promises` at module scope, so Vite bundles it into the client graph and Rollup can’t satisfy the Node builtin.
- AGENTS.md requires server work to stay on the server; lazy-loading Node APIs (like `browserLogs.ts` does) keeps them out of the client bundle.

Success criteria
- Build succeeds without “module externalized” errors.
- Session upload features (persisting uploads, syncing bundled sessions) keep working locally.
- Tests covering sessionUploads still pass.

Deliverables
- Refactored `sessionUploads.ts` that lazy-loads `node:fs/promises` via an async helper.
- Optional doc note describing the pattern.
- Updated tests/build output.

Approach
1) Remove the static `import { promises as fs } from 'fs'/'node:fs'` and add a cached `async function loadFs()` similar to `browserLogs.ts`.
2) Update every `fs.*` call (stat/readFile/writeFile, etc.) to `const fs = await loadFs();` before use.
3) Run `pnpm build` and `pnpm vitest run tests/sessionUploads.test.ts` to ensure bundling and logic still work.
4) Document the “server-only lazy load” rule in `docs/viewer-architecture.md` if not already captured.

Risks / unknowns
- Need to confirm no other persistence helpers import `fs` synchronously; if they do, follow-up tasks may be required.
- Ensure tree-shaking doesn’t accidentally drop the lazy loader (should be fine since functions reference it).

Testing & validation
- `pnpm build`
- `pnpm vitest run tests/sessionUploads.test.ts`

Rollback / escape hatch
- Revert `sessionUploads.ts` to the prior version and accept the build failure (undesirable, but safe if needed).

Owner/Date
- Codex / 2025-02-14
