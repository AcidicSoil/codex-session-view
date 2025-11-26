# Loader requirements

- Fetch data with TanStack Start loaders.
- Never fetch or derive server state inside `useEffect`.

## Hydration stability

- Avoid suspense during hydration.
- Prefer `<ClientOnly>` for interactive widgets that depend on browser APIs.

# State management

- Keep server-synced data in TanStack DB collections.
- Avoid duplicating remote data inside Zustand stores.

# Severity notes

Always document when a rule is intentionally ignored.
