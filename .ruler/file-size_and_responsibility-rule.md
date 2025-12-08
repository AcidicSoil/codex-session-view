# file size and responsibility rules

## core rules

1. One primary unit per file
   - Each file owns **one main thing**:
     - Components: one main component (existing rule).
     - Hooks: one main hook (`useXxx`).
     - Server functions: one main server function or handler group for a single route.
     - Utilities: one cohesive utility topic (e.g. `dateFormat`, `sessionSearch`, `featureFlags`).
     - Schema: one logical schema group (e.g. `session.schema.ts`).
   - Any additional exports must be:
     - Small helpers directly supporting the main unit, or
     - Type-only exports.

2. File-size limits (non-component, general case)
   - Soft target: **150–300 LOC** per file (excluding imports and types).
   - Warning zone: **> 400 LOC** → required refactor before adding new behavior.
   - Hard cap: **600 LOC**. No exceptions; split into smaller files before merging.

3. Split by concern
   - **Stateful logic, effects, orchestration → hooks/logic files**:
     - `FeatureName/FeatureName.hooks.ts`
     - `FeatureName/FeatureName.logic.ts`
   - **Pure data shaping, parsing, formatting → utility files**:
     - `FeatureName/FeatureName.utils.ts`
     - `FeatureName/FeatureName.format.ts`
   - **Types/interfaces/enums shared across files → type files**:
     - `FeatureName/FeatureName.types.ts`
   - **Route/server concerns → route/server files only**:
     - Keep HTTP handling, validation, and side effects here.
     - Push domain logic into shared `*.logic.ts` or `*.utils.ts`.

4. When to split a file (hard triggers, any file type)
   - File > **400 LOC** or diff adds > **80 LOC** to a file already > **300 LOC**.
   - File mixes **two or more** of:
     - Network/server I/O (fetch, db, server functions)
     - Business/domain logic (calculations, rules)
     - UI / presentation (components, JSX, templates)
     - Cross-cutting concerns (logging, metrics, feature flags)
   - File exports **many unrelated things**:
     - More than **5–7 public exports** with different purposes.
     - Utilities that clearly belong to different topics (e.g. date helpers + string helpers).
   - Control flow / branching is hard to scan:
     - Deeply nested conditionals or long switch statements (`> ~100 LOC`) that can be moved into dedicated helpers.

5. Structure conventions by file kind
   - **Hooks**:
     - `FeatureName/FeatureName.hooks.ts` → owns `useFeatureNameXxx` hooks.
     - No JSX, no DOM; only state, effects, and derived data.
   - **Logic / services**:
     - `FeatureName/FeatureName.logic.ts` or `FeatureName/service.ts`.
     - Pure, testable functions; no React imports.
   - **Utilities / formatting**:
     - `FeatureName/FeatureName.utils.ts`, `FeatureName/FeatureName.format.ts`.
     - Pure, side-effect-free; reusable across features.
   - **Types**:
     - `FeatureName/FeatureName.types.ts`.
     - No runtime code.
   - **Server functions / routes**:
     - One route or server function group per file.
     - Validation + wiring here; heavy domain logic pushed into `*.logic.ts`.

6. Review checklist (for any file)
   - [ ] Does this file have **one clearly named primary responsibility**?
   - [ ] Is the file within the **150–300 LOC target** and **< 400 LOC** unless it’s about to be split?
   - [ ] Are stateful logic and side effects separated from pure helpers?
   - [ ] Are different concerns (I/O, domain logic, formatting, UI) split into distinct files?
   - [ ] Are exported functions/types cohesive, or should some move to a `*.utils.ts` / `*.logic.ts` / `*.types.ts` file?

---

Repository-wide, you want the same idea applied to any source file: one main responsibility, tight size bounds, and hard triggers that force you to split before the file becomes a gravity well. You already have the component-specific version in `src/components/AGENTS.md`.

Below is a generalized rule you can drop into a root `AGENTS.md` or a new `.ruler` rule, plus line-count thresholds as a rule of thumb.

---

### Repository-wide file-size and responsibility rule

Scope: all TypeScript/JavaScript files under `src` (routes, hooks, server functions, utilities, db, etc.), excluding config and test fixtures.

