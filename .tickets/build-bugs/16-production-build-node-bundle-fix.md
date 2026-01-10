Context

* Production build fails because client bundle still pulls server-only modules (node builtins), causing Vite externalization errors.
* Server-only filesystem/persistence code must be isolated behind TanStack Start execution boundaries (`createServerOnlyFn` / `.server()`), per the Start execution model and prior checklist notes about runtime separation.
* Review and align with `Production build error fix_checklist.md` to avoid build-time glob assumptions and runtime path errors.

Success criteria

* `pnpm build` completes without “externalized for browser compatibility” errors.
* Client assets in `dist/client` contain no `node:` imports (guard script passes).
* Server functions continue to work with no behavior regressions in session discovery, chat state, uploads, or hookify flows.

Deliverables

* Code: complete server-only module boundaries (rename to `.server.ts`, update imports, add `createServerOnlyFn` loaders where needed).
* Docs: update README logging boundary note if needed; update checklist references if new patterns are introduced.
* Tests: keep/extend `pnpm check:client-bundle` as build guard.

Approach

1. Trace remaining client-bundle leaks by searching for imports of server-only modules from non-`.server` files (server functions, routes, shared modules).
2. Move any Node-dependent server modules to `.server.ts` and update all imports accordingly (no workarounds; consistent naming and boundaries).
3. Ensure server function entrypoints are thin and load heavy server modules via `createServerOnlyFn` or dynamic `import()` inside handlers.
4. Cross-check against `Production build error fix_checklist.md`: avoid build-time globs for runtime files; ensure workspace roots are explicit and per-file failures are tolerant.
5. Re-run `pnpm build` and `pnpm check:client-bundle`; update docs/tests if any new guard rules are added.

Risks / unknowns

* Hidden imports in generated route files or Vite plugin behavior could still pull server modules into client build.
* Some modules may be assumed to be isomorphic but rely on Node-only globals; splitting may require small refactors.
* Build-time globs in server discovery could still create production runtime mismatch if they stay in shared modules.

Testing & validation

* `pnpm build`
* `pnpm check:client-bundle`
* `pnpm test:e2e` (after build passes)

Rollback / escape hatch

* Revert individual module splits if they break runtime behavior, but keep the invariant: any Node-dependent code must live in `.server.ts` or a server-only function.

Owner/Date

* codex / 2025-12-21
