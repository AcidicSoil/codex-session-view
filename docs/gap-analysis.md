# Product-Parity Gap Analysis: Codex Session Viewer

## A) Snapshot

**Codex Session Viewer** is a local-first analysis workbench for AI coding agent sessions, leveraging the **TanStack** ecosystem (Start, Router, Query, Store) and **Vercel AI SDK**. It operates primarily as a single-user tool that parses local JSON/text logs to provide an interactive timeline and an AI-driven "Session Coach" for debugging. Persistence is ephemeral (in-memory) or strictly local (browser storage/file system via direct read), with no structured backend database for long-term history or multi-user collaboration.

## B) Parity Scorecard

*Comparison Target: Enterprise AI Engineering Platform (e.g., LangSmith, Arize Phoenix, PostHog Session Replay)*

| Feature Category | Current Implementation | Production-Grade Standard | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Data Persistence** | **Ephemeral/Local**<br>`@tanstack/db` (in-memory/localStorage)<br>Direct file parsing | **Structured Database**<br>SQLite (Local) or Postgres (Cloud)<br>Indexed history, full-text search across sessions | **Critical** |
| **Workspace Model** | **Single Session/File**<br>Transient uploads list<br>No "Project" or "Team" grouping | **Multi-Project Workspaces**<br>Group sessions by project/env<br>Saved views/filters per project | **High** |
| **Authentication** | **None (Local-Only)**<br>Implicit trust of local user | **Identity & Access**<br>Local user profiles or Cloud Auth<br>API Keys for ingestion | **Medium** |
| **Security** | **Implicit**<br>Network isolation (localhost)<br>Basic Zod validation | **Defensive**<br>Rate limiting, Input sanitization (XSS/JSON)<br>CSRF protection, CSP headers | **Medium** |
| **Observability** | **Custom Logger**<br>`src/lib/logger.ts` (console/file) | **OpenTelemetry**<br>Structured traces, error tracking (Sentry)<br>Performance metrics | **Low** |
| **AI Integration** | **Vercel AI SDK**<br>Local & Cloud models supported | **Model Agnostic & Evaluations**<br>Eval datasets, Prompt playground<br>Regression testing | **High** |

## C) Flagged Gaps

### 1. Missing Structured Persistence Layer

**Priority:** Critical
**Location:** `src/server/persistence`
**Evidence:** `src/server/persistence/sessionUploads.server.ts` uses `createCollection` with `localOnlyCollectionOptions`. Sessions are lost on server restart or browser clear.
**Rationale:** Professional workbenches require a persistent history of sessions to track improvements over time and enable cross-session search.
**Remediation:** Replace in-memory `@tanstack/db` with a persistent adapter (SQLite via `better-sqlite3` or `libsql`) for the server-side store.

### 2. Lack of Project/Workspace Organization

**Priority:** High
**Location:** `src/features/viewer`
**Evidence:** `src/features/viewer/viewer.workspace.tsx` manages a flat list of `sessionAssets`.
**Rationale:** Users working on multiple distinct AI agents or repositories need to isolate sessions into "Projects" or "Workspaces" to avoid pollution and context switching overhead.
**Remediation:** Introduce a `Project` entity in the schema. Group sessions under projects. Store project-specific settings (rules, api keys).

### 3. Basic Input Security & Sanitization

**Priority:** Medium
**Location:** `src/server/persistence/sessionUploads.server.ts`, `src/features/viewer/viewer.loader.ts`
**Evidence:** File content is read and parsed (`deriveRepoDetailsFromContent`) with regex and simple split.
**Rationale:** Processing untrusted log files (which might contain malicious payloads if shared) requires strict schema validation (Zod) before processing and output encoding to prevent XSS in the viewer.
**Remediation:** Enforce strict Zod schemas for all ingested session files. Sanitize all rendered content in the timeline.

### 4. Limited AI Evaluation & Regression

**Priority:** High
**Location:** `src/features/chatbot`
**Evidence:** `ChatbotDrawer` and `sessionAnalysisAgent` provide ad-hoc feedback.
**Rationale:** To truly "coach" an agent, the tool needs to support "Evaluations"—running the agent against a known dataset and tracking pass/fail rates over time.
**Remediation:** Add an "Evaluations" feature module. Allow defining "Golden Datasets" of inputs and expected outputs.

## D) "Leading Product" Expectations Checklist

**Data & Storage:**

- [ ] Durable Session History (SQLite/Postgres)
- [ ] Full-text Search (Cross-session)
- [ ] Export/Import Standard Formats (JSONL, CSV)

**Workflow:**

- [ ] Project/Workspace Isolation
- [ ] "Saved Views" or filters
- [ ] Deep linking to specific timeline events

**Security & Ops:**

- [ ] API Key Management (for programmatic ingestion)
- [ ] Role-Based Access Control (if multi-user)
- [ ] Audit Logs (who viewed/edited what)

**AI Capabilities:**

- [ ] Prompt Playground (test prompts against history)
- [ ] Dataset Management (eval sets)
- [ ] Cost Tracking (token usage)

## E) Implementation Roadmap

### Phase 0: Foundation (Persistence)

- [ ] Replace `sessionUploads.server.ts` in-memory store with `better-sqlite3`.
- [ ] Define Drizzle or Prisma schema for `Session`, `Event`, and `Analysis`.
- [ ] Implement data migration strategy.

### Phase 1: Structure (Workspaces)

- [ ] Create `Project` CRUD APIs.
- [ ] Update Viewer UI to support Project switching.
- [ ] Scoped settings per project (e.g., custom `AGENTS.md` path).

### Phase 2: Intelligence (Evals)

- [ ] Add "Evaluation" tab to Viewer.
- [ ] Implement "Prompt Playground" using Vercel AI SDK.
- [ ] Allow running specific sessions against defined rulesets for regression testing.

### Phase 3: Enterprise Ready

- [ ] Add basic Auth (e.g., NextAuth/Clerk) for hosted deployments.
- [ ] Add Team/Organization support.
- [ ] Integrate OpenTelemetry for self-monitoring.

## F) Appendix

**Assumptions:**

- The primary use case is currently single-developer local debugging.
- Users have direct access to the file system where the server runs.

**Source Map:**

- **Entry:** `src/entry-client.tsx`, `src/server/index.mjs`
- **Routes:** `src/routes`
- **Persistence:** `src/server/persistence`
- **AI Logic:** `src/server/ai`, `src/features/chatbot`

**External References:**

- **LangSmith Docs:** Concepts of Traces, Runs, and Projects.
- **Arize Phoenix:** Local-first observability patterns.
- **TanStack Start Docs:** Server functions and RPC patterns.
