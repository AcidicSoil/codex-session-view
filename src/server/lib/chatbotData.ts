import { parseAgentRules, type AgentRule } from '~/lib/agents-rules/parser';
import type { SessionSnapshot } from '~/lib/sessions/model';
import { logWarn } from '~/lib/logger';
import { parseSessionToArrays } from '~/lib/session-parser/streaming';
import { getSessionRepoBinding } from '~/server/persistence/sessionRepoBindings';

interface SnapshotCacheEntry {
  snapshot: SessionSnapshot;
  assetPath: string | null;
  bindingUpdatedAt: number | null;
  source: 'upload' | 'fixture';
}

const cachedSnapshots = new Map<string, SnapshotCacheEntry>();
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

export class SessionSnapshotUnavailableError extends Error {
  code = 'SESSION_SNAPSHOT_UNAVAILABLE' as const;

  constructor(message: string)
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'SessionSnapshotUnavailableError';
  }
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

interface LoadSnapshotOptions {
  requireAsset?: boolean;
}

export async function loadSessionSnapshot(
  sessionId: string,
  options: LoadSnapshotOptions = {}
): Promise<SessionSnapshot> {
  const repoBinding = getSessionRepoBinding(sessionId);
  const desiredAssetPath = repoBinding?.assetPath ?? null;
  const desiredUpdatedAt = repoBinding?.updatedAt ?? null;
  const cacheHit = cachedSnapshots.get(sessionId);
  if (
    cacheHit &&
    cacheHit.assetPath === desiredAssetPath &&
    cacheHit.bindingUpdatedAt === desiredUpdatedAt
  ) {
    return cacheHit.snapshot;
  }

  if (desiredAssetPath) {
    const snapshot = await loadSnapshotFromAssetPath(desiredAssetPath, sessionId);
    if (snapshot) {
      cachedSnapshots.set(sessionId, {
        snapshot,
        assetPath: desiredAssetPath,
        bindingUpdatedAt: desiredUpdatedAt,
        source: 'upload',
      });
      return snapshot;
    }
    if (options.requireAsset) {
      throw new SessionSnapshotUnavailableError(
        `Session ${sessionId} is bound to ${desiredAssetPath} but the upload content is unavailable.`
      );
    }
    logWarn('chatbot.snapshot', 'Falling back to fixture snapshot after upload parse failure', {
      sessionId,
      assetPath: desiredAssetPath,
    });
  } else if (options.requireAsset) {
    throw new SessionSnapshotUnavailableError(
      `Session ${sessionId} is not bound to a repository asset.`
    );
  }

  const fallback = await loadFixtureSnapshot(sessionId);
  cachedSnapshots.set(sessionId, {
    snapshot: fallback,
    assetPath: desiredAssetPath,
    bindingUpdatedAt: desiredUpdatedAt,
    source: 'fixture',
  });
  return fallback;
}

export async function loadSnapshotFromAssetPath(
  assetPath: string,
  sessionId: string
): Promise<SessionSnapshot | null> {
  try {
    const normalized = normalizeAssetName(assetPath);
    const { getSessionUploadContentByOriginalName } = await import(
      '~/server/persistence/sessionUploads'
    );
    const content = getSessionUploadContentByOriginalName(normalized);
    if (!content) {
      return null;
    }
    const blob = new Blob([content], { type: 'application/json' });
    const result = await parseSessionToArrays(blob);
    if (!result.meta || !Array.isArray(result.events)) {
      return null;
    }
    return {
      sessionId,
      meta: result.meta,
      events: result.events,
    };
  } catch (error) {
    logWarn('chatbot.snapshot', 'Failed to load session snapshot from upload', {
      sessionId,
      assetPath,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

export function clearSessionSnapshotCache(sessionId?: string) {
  if (!sessionId) {
    cachedSnapshots.clear();
    return;
  }
  cachedSnapshots.delete(sessionId);
}

async function loadFixtureSnapshot(sessionId: string): Promise<SessionSnapshot> {
  const fixture = await loadBaseSnapshot();
  return {
    sessionId,
    meta: fixture.meta ? { ...fixture.meta } : undefined,
    events: fixture.events.map((event) => ({ ...event })),
  };
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
      const hash = await hashBuffer(buffer);
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
  const hash = await hashBuffer(buffer);
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

async function hashBuffer(buffer: ArrayBuffer | ArrayBufferView): Promise<string> {
  const bytes = normalizeToUint8Array(buffer);
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (cryptoApi?.subtle) {
    const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
    const view = new Uint8Array(digest);
    let hex = '';
    for (let i = 0; i < view.length; i += 1) {
      const value = view[i];
      const nibble = value.toString(16);
      hex += nibble.length === 1 ? `0${nibble}` : nibble;
    }
    return hex;
  }

  // Fallback to a deterministic (non-cryptographic) hash if Web Crypto is unavailable.
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

function normalizeToUint8Array(buffer: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (buffer instanceof Uint8Array) {
    return buffer;
  }
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return new Uint8Array(buffer);
}
