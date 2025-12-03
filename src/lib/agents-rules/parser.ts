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
  source?: string;
}

const HEADING_REGEX = /^(?<hashes>#{1,6})\s+(?<title>.+)$/;
const ARROW_REGEX = /(.+?)\s*(?:→|->)\s*(.+)/;
const COLON_REGEX = /^([^:]+):\s*(.+)/;

export function parseAgentRules(markdown: string): AgentRule[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ heading: string; level: number; lines: string[] }> = [];
  let current: { heading: string; level: number; lines: string[] } | null = null;

  // 1. Group by Headings
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
    if (!current) current = { heading: 'Introduction', level: 1, lines: [] };
    current.lines.push(line);
  }
  if (current) sections.push(current);

  const rules: AgentRule[] = [];
  const seenIds = new Map<string, number>();

  for (const section of sections) {
    // 2. Parse Bullets as potential Sub-Rules
    const bullets = section.lines
      .map((line) => line.trim())
      .filter((line) => /^[-*+]|^\d+\./.test(line))
      .map((line) => line.replace(/^[-*+\d.\s]+/, '').trim());

    const bulletRules: AgentRule[] = [];

    bullets.forEach((bullet, index) => {
      // Strategy: Treat every bullet as a potential rule if it's substantive.
      // We calculate keywords ONLY from the bullet text to avoid "Heading Pollution"
      // (e.g. requiring "Performance" to be in the message just because it's in the "Performance Rules" section)

      let trigger = bullet;
      let summary = bullet;
      let keywordsSource = bullet;

      // Pattern: "Bad Thing -> Good Thing"
      const arrowMatch = bullet.match(ARROW_REGEX);
      if (arrowMatch) {
        trigger = arrowMatch[1];
        summary = `When ${trigger}, use ${arrowMatch[2]}`;
        keywordsSource = trigger;
      } else {
        // Pattern: "Topic: Instruction"
        const colonMatch = bullet.match(COLON_REGEX);
        if (colonMatch && colonMatch[2].length > 10) {
          trigger = colonMatch[1];
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
        keywords: deriveKeywords(keywordsSource, []), // Strict keywords from bullet only
        source: 'bullet',
      });
    });

    // 3. Add the granular bullet rules
    rules.push(...bulletRules);

    // 4. Add the Parent Rule (fallback for general context, or if bullets didn't cover it)
    // We only add the parent if it has content other than the bullets we just parsed.
    const hasNonBulletContent = section.lines.some(
      (l) =>
        !l.trim().startsWith('-') &&
        !l.trim().startsWith('*') &&
        !/^\d+\./.test(l.trim()) &&
        l.trim().length > 0
    );

    if (bulletRules.length === 0 || hasNonBulletContent) {
      const body = section.lines.join('\n').trim();
      // If we exploded the bullets, don't re-include them in the parent's keywords to avoid duplication/dilution
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
          source: 'heading',
        });
      }
    }
  }

  return rules;
}

function deriveSummaryText(lines: string[]): string {
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^[-*+]|^\d+\./.test(line) || line.startsWith('```')) {
      continue;
    }
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
