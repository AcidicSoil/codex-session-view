import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

function resolveServerModules(): Plugin {
  return {
    name: 'vitest-server-module-resolver',
    enforce: 'pre',
    resolveId(source) {
      if (!source.startsWith('~/server/')) return null;
      const relative = source.slice('~/'.length);
      const base = path.resolve(process.cwd(), 'src', relative);
      const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.server.ts`,
        `${base}.server.tsx`,
        `${base}.client.ts`,
        `${base}.client.tsx`,
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(process.cwd(), 'src'),
    },
  },
  plugins: [
    resolveServerModules(),
    tsconfigPaths({
      projects: ['./tsconfig.json'],
    }),
    react(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.tsx',
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'playwright/**', 'playwright.config.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