```md
# file size and responsibility rules

## core rules

1. One primary unit per file
   - Each file owns **one main thing**:
     - Components: one main component (existing rule).
     - Hooks: one main hook (`useXxx`).
     - Server functions: one main server function or handler group for a single route.
     - Utilities: one cohesive utility topic (e.g. `dateFormat`, `sessionSearch`, `featureFlags`).
     - Schema: one logical schema group (e.g. `session.schema.ts`).
   - Any additional exports must be:
     - Small helpers directly supporting the main unit, or
     - Type-only exports.

2. File-size limits (non-component, general case)
   - Soft target: **150–300 LOC** per file (excluding imports and types).
   - Warning zone: **> 400 LOC** → required refactor before adding new behavior.
   - Hard cap: **600 LOC**. No exceptions; split into smaller files before merging.

3. Split by concern
   - **Stateful logic, effects, orchestration → hooks/logic files**:
     - `FeatureName/FeatureName.hooks.ts`
     - `FeatureName/FeatureName.logic.ts`
   - **Pure data shaping, parsing, formatting → utility files**:
     - `FeatureName/FeatureName.utils.ts`
     - `FeatureName/FeatureName.format.ts`
   - **Types/interfaces/enums shared across files → type files**:
     - `FeatureName/FeatureName.types.ts`
   - **Route/server concerns → route/server files only**:
     - Keep HTTP handling, validation, and side effects here.
     - Push domain logic into shared `*.logic.ts` or `*.utils.ts`.

4. When to split a file (hard triggers, any file type)
   - File > **400 LOC** or diff adds > **80 LOC** to a file already > **300 LOC**.
   - File mixes **two or more** of:
     - Network/server I/O (fetch, db, server functions)
     - Business/domain logic (calculations, rules)
     - UI / presentation (components, JSX, templates)
     - Cross-cutting concerns (logging, metrics, feature flags)
   - File exports **many unrelated things**:
     - More than **5–7 public exports** with different purposes.
     - Utilities that clearly belong to different topics (e.g. date helpers + string helpers).
   - Control flow / branching is hard to scan:
     - Deeply nested conditionals or long switch statements (`> ~100 LOC`) that can be moved into dedicated helpers.

5. Structure conventions by file kind
   - **Hooks**:
     - `FeatureName/FeatureName.hooks.ts` → owns `useFeatureNameXxx` hooks.
     - No JSX, no DOM; only state, effects, and derived data.
   - **Logic / services**:
     - `FeatureName/FeatureName.logic.ts` or `FeatureName/service.ts`.
     - Pure, testable functions; no React imports.
   - **Utilities / formatting**:
     - `FeatureName/FeatureName.utils.ts`, `FeatureName/FeatureName.format.ts`.
     - Pure, side-effect-free; reusable across features.
   - **Types**:
     - `FeatureName/FeatureName.types.ts`.
     - No runtime code.
   - **Server functions / routes**:
     - One route or server function group per file.
     - Validation + wiring here; heavy domain logic pushed into `*.logic.ts`.

6. Review checklist (for any file)
   - [ ] Does this file have **one clearly named primary responsibility**?
   - [ ] Is the file within the **150–300 LOC target** and **< 400 LOC** unless it’s about to be split?
   - [ ] Are stateful logic and side effects separated from pure helpers?
   - [ ] Are different concerns (I/O, domain logic, formatting, UI) split into distinct files?
   - [ ] Are exported functions/types cohesive, or should some move to a `*.utils.ts` / `*.logic.ts` / `*.types.ts` file?
```

---

### Line-count thresholds as a rule of thumb

Use these as mental stop signs across the codebase:

- **Components (existing rule):**

  - Target: **150–250 LOC**
  - Refactor threshold: **> 400 LOC**
  - Hard cap: **600 LOC**

- **Hooks / logic modules:**

  - Target: **150–250 LOC**
  - Start considering a split: **> 300 LOC**
  - Must split before: **> 400 LOC**

- **Utility / formatting modules:**

  - Target: **150–300 LOC**
  - Start considering split: **> 350 LOC** or **> 8–10 exports**
  - Hard cap: **600 LOC**, but only if exports are tightly related.

- **Route / server function files:**

  - Target: **150–300 LOC** for the route file itself.
  - If adding behavior would push it **> 350–400 LOC**, push domain logic into a `*.logic.ts` or `*.service.ts` and keep the route thin.

Operational rule:

- Once any file crosses **~300 LOC** or starts handling **more than one major concern**, treat that as the point to factor logic into `*.hooks.ts`, `*.logic.ts`, `*.utils.ts`, and `*.types.ts` so the main file stays as a thin coordinator.
