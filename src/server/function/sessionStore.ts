import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const inputSchema = z.object({
  filename: z.string().min(1).max(256),
  content: z.string().min(1),
});

export const persistSessionFile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const [fs, path] = await Promise.all([loadFsModule(), loadPathModule()]);
    const targetDir = path.resolve(getHomeDirectory(), '.codex/sessions/uploads');
    await fs.mkdir(targetDir, { recursive: true });
    const safeName = sanitizeFilename(data.filename, path.basename);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalName = `${timestamp}-${safeName}`;
    const absolutePath = path.resolve(targetDir, finalName);
    await fs.writeFile(absolutePath, data.content, 'utf8');
    return { path: absolutePath };
  });

function getHomeDirectory() {
  return process.env.HOME ?? process.env.USERPROFILE ?? process.cwd();
}

function sanitizeFilename(value: string, basename: (path: string) => string) {
  const name = basename(value).replace(/[^a-z0-9._-]/gi, '-');
  if (!/\.(jsonl|ndjson|json)$/i.test(name)) {
    return `${name}.jsonl`;
  }
  return name;
}

type FsModule = typeof import('node:fs/promises');
type PathModule = typeof import('node:path');

let cachedFsModule: FsModule | null = null;
async function loadFsModule(): Promise<FsModule> {
  if (!cachedFsModule) {
    cachedFsModule = await import('node:fs/promises');
  }
  return cachedFsModule;
}

let cachedPathModule: PathModule | null = null;
async function loadPathModule(): Promise<PathModule> {
  if (!cachedPathModule) {
    cachedPathModule = await import('node:path');
  }
  return cachedPathModule;
}
