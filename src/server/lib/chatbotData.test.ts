import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';

import {
  checkDuplicateInstructionFile,
  clearAgentRulesCache,
  loadAgentRules,
} from '~/server/lib/chatbotData.server';

describe('loadAgentRules content hashing', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agent-rules-'));
    await mkdir(join(tempDir, 'docs/agents'), { recursive: true });
  });

  afterEach(async () => {
    clearAgentRulesCache();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('deduplicates identical instruction files and exposes duplicate checks', async () => {
    const canonicalPath = join(tempDir, 'AGENTS.md');
    const duplicatePath = join(tempDir, 'docs/agents/shared-copy.md');
    const uniquePath = join(tempDir, 'docs/agents/unique.md');

    const sharedContent = `# Shared guidance\n- Always document intent thoroughly.`;
    const uniqueContent = `# Unique guidance\n- Prefer TypeScript for shared components.`;

    await writeFile(canonicalPath, sharedContent, 'utf8');
    await writeFile(duplicatePath, sharedContent, 'utf8');
    await writeFile(uniquePath, uniqueContent, 'utf8');

    const rules = await loadAgentRules(tempDir);
    expect(rules).toHaveLength(2);

    const duplicateCheck = await checkDuplicateInstructionFile({ rootDir: tempDir, filePath: duplicatePath });
    expect(duplicateCheck.isDuplicate).toBe(true);
    expect(duplicateCheck.existingPath).toBe(canonicalPath);

    const canonicalCheck = await checkDuplicateInstructionFile({ rootDir: tempDir, filePath: canonicalPath });
    expect(canonicalCheck.isDuplicate).toBe(false);

    const newUniquePath = join(tempDir, 'docs/agents/brand-new.md');
    await writeFile(newUniquePath, '# Brand New\n- Keep refreshing rules.', 'utf8');
    const uniqueCheck = await checkDuplicateInstructionFile({ rootDir: tempDir, filePath: newUniquePath });
    expect(uniqueCheck.isDuplicate).toBe(false);
  });
});
