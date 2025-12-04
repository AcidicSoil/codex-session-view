import type { MisalignmentSeverity } from '~/lib/sessions/model';

export interface AgentRule {
  id: string;
  heading: string;
  level: number;
  summary: string;
  body: string;
  bullets: string[];
  severity: MisalignmentSeverity;
  keywords: string[];
  /**
   * Absolute path to the instruction file (AGENTS.md, .ruler/*.md, etc.)
   * that this rule was parsed from.
   */
  source?: string;
}

const HEADING_REGEX = /^(?<hashes>#{1,6})\s+(?<title>.+)$/;
const ARROW_REGEX = /(.+?)\s*(?:→|->)\s*(.+)/;
const COLON_REGEX = /^([^:]+):\s*(.+)/;

/**
 * Parse AGENT rules from markdown.
 *
 * `source` should be the absolute path of the file the markdown came from,
 * e.g. `/home/user/projects/foo/.ruler/components.md`.
 */
export function parseAgentRules(markdown: string, source?: string): AgentRule[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ heading: string; level: number; lines: string[] }> = [];
  let current: { heading: string; level: number; lines: string[] } | null = null;

  // 1. Group by headings
  for (const line of lines) {
    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      if (current) sections.push(current);
      current = {
        heading: headingMatch.groups?.title?.trim() ?? 'Untitled',
        level: headingMatch.groups?.hashes?.length ?? 1,
        lines: [],
      };
      continue;
    }
    if (!current) {
      current = { heading: 'Introduction', level: 1, lines: [] };
    }
    current.lines.push(line);
  }
  if (current) sections.push(current);

  const rules: AgentRule[] = [];
  const seenIds = new Map<string, number>();

  for (const section of sections) {
    // 2. Parse bullets as potential sub-rules
    const bullets = section.lines
      .map((line) => line.trim())
      .filter((line) => /^[-*+]/.test(line) || /^\d+\./.test(line))
      .map((line) => line.replace(/^[-*+\d.\s]+/, '').trim());

    const bulletRules: AgentRule[] = [];

    bullets.forEach((bullet, index) => {
      const ruleSource = source ?? 'bullet';
      // Treat each substantive bullet as a rule.
      // Keywords come only from the bullet text to avoid "heading pollution".
      let trigger = bullet;
      let summary = bullet;
      let keywordsSource = bullet;

      // Pattern: "Bad thing -> Good thing"
      const arrowMatch = bullet.match(ARROW_REGEX);
      if (arrowMatch) {
        trigger = arrowMatch[1].trim();
        summary = `When ${trigger}, use ${arrowMatch[2].trim()}`;
        keywordsSource = trigger;
      } else {
        // Pattern: "Topic: Instruction"
        const colonMatch = bullet.match(COLON_REGEX);
        if (colonMatch && colonMatch[2].trim().length > 10) {
          trigger = colonMatch[1].trim();
          summary = bullet;
          keywordsSource = trigger;
        }
      }

      // Filter out tiny/empty bullets
      if (keywordsSource.length < 5) return;

      bulletRules.push({
        id: makeSectionId(`${section.heading}-item-${index}`, seenIds),
        heading: `${section.heading}: ${trigger}`,
        level: section.level + 1,
        summary,
        body: bullet,
        bullets: [],
        severity: inferSeverity(section.heading, bullet),
        keywords: deriveKeywords(keywordsSource, []), // strict keywords from bullet only
        source: ruleSource,
      });
    });

    // 3. Add the granular bullet rules
    rules.push(...bulletRules);

    // 4. Optionally add the parent rule
    // We only add the parent if there is content beyond the bullets we just parsed.
    const hasNonBulletContent = section.lines.some((raw) => {
      const l = raw.trim();
      if (!l) return false;
      if (/^[-*+]/.test(l)) return false;
      if (/^\d+\./.test(l)) return false;
      return true;
    });

    if (bulletRules.length === 0 || hasNonBulletContent) {
      const body = section.lines.join('\n').trim();

      // If we exploded the bullets, don't re-include them in the parent's
      // keywords to avoid dilution; headings alone are enough.
      const keywords = deriveKeywords(section.heading, bulletRules.length > 0 ? [] : bullets);

      if (keywords.length > 0) {
        rules.push({
          id: makeSectionId(section.heading, seenIds),
          heading: section.heading,
          level: section.level,
          summary: deriveSummaryText(section.lines),
          body,
          bullets,
          severity: inferSeverity(section.heading, body),
          keywords,
          source,
        });
      }
    }
  }

  return rules;
}

function deriveSummaryText(lines: string[]): string {
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[-*+]/.test(line)) continue;
    if (/^\d+\./.test(line)) continue;
    if (line.startsWith('```')) continue;
    return line;
  }
  return '';
}

function inferSeverity(heading: string, body: string): MisalignmentSeverity {
  const normalized = `${heading}\n${body}`.toLowerCase();

  if (
    normalized.includes('never') ||
    normalized.includes('do not') ||
    normalized.includes('must not') ||
    normalized.includes('critical')
  ) {
    return 'high';
  }

  if (
    normalized.includes('avoid') ||
    normalized.includes('should not') ||
    normalized.includes("don't")
  ) {
    return 'medium';
  }

  if (normalized.includes('prefers') || normalized.includes('consider')) {
    return 'low';
  }

  return 'info';
}

function deriveKeywords(heading: string, bullets: string[]): string[] {
  const IGNORED = new Set([
    'the',
    'and',
    'or',
    'for',
    'with',
    'use',
    'using',
    'via',
    'how',
    'when',
    'what',
    'rules',
    'core',
    'idioms',
    'checklist',
    'intro',
    'introduction',
    'avoid',
    'render',
    'loop',
  ]);

  const source = `${heading} ${bullets.join(' ')}`.toLowerCase();

  return Array.from(
    new Set(
      source
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2)
        .filter((token) => !IGNORED.has(token))
    )
  );
}

function makeSectionId(title: string, seen: Map<string, number>) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^$/, 'section');

  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);

  return count === 0 ? base : `${base}-${count + 1}`;
}
