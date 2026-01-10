Title:

* Add LocalStorage-backed TanStack DB collections (persist + cross-tab sync) to TanStack app

Summary:

* Implement TanStack DB “LocalStorage Collection” support to persist small, local-only collection state across browser sessions and synchronize changes across tabs in real time.
* Feature should support direct local mutations (`insert/update/delete`), optional schema validation, and optional mutation side effects while storing all data under a single storage key.

Background / Context:

* The spec describes `localStorageCollectionOptions` for creating collections that persist to `localStorage` (or `sessionStorage`), sync across tabs via storage events, support optimistic updates with rollback, and store all data under one localStorage key.
* Installation reference: LocalStorage collections are included in `@tanstack/react-db`.
* Existing implementation note: Assistant claims a session snapshot collection already exists at `src/db/sessionSnapshots.ts` using `localStorageCollectionOptions` and is read/hydrated in `src/hooks/useFileLoader.ts` (per assistant).

Current Behavior (Actual):

* Not provided (no concrete app behavior described beyond the desire to “add this feature into my tanstack app”).

Expected Behavior:

* Local-only collections persist automatically to `localStorage` (or `sessionStorage`) and survive browser restarts.
* Updates made in one browser tab propagate to other tabs in near real time via storage events.
* Mutations occur via direct method calls (`collection.insert/update/delete`) without requiring server handlers.
* Optional schema validation can reject invalid items client-side.
* Optional mutation handlers can run side effects on insert/update/delete without blocking persistence.
* If manual transactions are used, local mutations are persisted only after explicitly accepting them.

Requirements:

* Create at least one LocalStorage-backed collection using `createCollection(localStorageCollectionOptions({...}))`.
* Required collection options:

  * `id` (unique identifier)
  * `storageKey` (single key storing all collection data)
  * `getKey` (unique key extractor for items)
* Optional capabilities to support:

  * `schema` compatible with Standard Schema (e.g., Zod/Effect)
  * `storage` override (e.g., `sessionStorage` or custom storage implementing `getItem/setItem/removeItem`)
  * `storageEventApi` override for custom synchronization mechanisms
  * `onInsert/onUpdate/onDelete` optional handlers
* Mutations:

  * Support direct local mutations with `insert`, `update`, `delete` (no server roundtrip).
* Transactions:

  * If using `createTransaction` and manually committing, call `utils.acceptMutations(transaction)` to persist local mutations after server work succeeds.
* Dependency:

  * Add/install `@tanstack/react-db`.
* SSR/Client constraint:

  * Access to browser storage must run client-side only (assistant notes this as “non-negotiable” in TanStack Start; per assistant).

Out of Scope:

* Server-synced collection behavior (Query Collection server mutation handlers) beyond the documented example.
* Large data persistence (feature targets “small amounts” of local state).

Reproduction Steps:

* Not provided.

Environment:

* OS: Unknown
* Browser: Unknown
* Framework: TanStack app (exact stack/version Unknown)
* Package versions: Unknown

Evidence:

* Spec/documentation content: “LocalStorage Collection” feature description, options, examples, and transaction note.
* Assistant-provided codebase references (unverified): `src/db/sessionSnapshots.ts`, `src/hooks/useFileLoader.ts` (per assistant).

Decisions / Agreements:

* Use `@tanstack/react-db` for LocalStorage collections (per provided doc + assistant).
* Prefer direct local mutation calls (`insert/update/delete`) rather than server mutation handlers for LocalStorage collections.
* For manual transactions: persist local mutations via `utils.acceptMutations(transaction)` after server operations (per doc).
* Keep storage access in client-only code paths (per assistant).

Open Items / Unknowns:

* Which specific app state(s) should be migrated to LocalStorage collections (preferences, drafts, UI state, etc.): Unknown.
* Storage choice per collection (`localStorage` vs `sessionStorage` vs custom): Unknown.
* Validation schema library choice (Zod/Effect/other Standard Schema): Unknown.
* Whether the app uses manual transactions requiring `acceptMutations`: Unknown.

Risks / Dependencies:

* Dependency on `@tanstack/react-db` package installation and correct imports.
* SSR/runtime risk if collection creation or storage access occurs outside the browser (per assistant).
* Cross-tab sync depends on storage events or a provided `storageEventApi`; custom storage may require a custom event API to achieve sync.

Acceptance Criteria:

* [ ] App includes `@tanstack/react-db` and can create a collection via `localStorageCollectionOptions` with required fields (`id`, `storageKey`, `getKey`).
* [ ] Calling `collection.insert/update/delete` updates in-memory data and persists changes under the configured `storageKey`.
* [ ] Opening two tabs: a mutation in Tab A is reflected in Tab B without refresh (storage event sync).
* [ ] If `storage: sessionStorage` is used, data does not persist after the session ends.
* [ ] If `schema` is configured, invalid writes are rejected (client-side validation).
* [ ] If manual transactions are used, local mutations are persisted only when `utils.acceptMutations(transaction)` is called.
* [ ] No server-side runtime errors occur due to storage access (client-only enforcement; per assistant).

Priority & Severity (if inferable from text):

* Priority: Not provided
* Severity: Not provided

Labels (optional):

* enhancement
* tanstack-db
* localstorage
* state-persistence
* cross-tab-sync
* client-only
