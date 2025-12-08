import { createHash } from 'node:crypto';
import { parseAgentRules, type AgentRule } from '~/lib/agents-rules/parser';
import type { SessionSnapshot } from '~/lib/sessions/model';

const cachedSnapshots = new Map<string, SessionSnapshot>();
let baseSnapshot: Omit<SessionSnapshot, 'sessionId'> | null = null;
const rulesCache = new Map<string, AgentRule[]>();
const instructionHashIndexes = new Map<string, InstructionHashIndex>();

interface InstructionHashRecord {
  hash: string;
  canonicalPath: string;
  rules: AgentRule[];
  size: number;
  paths: Set<string>;
}

interface InstructionHashIndex {
  byHash: Map<string, InstructionHashRecord>;
}

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
  const hashIndex = createInstructionHashIndex();
  instructionHashIndexes.set(normalizedRoot, hashIndex);

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

  const flattened: AgentRule[] = [];
  let uniqueFileCount = 0;
  let duplicateFileCount = 0;

  for (const filePath of files) {
    try {
      const buffer = await fs.readFile(filePath);
      const hash = hashBuffer(buffer);
      const existing = hashIndex.byHash.get(hash);
      if (existing) {
        existing.paths.add(filePath);
        duplicateFileCount += 1;
        continue;
      }

      const content = buffer.toString('utf8');
      const rules = parseAgentRules(content, filePath);
      hashIndex.byHash.set(hash, {
        hash,
        canonicalPath: filePath,
        rules,
        size: buffer.byteLength,
        paths: new Set([filePath]),
      });
      flattened.push(...rules);
      uniqueFileCount += 1;
    } catch (error) {
      console.warn(`[Chatbot] Failed to parse agent rules from ${filePath}:`, error);
    }
  }

  rulesCache.set(normalizedRoot, flattened);

  if (process.env.NODE_ENV === 'development') {
    const duplicateMessage = duplicateFileCount
      ? ` (${duplicateFileCount} duplicates skipped)`
      : '';
    console.info(
      `[Chatbot] Loaded ${flattened.length} agent rules from ${uniqueFileCount} unique instruction files${duplicateMessage} in ${normalizedRoot}.`
    );
  }

  return flattened;
}

export function clearAgentRulesCache(rootDir?: string) {
  if (!rootDir) {
    rulesCache.clear();
    instructionHashIndexes.clear();
    return;
  }
  const normalized = normalizeRoot(rootDir);
  rulesCache.delete(normalized);
  instructionHashIndexes.delete(normalized);
}

export interface InstructionDuplicateCheckOptions {
  rootDir?: string;
  filePath: string;
}

export interface InstructionDuplicateCheckResult {
  hash: string;
  isDuplicate: boolean;
  existingPath?: string;
}

export async function checkDuplicateInstructionFile({
  rootDir = process.cwd(),
  filePath,
}: InstructionDuplicateCheckOptions): Promise<InstructionDuplicateCheckResult> {
  const normalizedRoot = normalizeRoot(rootDir);
  let hashIndex = instructionHashIndexes.get(normalizedRoot);
  if (!hashIndex) {
    await loadAgentRules(rootDir);
    hashIndex = instructionHashIndexes.get(normalizedRoot);
  }
  if (!hashIndex) {
    hashIndex = createInstructionHashIndex();
    instructionHashIndexes.set(normalizedRoot, hashIndex);
  }

  const fs = await import('node:fs/promises');
  const buffer = await fs.readFile(filePath);
  const hash = hashBuffer(buffer);
  const existing = hashIndex.byHash.get(hash);
  if (existing) {
    const isCanonical = existing.canonicalPath === filePath;
    return {
      hash,
      isDuplicate: !isCanonical,
      existingPath: isCanonical ? undefined : existing.canonicalPath,
    };
  }
  return {
    hash,
    isDuplicate: false,
  };
}

function normalizeRoot(rootDir: string) {
  return rootDir.replace(/\\/g, '/').replace(/\/+$/, '');
}

function createInstructionHashIndex(): InstructionHashIndex {
  return {
    byHash: new Map(),
  };
}

function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}
