import type { MisalignmentSeverity } from '~/lib/sessions/model';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

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

interface MdastNode {
  type: string;
  depth?: number;
  value?: string;
  children?: MdastNode[];
}

interface MdastRoot extends MdastNode {
  children: MdastNode[];
}

interface SectionBlock {
  heading: string;
  level: number;
  nodes: MdastNode[];
}

const ARROW_REGEX = /(.+?)\s*(?:→|->)\s*(.+)/;
const COLON_REGEX = /^([^:]+):\s*(.+)/;

/**
 * Parse AGENT rules from markdown.
 *
 * `source` should be the absolute path of the file the markdown came from,
 * e.g. `/home/user/projects/foo/.ruler/components.md`.
 */
export function parseAgentRules(markdown: string, source?: string): AgentRule[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdastRoot;
  const sections = splitSections(tree);

  const rules: AgentRule[] = [];
  const seenIds = new Map<string, number>();

  for (const section of sections) {
    const bullets = extractBullets(section.nodes);

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
    const hasNonBulletContent = hasNonListContent(section.nodes);

    if (bulletRules.length === 0 || hasNonBulletContent) {
      const body = extractPlainText(section.nodes);

      // If we exploded the bullets, don't re-include them in the parent's
      // keywords to avoid dilution; headings alone are enough.
      const keywords = deriveKeywords(section.heading, bulletRules.length > 0 ? [] : bullets);

      if (keywords.length > 0) {
        rules.push({
          id: makeSectionId(section.heading, seenIds),
          heading: section.heading,
          level: section.level,
          summary: deriveSummaryText(section.nodes),
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

function splitSections(root: MdastRoot): SectionBlock[] {
  const sections: SectionBlock[] = [];
  let current: SectionBlock | null = null;

  for (const node of root.children ?? []) {
    if (node.type === 'heading') {
      if (current) sections.push(current);
      current = {
        heading: extractNodeText(node).trim() || 'Untitled',
        level: typeof node.depth === 'number' ? node.depth : 1,
        nodes: [],
      };
      continue;
    }
    if (!current) {
      current = { heading: 'Introduction', level: 1, nodes: [] };
    }
    current.nodes.push(node);
  }

  if (current) sections.push(current);
  return sections;
}

function extractBullets(nodes: MdastNode[]): string[] {
  const bullets: string[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.shift();
    if (!node) continue;
    if (node.type === 'list' && node.children) {
      for (const item of node.children) {
        if (item.type === 'listItem' && item.children) {
          const text = extractNodeText(item).trim();
          if (text) {
            bullets.push(text);
          }
        }
      }
      continue;
    }
    if (node.children) {
      stack.push(...node.children);
    }
  }
  return bullets;
}

function hasNonListContent(nodes: MdastNode[]): boolean {
  for (const node of nodes) {
    if (node.type === 'list') continue;
    const text = extractNodeText(node).trim();
    if (text) return true;
  }
  return false;
}

function extractPlainText(nodes: MdastNode[]): string {
  return nodes.map((node) => extractNodeText(node)).filter(Boolean).join('\n').trim();
}

function extractNodeText(node: MdastNode): string {
  if (!node) return '';
  if (node.type === 'text' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'code' && typeof node.value === 'string') {
    return node.value;
  }
  if (!node.children) return '';
  return node.children.map((child) => extractNodeText(child)).filter(Boolean).join(' ');
}

function deriveSummaryText(nodes: MdastNode[]): string {
  for (const node of nodes) {
    if (node.type === 'paragraph') {
      const text = extractNodeText(node).trim();
      if (text) return text;
    }
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
