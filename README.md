<div align="center">
  <h1>Codex Session Viewer</h1>
  <p><strong>A modern web application for replaying and analyzing interactive user sessions, built on the TanStack ecosystem with React, TypeScript, and shadcn/ui.</strong></p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Playwright E2E](https://github.com/AcidicSoil/codex-session-view/actions/workflows/playwright.yml/badge.svg?branch=main)](https://github.com/AcidicSoil/codex-session-view/actions/workflows/playwright.yml)
  [![PNPM Build](https://github.com/AcidicSoil/codex-session-view/actions/workflows/build.yml/badge.svg)](https://github.com/AcidicSoil/codex-session-view/actions/workflows/build.yml)
  [![pnpm dev (smoke)](https://github.com/AcidicSoil/codex-session-view/actions/workflows/dev.yml/badge.svg?branch=main)](https://github.com/AcidicSoil/codex-session-view/actions/workflows/dev.yml)

</div>

[![LM Studio](https://img.shields.io/badge/LM%20Studio-14151A)](https://lmstudio.ai/)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-1A73E8)](https://github.com/google-gemini/gemini-cli)
[![Codex](https://img.shields.io/badge/Codex-FF6F00)](https://github.com/openai/codex)

---

<p>
<img src="https://github.com/acidicsoil/codex-session-view/raw/HEAD/public/demos/demo.gif" alt="session preview" />
</p>

## Overview

Codex Session Viewer is a sophisticated tool designed for replaying, analyzing, and debugging interactive user sessions. It provides a detailed timeline of events, including user actions, console logs, and network requests, alongside a chat-like interface to inspect conversational context. It's built to help developers and AI engineers understand complex interactions and diagnose issues with precision.

This application serves as an advanced implementation of a modern web app starter kit, showcasing the power of the TanStack ecosystem.

## ✨ Key Features

- **Interactive Session Replay:** Upload and view comprehensive session snapshots to replay user interactions step-by-step.
- **Detailed Timeline View:** Visualize the complete sequence of events in a session, including user inputs, mutations, console logs, and more.
- **Advanced Filtering:** Dynamically filter timeline events by type (e.g., `ACTION`, `MUTATION`, `LOG`) to isolate and analyze specific activities.
- **Repo-aware Session Explorer:** Group sessions by repo + branch metadata, expand/collapse groups locally, and search/size/sort entirely client-side without triggering new discovery.
- **Chat & Discovery:** Analyze conversational AI interactions within the `ChatDock` and explore raw session data through the `DiscoveryPanel`.
- **Data Persistence Control:** Easily toggle session persistence in `localStorage` to save analysis across browser sessions.
- **Modern Tech Stack:** Built with the latest [TanStack ecosystem](https://tanstack.com/) (Start RC1, Router, Query), [React](https://react.dev/), and [TypeScript](https://www.typescriptlang.org/) for a robust, type-safe, and performant experience.
- **Beautiful & Accessible UI:** Crafted with [shadcn/ui](https://ui.shadcn.com/) and [Tailwind CSS v4](https://tailwindcss.com/) for a polished, responsive, and accessible user interface.
- **Enhanced Client-Side Debugging:** Leverages [Browser Echo](https://github.com/instructa/browser-echo) for advanced client-side logging and inspection.

## 🧠 Session Coach

The Session Coach vertical stitches together the chat dock, `/api/chatbot/*` endpoints, and the AGENTS rule engine.

- **Pop-out analysis:** The chat dock now exposes `Summary` and `Commits` pop-outs powered by `POST /api/chatbot/analyze` with `analysisType: "summary" | "commits"`. Summary responses always include the four fixed sections (`## Goals`, `## Main changes`, `## Issues`, `## Follow-ups`) with at least one `-` bullet (using `- None.` as the placeholder). Commit responses return a `commitMessages: string[]` of Conventional Commit subjects ≤72 chars.
- **Misalignment banner + timeline badges:** Open misalignments (status `open`) render in a top-of-view banner and inline timeline badges. Severity colors reuse the shadcn semantic tokens (info → secondary, warning → outline, high → destructive), and overlapping ranges collapse into a single badge with the tooltip template `"{Severity} severity: AGENT-3 “Rule title”, …"`.
- **Remediation metadata:** When a banner or badge is clicked, the chat dock receives a prefilled remediation prompt _plus_ structured metadata (`metadata?: { misalignmentId; ruleId; severity; eventRange }`). The metadata travels to `/api/chatbot/stream` but is not persisted with chat messages.
- **Telemetry:** `/api/chatbot/stream`, `/api/chatbot/analyze`, and misalignment status changes emit unsampled `~/lib/logger` events tagged with `{ mode, sessionId, analysisType?, misalignmentId?, oldStatus?, newStatus?, userId?, durationMs, success }` for staging + prod dashboards.
- **Logging boundaries:** `~/lib/logger` remains an isomorphic facade; server-only file appends live in `src/lib/logger.server.ts`, and browser forwarding uses server functions so Node builtins never ship to the client. Use `pnpm check:client-bundle` to validate bundles.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** (recommended package manager)

### Download

```bash
# Clone the starter template (replace with your repo)
git clone https://github.com/AcidicSoil/codex-session-view.git
cd codex-session-view
```


### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality
pnpm biome:check  # Check code formatting and linting
pnpm biome:fix:unsafe # Fix code issues (unsafe)
```

### Testing

```bash
pnpm test            # Vitest unit test suite
pnpm test:e2e        # Playwright suite against pnpm dev (expects an OpenAI-compatible endpoint such as LM Studio)
pnpm test:e2e:prod   # pnpm build + Playwright against pnpm start -- --prod
pnpm check:client-bundle # Scan built client assets for node: imports
```

Optional Python Playwright smoke check (uses the Codex webapp-testing helper):

```bash
pnpm build
python3 /home/user/.codex/skills/webapp-testing/scripts/with_server.py \
  --server "pnpm start -- --hostname 127.0.0.1 --port 4173" --port 4173 \
  -- python3 e2e/webapp-smoke.py
python3 /home/user/.codex/skills/webapp-testing/scripts/with_server.py \
  --server "pnpm start -- --hostname 127.0.0.1 --port 4173" --port 4173 \
  -- python3 e2e/webapp-logger-smoke.py
```

> The e2e commands inject `AI_SESSION_DEFAULT_MODEL=lmstudio:local-default` and `AI_GENERAL_DEFAULT_MODEL=lmstudio:local-default`. Make sure `AI_LMSTUDIO_BASE_URL` points to a running LM Studio/OpenAI-compatible server before running these suites.

Playwright now boots a single production-equivalent server via `pnpm build && pnpm start` and seeds fixtures through the public APIs:

- `POST /api/uploads` to persist JSONL session fixtures for testing.
- `POST /api/session/repo-context` to bind a session ID to an uploaded asset.
- `POST /api/logs` to append deterministic Browser Echo log entries.
  - Supported Browser Echo log levels: `debug`, `info`, `warn`, `error`.

## 🎯 Core Technologies

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| **TanStack Start RC1** | Full-stack framework | [Docs](https://tanstack.com/start) |
| **shadcn/ui** | Component library | [Docs](https://ui.shadcn.com/) |
| **Tailwind CSS v4** | Styling framework | [Docs](https://tailwindcss.com/) |
| **TypeScript** | Type safety | [Docs](https://typescriptlang.org/) |
| **Browser Echo** | Client-side logging | [Docs](https://github.com/browser-echo/browser-echo) |
| **Unplugin Icons** | Icon optimization | [Docs](https://github.com/antfu/unplugin-icons) |

## 🚀 Deployment

### Local production smoke test

```bash
pnpm run build
pnpm run preview   # or pnpm start to boot the Node server bundle
```

## 📚 Gemini CLI session compatibility

- Upload `.json`/`.jsonl`/`.ndjson` exports from Gemini CLI directly; tool events (`tool_use/tool_result`) map onto the same timeline cards as Codex sessions and share the same timeline filters/badges.
- The viewer automatically scans `~/.gemini/tmp` (when present) alongside `~/.codex/sessions`. Set `GEMINI_SESSION_DIR` to add additional Gemini cache roots (colon-separated); these directories are scoped to `chats/` + `checkpoints/` patterns to avoid unrelated temp files.
- See [`docs/gemini-cli-support.md`](docs/gemini-cli-support.md) for the full ingestion + export details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ using modern React tools</p>
</div>
