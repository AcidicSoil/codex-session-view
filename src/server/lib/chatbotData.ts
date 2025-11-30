import { parseAgentRules, type AgentRule } from '~/lib/agents-rules/parser';
import type { SessionSnapshot } from '~/lib/sessions/model';

let cachedSnapshot: SessionSnapshot | null = null;
let cachedRules: AgentRule[] | null = null;

export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  if (cachedSnapshot) {
    return { ...cachedSnapshot, sessionId };
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
  cachedSnapshot = {
    sessionId,
    meta: parsed.meta,
    events: parsed.events,
  };
  return cachedSnapshot;
}

export async function loadAgentRules() {
  if (cachedRules) {
    return cachedRules;
  }

  const fs = await import('node:fs/promises');
  const { default: fg } = await import('fast-glob');

  // Define patterns to find instruction files across the project
  const patterns = [
    '**/.ruler/*.md', // Standard ruler definition files
    '**/.cursor/rules/*.md', // Cursor-specific rule definitions
    '**/AGENTS.md', // Nested agent instruction files
    'docs/agents/**/*.md', // Dedicated documentation folder for agents
  ];

  // Scan the project root, excluding noise
  const files = await fg(patterns, {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/tests/fixtures/**'],
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

  cachedRules = nestedRules.flat();

  if (process.env.NODE_ENV === 'development') {
    console.info(
      `[Chatbot] Loaded ${cachedRules.length} agent rules from ${files.length} sources.`
    );
  }

  return cachedRules;
}
