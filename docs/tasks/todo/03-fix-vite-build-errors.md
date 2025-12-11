Context
- Vite’s client bundle traverses `src/server/lib/chatbotData.ts` and `src/server/lib/sessionUploadWatchers.ts`, both of which currently import Node-only modules (`node:crypto`, `node:fs`). Rollup replaces these with browser externals that lack the required exports, so `pnpm build` fails.
- Repository inspection confirms `hashBuffer` directly uses `crypto.createHash` and watcher initialization calls `watch` immediately on import, creating hard runtime dependencies that survive tree-shaking.
- The previous conversation proposed replacing Node crypto with Web Crypto/pure JS hashing and loading `node:fs` dynamically. We must reframe that into a repo-aligned, long-term fix that keeps server utilities SSR-safe per AGENTS guidelines and build-pipeline best practices.

Success criteria / acceptance
- `pnpm build` completes without `createHash`/`watch` Rollup errors or new warnings about Node externals.
- `loadAgentRules` and `checkDuplicateInstructionFile` still deduplicate instruction files correctly; hashing stays deterministic per file content across Node/Browsers.
- Session upload live-refresh logic continues to function in Node CLIs while failing fast (clear error) if invoked in a browser-only runtime.
- Lint/tests continue to pass; no regressions introduced in logging or event broadcasts.

Deliverables
- Refactored `src/server/lib/chatbotData.ts` implementing an async, Web Crypto–backed `hashBuffer` (with a deterministic JS fallback) and updated call sites.
- Updated `src/server/lib/sessionUploadWatchers.ts` that dynamically imports `node:fs`, performs runtime guards, and keeps `FSWatcher` type-only.
- Optional unit/integration coverage or smoke checks documenting the new hashing behavior in `docs/` if public APIs change.
- Validation notes (or CI evidence) for `pnpm build`, `pnpm test`, and `pnpm lint`.

Approach
1) **Reproduce failure & gather evidence**: Run `pnpm build` to capture exact Rollup errors and confirm no other modules pull in forbidden Node APIs. Record failing stack traces for reference.
2) **Refactor chatbot hashing**:
   - Replace the `node:crypto` import with an async `hashBuffer` that prefers `crypto.subtle.digest('SHA-256')`, falling back to a deterministic JS hash when Web Crypto is unavailable.
   - Ensure buffers are normalized to `Uint8Array`, and update `loadAgentRules` / `checkDuplicateInstructionFile` to `await hashBuffer`.
   - Consider extracting hashing into a dedicated utility if future files need it, keeping files single-responsibility.
3) **Harden session upload watcher**:
   - Convert the `node:fs` import to `import type { FSWatcher } from 'node:fs';` plus a memoized `ensureNodeFs()` dynamic import.
   - Add explicit Node-environment detection inside `initialize`; surface a descriptive error when invoked elsewhere.
   - Re-wire watcher setup to await `ensureNodeFs()` before calling `fs.watch`.
4) **Documentation & guardrails**:
   - If hashing semantics are externally relied upon, add/update docs (e.g., `docs/agents` or a README section) noting the async API.
   - Note the Node-only constraint of live upload watching in relevant developer docs if absent.
5) **Validation & cleanup**:
   - Run `pnpm lint`, `pnpm test`, and `pnpm build`. Capture logs to prove the bundler no longer injects `__vite-browser-external`.
   - Verify no stray references to `node:crypto` or `node:fs` remain via `rg`.

Risks / unknowns
- Web Crypto availability on all supported runtimes (e.g., legacy Node <18). The fallback hash must remain stable across restarts.
- Dynamic imports may affect how bundler tree-shakes server-only modules; ensure watchers aren’t accidentally invoked during SSR.
- Any consumers expecting `hashBuffer` to be synchronous will now need to handle promises; need to confirm all call sites are updated.

Testing & validation
- `pnpm build` to ensure Vite/Rollup bundling passes.
- `pnpm test` plus any targeted unit tests for `hashBuffer` (can feed known strings to assert digest matches expected hex).
- Manual smoke test of the session upload watcher (start a watcher, edit backing file, ensure update events still emit).

Rollback / escape hatch
- Revert the commits touching `chatbotData` and `sessionUploadWatchers`; this restores previous behavior (but also the build failure). Keep changes isolated per file to ease git revert.

Owner / date
- Build Systems / 2025-12-10

Assumptions / open points
- Project targets Node 18+ so Web Crypto is typically available; fallback covers older runtimes.
- `sessionUploadWatchers` is only invoked within server contexts, so throwing in non-Node runtimes is acceptable.
