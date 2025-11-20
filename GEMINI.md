# Project Overview

This is a modern web application starter kit built with a focus on the TanStack ecosystem, leveraging the power of React, and designed for a great developer experience with TypeScript.

The project uses `TanStack Start` as a full-stack React framework, with file-based routing provided by `TanStack Router`. The UI is built with `shadcn/ui` components and styled with `Tailwind CSS`. For data fetching and state management, it relies on `TanStack Query`. Client-side logging and debugging are enhanced with `Browser Echo`.

The development environment is powered by `Vite`, and the project includes configurations for testing with `Vitest` and `Playwright`.

## Building and Running

### Prerequisites

*   **Node.js**: Version 18 or higher.
*   **pnpm**: Recommended package manager.

### Installation

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

### Development

To start the development server, run:

```bash
pnpm dev
```

### Building for Production

To create a production build, run:

```bash
pnpm build
```

### Running in Production

To start the production server after building, run:

```bash
pnpm start
```

### Testing

The project is set up with `Vitest` for unit and integration testing, and `Playwright` for end-to-end testing.

*   **Run all tests:**
    ```bash
    pnpm test
    ```
*   **Run end-to-end tests:**
    ```bash
    pnpm test:e2e
    ```
*   **Run end-to-end tests with UI:**
    ```bash
    pnpm test:e2e:ui
    ```

## Development Conventions

### Code Style and Linting

This project uses `oxlint` for linting.

*   **Check for issues:**
    ```bash
    pnpm lint
    ```
*   **Fix issues:**
    ```bash
    pnpm lint:fix
    ```

### Routing

*   Routing is handled by `TanStack Router` using a file-based system.
*   Route files are located in `src/routes`.
*   The root layout is defined in `src/routes/__root.tsx`.

### UI Components

*   UI components are built using `shadcn/ui`.
*   Custom components are located in `src/components/ui`.
*   New `shadcn/ui` components can be added using the CLI:
    ```bash
    npx shadcn-cli@latest add [component-name]
    ```

### Icons

Icons are managed with `unplugin-icons`, which allows for automatic loading and optimization.

### Environment Variables

Environment variables are managed using `@t3-oss/env-core`, with separate configurations for client and server environments in `src/env/`.
