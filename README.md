<div align="center">
  <h1>Codex Session Viewer</h1>
  <p><strong>A modern web application for replaying and analyzing interactive user sessions, built on the TanStack ecosystem with React, TypeScript, and shadcn/ui.</strong></p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
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


# Codex Session Viewer

A specialized workbench for visualizing, analyzing, and debugging AI coding agent sessions. This tool provides an interactive timeline of execution traces and an integrated "Session Coach" agent that validates behavior against defined project rules. It's built to help developers and AI engineers understand complex interactions and diagnose issues with precision.

## ✨ Key Features

- **Interactive Session Timeline**: Visualize command execution, file edits, tool usage, and agent reasoning in a linear, searchable timeline.
- **AI Session Coach**: A context-aware chatbot that can analyze the current session, explain errors, and suggest remediations.
- **Misalignment Detection**: Automatically detects violations of agent rules (defined in `AGENTS.md`, `.ruler/*.md`, etc.) using regex and keyword matching.
- **Rule Inspector**: Browse and audit the active ruleset derived from your repository's documentation.
- **Local-First Architecture**: Designed to run locally, accessing your project's file system to resolve rules and assets.
- **Search & Filter**: Deep search across session logs, events, and metadata.

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (Server-Side Rendering & Server Functions)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) & [TanStack DB](https://tanstack.com/db) (In-memory/LocalStorage)
- **AI Runtime**: [Vercel AI SDK](https://sdk.vercel.ai/docs)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4
- **Testing**: Vitest & Playwright

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.12
- pnpm >= 10.25.0

### Installation

```bash
pnpm install
```

### Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your AI providers in `.env`. The system supports:
- OpenAI / OpenAI Compatible
- Google Gemini
- Codex CLI
- LM Studio (Local)

### Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000` (or the port shown in your terminal).

### Production Build

```bash
pnpm build
pnpm start
```

## 🏗️ Architecture Overview

The system follows a **Local-First Analysis Workbench** architecture:

*   **Viewer (Client)**: A rich React application that parses session files and renders the visualization. It persists state using `localStorage`.
*   **Analysis Engine (Server)**: A Nitro-based server that handles file uploads (in-memory) and hosts the AI Runtime.
*   **Coach (AI)**: An LLM-based agent that "reads" the session context from the server's memory and applies rules parsed from your local file system.

### Key Directories

- `src/features/viewer`: Core visualization logic and UI components.
- `src/features/chatbot`: AI Coach implementation and misalignment detection.
- `src/server/function`: Server-side RPC functions (TanStack Start).
- `src/server/persistence`: In-memory data collections (`@tanstack/db`).
- `src/lib/agents-rules`: Logic for parsing `AGENTS.md` and other rule files.

## 🧪 Testing

Run unit and integration tests:

```bash
pnpm test
```

Run linting:

```bash
pnpm lint
```

## 📄 License

See [LICENSE](./LICENSE) for details.
