import { nitro } from 'nitro/vite';
import browserEcho from '@browser-echo/vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import Icons from 'unplugin-icons/vite';
import { defineConfig, loadEnv, type ConfigEnv, type PluginOption } from 'vite';
import micromatch from 'micromatch';
import tsConfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

function wasmBinaryShim(): PluginOption {
  const matcher = /\.wasm\?binary$/;
  const shimSource = `throw new Error('WASM binary bundling disabled; runtime fallback will read from disk.');\nexport default new Uint8Array();`;
  return {
    name: 'wasm-binary-shim',
    enforce: 'pre',
    resolveId(source) {
      if (matcher.test(source)) {
        return source;
      }
      return null;
    },
    load(id) {
      if (matcher.test(id)) {
        return shimSource;
      }
      return null;
    },
  };
}

export default ({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return defineConfig({
    resolve: {
      alias: {
        'wsl-utils': path.resolve(process.cwd(), 'src/stubs/wsl-utils.ts'),
        'default-browser': path.resolve(process.cwd(), 'src/stubs/default-browser.ts'),
        'default-browser-id': path.resolve(process.cwd(), 'src/stubs/default-browser-id.ts'),
        open: path.resolve(process.cwd(), 'src/stubs/open.ts'),
        'unicorn-magic': path.resolve(process.cwd(), 'src/stubs/unicorn-magic.ts'),
        'unicorn-magic/default.js': path.resolve(process.cwd(), 'src/stubs/unicorn-magic.ts'),
        'unicorn-magic/default': path.resolve(process.cwd(), 'src/stubs/unicorn-magic.ts'),
      },
    },
    build: {
      rollupOptions: {
        external: [
          'ai-sdk-provider-gemini-cli',
          'ai-sdk-provider-codex-cli',
          '@google/gemini-cli-core',
        ],
      },
    },
    ssr: {
      external: [
        'ai-sdk-provider-gemini-cli',
        'ai-sdk-provider-codex-cli',
        '@google/gemini-cli-core',
        'open',
        'default-browser',
        'default-browser-id',
      ],
    },
    server: {
      port: 3001,
    },
    plugins: [
      nitro(),
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tanstackStart(),
      react(),
      Icons({
        compiler: 'jsx',
        jsx: 'react',
      }),
      browserEcho({
        injectHtml: false,
        include: ['error', 'warn', 'info'],
        stackMode: 'condensed',
        tag: 'tanstack-start',
        showSource: true,
        fileLog: {
          enabled: true,
        },
      }),
      tailwindcss(),
      wasmBinaryShim(),
      {
        name: 'ignore-governance-docs',
        resolveId(source) {
          if (micromatch.isMatch(source, '**/{AGENTS,CLAUDE}.md{,*}')) {
            return { id: source, external: true };
          }
          return null;
        },
        load(id) {
          if (micromatch.isMatch(id, '**/{AGENTS,CLAUDE}.md{,.*}')) {
            return 'export default "";';
          }
          return null;
        },
      },
    ],
    assetsInclude: ['**/*.md'],
    optimizeDeps: {
      exclude: [
        'ai-sdk-provider-gemini-cli',
        'ai-sdk-provider-codex-cli',
        '@google/gemini-cli-core',
      ],
      esbuildOptions: {
        loader: {
          '.md': 'text',
        },
      },
    },
  });
};
