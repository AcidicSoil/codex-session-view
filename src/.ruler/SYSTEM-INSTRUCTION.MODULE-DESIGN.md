# MODULE AND FILE DESIGN

---

## SYSTEM INSTRUCTION: MODULE AND FILE DESIGN

You are not allowed to introduce or extend “god modules” (multi-purpose megafiles). Every change must keep code split into small, single-responsibility modules inside clear feature slices.

#### 1. Core rule: one file, one reason to change

When you touch or create a file, it must have exactly one primary responsibility.

The following responsibilities must not coexist in the same file:

* HTTP/transport concerns (routes, request/response)
* Domain logic or business rules
* Integration logic (AI, DB, external APIs, SDKs)
* Complex UI layout or widget implementations
* Large configuration data (prompts, icon maps, class maps)

If a file does more than one of these, split it.

#### 2. Always work inside a feature slice

All code lives inside a feature-oriented directory (vertical slice), not in generic “utils” or giant shared modules.

Examples of slices (names are illustrative):

* `session-analysis`
* `session-coach-chat`
* `session-parser`
* `viewer`
* `timeline`
* `code-block`
* `ui-primitives`

Within each slice, use these internal layers:

* `core/` – types, invariants, and pure functions (no frameworks, no I/O)
* `usecases/` or `services/` – “do X” operations composed from core
* `infra/` or `adapters/` – AI, DB, HTTP clients, logging, SDK wiring
* `http/` – route handlers, validation, HTTP-level error mapping
* `ui/` or `components/` – React components and view models

Do not cross these layers inside a single file.

#### 3. Back-end rules

Route files:

* Only define routes, validate input, call a single usecase, and map errors to HTTP.
* No domain rules, no AI calls, no DB access inside route files.

Usecase/service files:

* A usecase file exports one main function representing a single operation.
* It only depends on `core` logic and abstractions for infra (interfaces), not concrete SDKs.
* No framework or transport imports (`express`, `next`, `remix`, etc.) in usecases.

Infra files:

* Wrap specific providers (AI, DB, external APIs).
* Contain low-level error translation and retry policies.
* Do not contain domain-level branching (e.g., “if summary vs if hook-discovery”) beyond what’s needed to talk to the provider.

Prompts and large config:

* Long AI prompts and configuration blobs must live in their own modules under the feature slice (e.g. `prompts/` or `config/`).
* Runtime logic imports these constants; it never embeds large prompt strings or maps inline.

#### 4. Front-end rules

Page/route components:

* Thin shells: read loader data, set up providers, and compose child components.
* No complex feature logic or massive event orchestration inside pages.

Hooks and state:

* Use dedicated hooks/stores per feature (e.g. `useXxxModel`, `xxx.store.ts`) for complex state and derived calculations.
* Hooks must not render JSX; they compute data and expose callbacks.

UI components:

* A component file is either:

  * A container component (wires hooks/state to child components), or
  * A presentational component (pure props → JSX)
* Do not mix container concerns (data fetching, global coordination) with large presentational trees in the same file if it becomes complex.

Large widgets:

* Complex widgets (date-time input, code block, modal, timeline, inspector) are treated as mini-libraries:

  * `core/` for pure logic and configuration
  * `ui/` for React components
  * `infra/` for DOM-level behavior (e.g., search highlighting, portals), if needed
* Big static maps (icon maps, key bindings) live in separate config files, not inline inside main components.

#### 5. What to do when you touch a large file

If you need to change a file that already violates these rules:

* Do not add new responsibilities to it.
* Extract the new logic into a new file in the appropriate slice/layer, then call it from the old file.
* When practical, opportunistically peel off existing responsibilities into new modules instead of expanding the megafile.

#### 6. Hard constraints

* No new file may exceed a single, clear responsibility.
* No new route file may call AI/DB/SDKs directly; it must call a usecase.
* No new React page or main panel component may contain more than one major feature’s logic; cross-feature coordination must go through shared hooks/stores, not giant all-in-one components.
* Prompts and large data/config are never embedded inline with logic.

This instruction is the first thing to check before writing or modifying any code. If a change would violate any of the rules above, restructure the code and create additional files instead of expanding an existing one.
