import { parseAgentRules, type AgentRule } from '~/lib/agents-rules/parser';
import type { SessionSnapshot } from '~/lib/sessions/model';

const cachedSnapshots = new Map<string, SessionSnapshot>();
let baseSnapshot: Omit<SessionSnapshot, 'sessionId'> | null = null;
const rulesCache = new Map<string, AgentRule[]>();

async function loadBaseSnapshot(): Promise<Omit<SessionSnapshot, 'sessionId'>> {
  if (baseSnapshot) {
    return baseSnapshot;
  }
  const fs = await import('node:fs/promises');
  // Fallback to fixture if no live session is loaded yet, or implement live loading here if needed.
  // Currently keeping fixture logic as base implementation.
  const url = new URL('../../../tests/fixtures/session-large.json', import.meta.url);
  const file = await fs.readFile(url, 'utf8');
  const parsed = JSON.parse(file) as {
    meta: SessionSnapshot['meta'];
    events: SessionSnapshot['events'];
  };
  baseSnapshot = {
    meta: parsed.meta,
    events: parsed.events,
  };
  return baseSnapshot;
}

export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  const cached = cachedSnapshots.get(sessionId);
  if (cached) {
    return cached;
  }
  const fixture = await loadBaseSnapshot();
  const snapshot: SessionSnapshot = {
    sessionId,
    meta: fixture.meta ? { ...fixture.meta } : undefined,
    events: fixture.events.map((event) => ({ ...event })),
  };
  cachedSnapshots.set(sessionId, snapshot);
  return snapshot;
}

export async function loadAgentRules(rootDir: string = process.cwd()) {
  const normalizedRoot = normalizeRoot(rootDir);
  const cached = rulesCache.get(normalizedRoot);
  if (cached) {
    return cached;
  }

  const fs = await import('node:fs/promises');
  const { default: fg } = await import('fast-glob');

  const patterns = [
    '**/CLAUDE.md',
    '**/.ruler/*.md',
    '**/.cursor/rules/*.md',
    '**/AGENTS.md',
    'docs/agents/**/*.md',
  ];

  const files = await fg(patterns, {
    cwd: normalizedRoot,
    ignore: ['**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/tests/fixtures/**'],
    absolute: true,
  });

  const nestedRules = await Promise.all(
    files.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        return parseAgentRules(content);
      } catch (error) {
        console.warn(`[Chatbot] Failed to parse agent rules from ${filePath}:`, error);
        return [];
      }
    })
  );

  const flattened = nestedRules.flat();
  rulesCache.set(normalizedRoot, flattened);

  if (process.env.NODE_ENV === 'development') {
    console.info(
      `[Chatbot] Loaded ${flattened.length} agent rules from ${files.length} sources in ${normalizedRoot}.`
    );
  }

  return flattened;
}

export function clearAgentRulesCache(rootDir?: string) {
  if (!rootDir) {
    rulesCache.clear();
    return;
  }
  rulesCache.delete(normalizeRoot(rootDir));
}

function normalizeRoot(rootDir: string) {
  return rootDir.replace(/\\/g, '/').replace(/\/+$/, '');
}
