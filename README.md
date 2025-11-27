<div align="center">
  <h1>Codex Session Viewer</h1>
  <p><strong>A modern web application for replaying and analyzing interactive user sessions, built on the TanStack ecosystem with React, TypeScript, and shadcn/ui.</strong></p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![PNPM Build](https://github.com/AcidicSoil/codex-session-view/actions/workflows/build.yml/badge.svg)](https://github.com/AcidicSoil/codex-session-view/actions/workflows/build.yml)
</div>

---

<p>
<img src="https://github.com/acidicsoil/codex-session-view/raw/HEAD/public/README-demo_UI-overhaul.gif" alt="demo-latest-look" />
</p>

<p>
<img src="https://github.com/acidicsoil/codex-session-view/raw/HEAD/public/README-demo_v4.gif" alt="demo-latest-look" />
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
- **Enhanced Client-Side Debugging:** Leverages [Browser Echo](https://github.com/browser-echo/browser-echo) for advanced client-side logging and inspection.

## 🧠 Session Coach

The Session Coach vertical stitches together the chat dock, `/api/chatbot/*` endpoints, and the AGENTS rule engine.

- **Pop-out analysis:** The chat dock now exposes `Summary` and `Commits` pop-outs powered by `POST /api/chatbot/analyze` with `analysisType: "summary" | "commits"`. Summary responses always include the four fixed sections (`## Goals`, `## Main changes`, `## Issues`, `## Follow-ups`) with at least one `-` bullet (using `- None.` as the placeholder). Commit responses return a `commitMessages: string[]` of Conventional Commit subjects ≤72 chars.
- **Misalignment banner + timeline badges:** Open misalignments (status `open`) render in a top-of-view banner and inline timeline badges. Severity colors reuse the shadcn semantic tokens (info → secondary, warning → outline, high → destructive), and overlapping ranges collapse into a single badge with the tooltip template `"{Severity} severity: AGENT-3 “Rule title”, …"`.
- **Remediation metadata:** When a banner or badge is clicked, the chat dock receives a prefilled remediation prompt _plus_ structured metadata (`metadata?: { misalignmentId; ruleId; severity; eventRange }`). The metadata travels to `/api/chatbot/stream` but is not persisted with chat messages.
- **Telemetry:** `/api/chatbot/stream`, `/api/chatbot/analyze`, and misalignment status changes emit unsampled `~/lib/logger` events tagged with `{ mode, sessionId, analysisType?, misalignmentId?, oldStatus?, newStatus?, userId?, durationMs, success }` for staging + prod dashboards.
- **Rollout guardrail:** Session Coach surfaces stay behind `SESSION_COACH_ENABLED`. Before enabling it in production, budget two business days for ops to land the new dashboards/alerts (staging first, prod second) and secure sign-off from the owner of `viewer.loader`/`~/lib/logger`.
- **Rollout guardrail:** Session Coach surfaces stay behind `SESSION_COACH_ENABLED`. Before enabling it in production, budget two business days for ops to land the new dashboards/alerts (staging first, prod second) and secure sign-off from the owner of `viewer.loader`/`~/lib/logger`. See [`docs/ops/session-coach-rollout.md`](docs/ops/session-coach-rollout.md) for the full checklist.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** (recommended package manager)

### Download

```bash
# Clone the starter template (replace with your repo)
npx gitpick git@github.com:instructa/constructa-starter-min.git my-app
cd my-app
```

> **Recommended:** This starter uses [gitpick](https://github.com/nrjdalal/gitpick) for easy cloning without `.git` directory, making it perfect for creating new projects from this template.

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
pnpm test:e2e        # Playwright suite against pnpm dev (uses demo LLM models by default)
pnpm test:e2e:prod   # pnpm build + Playwright against pnpm start -- --prod
```

> The e2e commands inject `AI_SESSION_DEFAULT_MODEL=demo:grounded` and `AI_GENERAL_DEFAULT_MODEL=demo:general` so CI never hits real LLM providers. Override those env vars when you want to exercise OpenAI/Gemini backends locally.

## 📁 Project Structure

```
src/
├── routes/
│   ├── __root.tsx              # Root shell rendered on every page
│   └── (site)/viewer/index.tsx # Viewer route wired to TanStack Start loader/head/search
├── features/
│   └── viewer/                 # viewer.loader.ts, discovery/upload sections, route helpers
├── components/
│   └── viewer/                 # Session explorer, drop zone, chat dock, etc.
├── hooks/                      # useFileLoader, storage helpers
├── lib/                        # parser + repository utilities
└── server/                     # server functions + persistence
```

For loader flow, discovery strategy, and virtualization invariants see [`docs/viewer-architecture.md`](docs/viewer-architecture.md).

## 🎯 Core Technologies

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| **TanStack Start RC1** | Full-stack framework | [Docs](https://tanstack.com/start) |
| **shadcn/ui** | Component library | [Docs](https://ui.shadcn.com/) |
| **Tailwind CSS v4** | Styling framework | [Docs](https://tailwindcss.com/) |
| **TypeScript** | Type safety | [Docs](https://typescriptlang.org/) |
| **Browser Echo** | Client-side logging | [Docs](https://github.com/browser-echo/browser-echo) |
| **Unplugin Icons** | Icon optimization | [Docs](https://github.com/antfu/unplugin-icons) |

## 🔧 Configuration & Technical Notes

Developer-focused details—including session metadata heuristics, shadcn/ui usage, Tailwind configuration, TypeScript aliases, and the timeline virtualization rules—live in [`docs/viewer-architecture.md`](docs/viewer-architecture.md) to keep this README concise.

## 🚀 Deployment

### Build for Production

```bash
pnpm build
```

### Start Production Server

```bash
pnpm start
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ using modern React tools</p>
</div>
