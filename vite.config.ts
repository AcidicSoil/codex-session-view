import browserEcho from '@browser-echo/vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import Icons from 'unplugin-icons/vite';
import { defineConfig, loadEnv, type ConfigEnv } from 'vite';
import micromatch from 'micromatch';
import tsConfigPaths from 'vite-tsconfig-paths';

export default ({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return defineConfig({
    server: {
      port: 3000,
    },
    plugins: [
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
      {
        name: 'ignore-governance-docs',
        resolveId(source) {
          if (micromatch.isMatch(source, '**/{AGENTS,CLAUDE}.md{,.*}')) {
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
      esbuildOptions: {
        loader: {
          '.md': 'text',
        },
      },
    },
  });
};
