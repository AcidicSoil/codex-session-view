import { defineNitroConfig } from 'nitropack';

const deployTarget = process.env.DEPLOY_TARGET?.toLowerCase();
const isVercel = process.env.VERCEL === '1' || deployTarget === 'vercel';

export default defineNitroConfig({
  preset: isVercel ? 'vercel' : 'node-server',
});
