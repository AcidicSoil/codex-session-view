#!/usr/bin/env node
import { spawn } from 'node:child_process';

const env = { ...process.env, DEPLOY_TARGET: process.env.DEPLOY_TARGET ?? 'vercel' };

async function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env,
      ...options,
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log('🏗️  Building Nitro output with DEPLOY_TARGET=vercel...');
  await run('pnpm', ['run', 'build']);
  console.log('\n🚀 Launching Vercel dev server...');
  await run('pnpm', ['dlx', 'vercel', 'dev']);
}

main().catch((error) => {
  if (error.code === 'ENOENT') {
    console.error('\nVercel CLI is required. Install it via `pnpm add -g vercel` or log in when prompted.');
  }
  console.error(error.message ?? error);
  process.exit(1);
});
