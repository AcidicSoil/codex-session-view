## E2E testing policy (must follow)

When asked to add/modify end-to-end tests, first invoke `$e2e-targeting` and treat its decisions as the gate:

- Only implement tests listed under “E2E candidates (approved)”
- Convert “Not E2E (rejected)” into unit/integration/contract/visual tests instead
- Enforce the stability contract (selectors, waits, data isolation, stubs)

After `$e2e-targeting`, proceed with the normal `$webapp-testing` workflow for implementation.
