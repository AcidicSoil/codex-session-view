## You asked:

what are options for dynamically running llm inference within this parser by giving it a prompt in addition to the parsing heuristics already in place. That way it can handle variability in the differences in potential instruction files ? `https://github.com/AcidicSoil/codex-session-view`

    ts
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
            source,
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
          const keywords = deriveKeywords(
            section.heading,
            bulletRules.length > 0 ? [] : bullets,
          );
    
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
        if (line.startsWith('

')) continue; return line; } return ''; } function inferSeverity(heading: string, body: string): MisalignmentSeverity { const normalized = `${heading}\n${body}`.toLowerCase(); if ( normalized.includes('never') || normalized.includes('do not') || normalized.includes('must not') || normalized.includes('critical') ) { return 'high'; } if ( normalized.includes('avoid') || normalized.includes('should not') || normalized.includes("don't") ) { return 'medium'; } if (normalized.includes('prefers') || normalized.includes('consider')) { return 'low'; } return 'info'; } function deriveKeywords(heading: string, bullets: string\[\]): string\[\] { const IGNORED = new Set(\[ 'the', 'and', 'or', 'for', 'with', 'use', 'using', 'via', 'how', 'when', 'what', 'rules', 'core', 'idioms', 'checklist', 'intro', 'introduction', 'avoid', 'render', 'loop', \]); const source = `${heading} ${bullets.join(' ')}`.toLowerCase(); return Array.from( new Set( source .split(/\[^a-z0-9\]+/) .map((token) => token.trim()) .filter((token) => token.length > 2) .filter((token) => !IGNORED.has(token)), ), ); } function makeSectionId(title: string, seen: Map<string, number>) { const base = title .toLowerCase() .replace(/\[^a-z0-9\]+/g, '-') .replace(/^-+|-+$/g, '') .replace(/-{2,}/g, '-') .replace(/^$/, 'section'); const count = seen.get(base) ?? 0; seen.set(base, count + 1); return count === 0 ? base : `${base}-${count + 1}`; }

---

## ChatGPT Replied:

Thought for 41s

Primary integration axes:

1.  Where to involve the LLM
    
2.  How to pass in a prompt/config
    
3.  How to keep the existing heuristic parser intact
    

Below are concrete options and example shapes.

* * *

### 1\. LLM-first parser (heuristics as a fallback / helper)

Define an async variant that delegates to an LLM which outputs `AgentRule[]` JSON, with your current parser available as a helper if the model fails or needs hints.

    export interface LlmParseOptions {
      source?: string;
      llmPrompt?: string; // repo/user-specific prompt
      // abstract client so you can plug OpenAI, Anthropic, etc.
      llmCall: (input: {
        markdown: string;
        source?: string;
        heuristicRules: AgentRule[];
        prompt?: string;
      }) => Promise<AgentRule[]>;
    }
    
    /**
     * High-level: let LLM own the final AgentRule[] shape.
     * Heuristic parser just provides scaffolding/context.
     */
    export async function parseAgentRulesLlm(
      markdown: string,
      options: LlmParseOptions,
    ): Promise<AgentRule[]> {
      const heuristicRules = parseAgentRules(markdown, options.source);
    
      return options.llmCall({
        markdown,
        source: options.source,
        heuristicRules,
        prompt: options.llmPrompt,
      });
    }
    

Example system/user prompt to feed into `llmCall`:

    System:
    You convert markdown instruction files into a list of AgentRule objects.
    
    Each AgentRule has:
    - id: string (stable slug from heading + index, if possible)
    - heading: string
    - level: number (1–6, derived from markdown structure)
    - summary: one-sentence summary of the rule
    - body: full raw text of the rule
    - bullets: array of bullet items directly under this rule
    - severity: one of "high" | "medium" | "low" | "info"
    - keywords: 3–15 lowercase keywords
    
    You receive:
    1) The original markdown
    2) The heuristic parser's rules (may be incomplete/wrong)
    
    You must return STRICT JSON: AgentRule[].
    Fix missing rules, merge duplicates, normalize severity and keywords.
    
    User:
    <markdown here>
    
    Heuristic rules:
    <json-serialized AgentRule[] here>
    

The model learns how to compensate for differences between `AGENTS.md`, `.ruler/*.md`, and any other future layouts without you changing the heuristics.

* * *

### 2\. Hybrid parser: heuristics for structure, LLM for semantics

Keep `parseAgentRules` as the structural extractor and only use the LLM to:

*   Improve `summary`
    
*   Re-infer `severity`
    
*   Generate `keywords`
    
*   Merge/normalize similar rules
    

Minimal changes: add an optional post-processing pass.

    export interface LlmPostProcessOptions {
      llmPrompt?: string;
      llmCall: (input: {
        rules: AgentRule[];
        markdown: string;
        prompt?: string;
      }) => Promise<AgentRule[]>;
    }
    
    export function parseAgentRules(
      markdown: string,
      source?: string,
    ): AgentRule[] {
      // existing implementation unchanged
      // ...
    }
    
    export async function parseAgentRulesWithLlm(
      markdown: string,
      source: string | undefined,
      options: LlmPostProcessOptions,
    ): Promise<AgentRule[]> {
      const rules = parseAgentRules(markdown, source);
    
      return options.llmCall({
        rules,
        markdown,
        prompt: options.llmPrompt,
      });
    }
    

Example LLM prompt for this mode:

    System:
    You receive:
    - markdown for an instruction file
    - a list of AgentRule objects from a heuristic parser
    
    Your job:
    - Fix incorrect headings/levels if obviously wrong
    - Merge rules that describe the same instruction
    - Improve summary fields to be precise, imperative instructions
    - Recompute severity based on how strict the rule is
    - Add 3–10 high-signal keywords per rule
    
    Output ONLY valid JSON: the corrected AgentRule[].
    

Heuristics keep doing structural work; the LLM picks up variability in phrasing, strictness, and keywording.

* * *

### 3\. Fallback parser: only call LLM on “weird” sections

Add a small confidence check and only hand problematic sections to the LLM. This keeps cost/latency down and preserves determinism on “normal” files.

Define an internal confidence heuristic:

    function sectionLooksWeird(section: {
      heading: string;
      level: number;
      lines: string[];
    }): boolean {
      const content = section.lines.join('\n').trim();
      if (!content) return false;
    
      const hasBullets = section.lines.some((l) => /^[-*+]/.test(l.trim()));
      const hasLongText = content.length > 500;
      const hasFewKeywords = deriveKeywords(section.heading, []).length <= 1;
    
      return (!hasBullets && hasLongText) || hasFewKeywords;
    }
    

Modify the loop to accumulate “unparsed” sections and send them to the LLM:

    export interface LlmSectionParser {
      llmPrompt?: string;
      llmCall: (input: {
        markdown: string;
        sections: Array<{ heading: string; level: number; body: string }>;
        prompt?: string;
      }) => Promise<AgentRule[]>;
    }
    
    export async function parseAgentRulesHybrid(
      markdown: string,
      source: string | undefined,
      llm?: LlmSectionParser,
    ): Promise<AgentRule[]> {
      const lines = markdown.split(/\r?\n/);
      // same sectioning logic…
      const sections: Array<{ heading: string; level: number; lines: string[] }> = [];
      // ...
    
      const rules: AgentRule[] = [];
      const fallbackSections: Array<{ heading: string; level: number; body: string }> = [];
    
      for (const section of sections) {
        const beforeCount = rules.length;
        // existing bullet + parent rule logic, but push into rules
        // ...
    
        const afterCount = rules.length;
        if (afterCount === beforeCount && llm && sectionLooksWeird(section)) {
          fallbackSections.push({
            heading: section.heading,
            level: section.level,
            body: section.lines.join('\n'),
          });
        }
      }
    
      if (llm && fallbackSections.length > 0) {
        const llmRules = await llm.llmCall({
          markdown,
          sections: fallbackSections,
          prompt: llm.llmPrompt,
        });
    
        for (const r of llmRules) {
          r.source ??= source;
        }
    
        rules.push(...llmRules);
      }
    
      return rules;
    }
    

This pattern lets you keep the current deterministic behavior while giving the LLM a “patch” role over sections your heuristic parser can’t confidently handle.

* * *

### 4\. Prompt-configurable behavior via options

Expose a single options object so callers can control the prompt per repo / per instruction style:

    export interface AgentParseRuntimeConfig {
      source?: string;
      mode?: 'heuristic' | 'postprocess' | 'llm-first' | 'hybrid';
      llmPrompt?: string;
      llmCall?: (...args: any[]) => Promise<AgentRule[]>;
    }
    
    export async function parseAgentRulesDynamic(
      markdown: string,
      config: AgentParseRuntimeConfig,
    ): Promise<AgentRule[]> {
      switch (config.mode) {
        case 'heuristic':
          return parseAgentRules(markdown, config.source);
        case 'postprocess':
          return parseAgentRulesWithLlm(markdown, config.source, {
            llmPrompt: config.llmPrompt,
            llmCall: config.llmCall!,
          });
        case 'llm-first':
          return parseAgentRulesLlm(markdown, {
            llmPrompt: config.llmPrompt,
            llmCall: config.llmCall!,
            source: config.source,
          });
        case 'hybrid':
        default:
          return parseAgentRulesHybrid(markdown, config.source, {
            llmPrompt: config.llmPrompt,
            llmCall: config.llmCall!,
          });
      }
    }
    

This gives you a single entry point and lets the caller supply the “prompt + LLM behavior” at runtime while your existing parser remains the stable structural baseline.

---

## You asked:

does this take advantage of llm structured output ?

---

## ChatGPT Replied:

Thought for 28s

No. The code you posted and the patterns I described are LLM-agnostic; they don’t themselves invoke or enforce structured output. They just assume an `llmCall` that returns `AgentRule[]`.

To actually take advantage of structured output, the structured-JSON contract has to live inside your `llmCall` implementation. The parser surface stays almost identical; only `llmCall` is responsible for:

1.  Declaring the schema for `AgentRule[]`
    
2.  Calling the model with that schema / tool definition
    
3.  Returning the parsed `AgentRule[]`
    

Example shape, leaving the provider-specific bits abstract:

    // keep your domain model
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
    
    // this is the hook that *uses* structured output
    export const llmCall: LlmParseOptions['llmCall'] = async ({
      markdown,
      source,
      heuristicRules,
      prompt,
    }) => {
      const system = `
    You convert markdown instruction files into an array of AgentRule objects.
    
    AgentRule:
    - id: string
    - heading: string
    - level: integer 1-6
    - summary: string
    - body: string
    - bullets: string[]
    - severity: "high" | "medium" | "low" | "info"
    - keywords: string[]
    - source: string | null
    Return ONLY JSON matching AgentRule[].
      `.trim();
    
      const user = JSON.stringify({
        markdown,
        source: source ?? null,
        heuristicRules,
        extraPrompt: prompt ?? null,
      });
    
      // PSEUDOCODE: plug in your provider's structured-output mode here.
      // For example: JSON schema / tool calling / "response_format: json" etc.
      const raw = await someLlmClient.call({
        system,
        user,
        // e.g. response_format / tools / json_schema – provider-specific
      });
    
      // If your client already parses structured output, this might be typed.
      // Otherwise, parse + validate against your TS/Zod schema.
      const parsed = JSON.parse(raw) as AgentRule[];
    
      // optional: enforce invariants locally
      parsed.forEach((r) => {
        if (!r.source && source) r.source = source;
      });
    
      return parsed;
    };
    

Then the earlier functions:

    export async function parseAgentRulesLlm(
      markdown: string,
      options: LlmParseOptions,
    ): Promise<AgentRule[]> {
      const heuristicRules = parseAgentRules(markdown, options.source);
    
      return options.llmCall({
        markdown,
        source: options.source,
        heuristicRules,
        prompt: options.llmPrompt,
      });
    }
    

All structured-output awareness is concentrated in `llmCall`. The parser’s public API stays simple and typed (`Promise<AgentRule[]>`), while whichever LLM backend you use can be swapped or upgraded without touching the parsing heuristics.

---

## You asked:

nestedAgentsExampleTanstack.md

File

here's a great example for you to work with designing the optimal extraction. Just mirror what these are doing but in a scalable extensible fashion. but instead of hard coding tanstack anywhere have it as a type of context it can call upon if dealing with tanstack and so on, there should be a library of tech stacks but the structures should be relatively the same right ?

---

## ChatGPT Replied:

Thought for 1m 15s

Yes. The structures are close enough that you can generalize them.

Design an extraction pipeline with three layers:

1.  Structural parser (what you already have)
    
2.  Tech-stack context tagging (TanStack, Next.js, etc.)
    
3.  Optional LLM refinement, using structured output, that consumes both 1 and 2
    

Below is a concrete design with types and example code.

* * *

### 1\. Keep `AgentRule` but add stack/context metadata

Extend your model; do not bake TanStack into parsing logic.

    export type TechStackId = string; // e.g. 'tanstack-start', 'nextjs', 'remix'
    
    export type RuleCategory =
      | 'core'
      | 'mappingTable'
      | 'idioms'
      | 'decisionChecklist'
      | 'apiPatterns'
      | 'hydration'
      | 'projectConstraints'
      | 'docs'
      | 'other';
    
    export interface RuleContext {
      stackId: TechStackId;
      areaId?: string;      // e.g. 'routing', 'query', 'server-functions', 'db-schema'
      category?: RuleCategory;
    }
    
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
    
      // new:
      contexts?: RuleContext[];
    }
    

Your existing `parseAgentRules(markdown, source)` stays as the structural extractor.

* * *

### 2\. Define a tech-stack library (config, not code branches)

Introduce a registry describing stacks and their internal “areas”. TanStack is just one entry.

    export interface StackAreaDefinition {
      id: string;                    // 'routing', 'query', 'server-functions', 'db-schema', ...
      displayName: string;
      matchHeadings?: RegExp[];
      matchPaths?: RegExp[];
    }
    
    export interface TechStackDefinition {
      id: TechStackId;
      displayName: string;
      priority: number;              // tie-break for overlapping stacks
    
      // markers used for detection
      markers: {
        packageNames?: string[];     // '@tanstack/react-router', 'next', 'expo', ...
        headingContains?: string[];  // 'TanStack Query Rules', 'Server Routes', ...
        filePathIncludes?: string[]; // 'tanstack', 'src/routes/AGENTS.md', ...
        regexes?: RegExp[];
      };
    
      areas?: StackAreaDefinition[];
    }
    
    export const TECH_STACKS: TechStackDefinition[] = [
      // tanstack entry as data, not special-cased logic
      {
        id: 'tanstack-start',
        displayName: 'TanStack Start / Router / Query',
        priority: 100,
        markers: {
          packageNames: [
            '@tanstack/react-router',
            '@tanstack/react-start',
            '@tanstack/react-query',
            '@tanstack/start-static-server-functions',
          ],
          headingContains: [
            'TanStack Query Rules',
            'TanStack Start basics',
            'Server Routes — TanStack Start',
            'TanStack Server Functions',
          ],
          filePathIncludes: [
            'tanstack-environment-server-client-only-rules',
            'tanstack-query-rules',
            'tanstack-server-routes',
            'tanstack-server-fn',
            'db.schema',
          ],
        },
        areas: [
          {
            id: 'effects-core',
            displayName: "Don't fetch or derive app state in useEffect",
            matchHeadings: [/don't fetch or derive app state in useeffect/i, /core rules/i],
            matchPaths: [/\.ruler\/AGENTS\.md$/i],
          },
          {
            id: 'query',
            displayName: 'TanStack Query Rules',
            matchHeadings: [/tanstack query rules/i],
            matchPaths: [/tanstack-query-rules/i],
          },
          {
            id: 'routing',
            displayName: 'Server Routes',
            matchHeadings: [/server routes/i],
            matchPaths: [/tanstack-server-routes/i],
          },
          {
            id: 'server-functions',
            displayName: 'Server Functions',
            matchHeadings: [/tanstack server functions/i],
            matchPaths: [/tanstack-server-fn/i],
          },
          {
            id: 'db-schema',
            displayName: 'DB Schema',
            matchPaths: [/db\.schema/i],
          },
        ],
      },
    
      // add 'nextjs', 'remix', 'react-native', etc. with analogous markers/areas
    ];
    

The example file you gave clearly maps into these areas:

*   Root `.ruler/AGENTS.md` → “effects-core” area with core rules, idioms, decision checklist, etc. nestedAgentsExampleTanstack
    
*   `src/AGENTS.md` → environment & client-only rules + “TanStack Query Rules” area. nestedAgentsExampleTanstack
    
*   `src/routes/AGENTS.md` → routing/server routes area. nestedAgentsExampleTanstack
    
*   `src/server/function/AGENTS.md` → server-functions area. nestedAgentsExampleTanstack
    

You don’t hard-code any of that in the parser; it lives entirely in this `TECH_STACKS` config.

* * *

### 3\. Generic context tagging from library (no TanStack branches)

Add a pass that takes rules + `TECH_STACKS` and attaches contexts based on score.

    import micromatch from 'micromatch';
    
    interface ContextConfig {
      stacks: TechStackDefinition[];
    }
    
    export function tagRuleContexts(
      rule: AgentRule,
      config: ContextConfig,
    ): RuleContext[] {
      const contexts: RuleContext[] = [];
      const text = `${rule.heading}\n${rule.body}`.toLowerCase();
      const path = rule.source ?? '';
    
      for (const stack of config.stacks) {
        let score = 0;
    
        // filePathIncludes
        for (const inc of stack.markers.filePathIncludes ?? []) {
          if (path.includes(inc)) score += 4;
        }
    
        // headingContains
        for (const h of stack.markers.headingContains ?? []) {
          if (rule.heading.toLowerCase().includes(h.toLowerCase())) score += 5;
        }
    
        // packageNames
        for (const pkg of stack.markers.packageNames ?? []) {
          if (text.includes(pkg.toLowerCase())) score += 3;
        }
    
        // regexes
        for (const re of stack.markers.regexes ?? []) {
          if (re.test(text) || re.test(path)) score += 2;
        }
    
        if (score === 0) continue;
    
        // choose area (if any)
        let areaId: string | undefined;
        for (const area of stack.areas ?? []) {
          const pathMatch =
            area.matchPaths?.some((re) => re.test(path)) ?? false;
          const headingMatch =
            area.matchHeadings?.some((re) => re.test(rule.heading)) ?? false;
          if (pathMatch || headingMatch) {
            areaId = area.id;
            break;
          }
        }
    
        contexts.push({
          stackId: stack.id,
          areaId,
        });
      }
    
      // sort by stack priority / score if you want to keep top N
      return contexts;
    }
    

Then wire it into your parser:

    export function parseAgentRulesWithContexts(
      markdown: string,
      source: string | undefined,
      config: ContextConfig,
    ): AgentRule[] {
      const rules = parseAgentRules(markdown, source);
    
      return rules.map((r) => ({
        ...r,
        contexts: tagRuleContexts(r, config),
      }));
    }
    

At this point you have:

*   Same heuristic extraction as before
    
*   Each rule now annotated with zero or more `(stackId, areaId)` contexts
    
*   No TanStack-specific branching anywhere in the parser
    

* * *

### 4\. Build nested “agents” from contexts and paths

To mirror how your example is organized (root rules + nested per-area agents), introduce an `Agent` abstraction that groups rules.

    export interface Agent {
      id: string;
      title: string;
      stackId?: TechStackId;
      areaId?: string;     // optional focus
      sourceGroup?: string; // e.g. 'root', 'src/routes', 'src/server/function'
      rules: AgentRule[];
    }
    
    function makeAgentId(stackId?: string, areaId?: string, sourceGroup?: string) {
      const parts = [stackId, areaId, sourceGroup].filter(Boolean);
      return parts.join(':') || 'default';
    }
    
    function groupSource(path?: string): string {
      if (!path) return 'unknown';
      if (path.includes('/routes/')) return 'routes';
      if (path.includes('/db/schema/')) return 'db-schema';
      if (path.includes('/server/function/')) return 'server-functions';
      if (path.endsWith('/AGENTS.md')) return 'root';
      return 'other';
    }
    
    export function buildAgentsFromRules(rules: AgentRule[]): Agent[] {
      const buckets = new Map<string, Agent>();
    
      for (const rule of rules) {
        const sourceGroup = groupSource(rule.source);
        const contexts = rule.contexts?.length ? rule.contexts : [ { stackId: 'generic' as TechStackId } ];
    
        for (const ctx of contexts) {
          const id = makeAgentId(ctx.stackId, ctx.areaId, sourceGroup);
          if (!buckets.has(id)) {
            buckets.set(id, {
              id,
              title: [
                ctx.stackId,
                ctx.areaId,
                sourceGroup !== 'other' ? sourceGroup : undefined,
              ]
                .filter(Boolean)
                .join(' / '),
              stackId: ctx.stackId,
              areaId: ctx.areaId,
              sourceGroup,
              rules: [],
            });
          }
          buckets.get(id)!.rules.push(rule);
        }
      }
    
      return Array.from(buckets.values());
    }
    

Running this over the TanStack example yields agents like:

*   `tanstack-start:effects-core:root` – global “don’t fetch in useEffect” rules nestedAgentsExampleTanstack
    
*   `tanstack-start:query:root` or `:src` – “TanStack Query Rules” block nestedAgentsExampleTanstack
    
*   `tanstack-start:routing:routes` – “Server Routes — TanStack Start” agent nestedAgentsExampleTanstack
    
*   `tanstack-start:server-functions:server-functions` – “TanStack Server Functions” agent nestedAgentsExampleTanstack
    
*   A generic “project constraints” agent if you later add that as its own category/area.
    

Same machinery works for other stacks: add entries to `TECH_STACKS`, no parser changes.

* * *

### 5\. Optional LLM layer using structured output

You can now bolt on an LLM that:

*   Rewrites `summary`
    
*   Normalizes `severity`
    
*   Refines `contexts` (stackId/areaId/category) using the `TECH_STACKS` registry
    
*   Groups rules into agents if desired
    

Structured output lives _entirely_ inside this call.

    export interface LlmNormalizeOptions {
      llmCall: (input: {
        rules: AgentRule[];
        stacks: TechStackDefinition[];
      }) => Promise<AgentRule[]>;
    }
    
    export async function normalizeRulesWithLlm(
      rules: AgentRule[],
      stacks: TechStackDefinition[],
      opts: LlmNormalizeOptions,
    ): Promise<AgentRule[]> {
      return opts.llmCall({ rules, stacks });
    }
    

Example (provider-agnostic) system/user prompt:

    System:
    You receive:
    - A list of AgentRule objects parsed from markdown.
    - A registry of tech stacks, each with id, displayName, markers, and areas.
    
    For each AgentRule:
    - Improve "summary" to be a single clear imperative instruction.
    - Optionally adjust "severity" to one of "high" | "medium" | "low" | "info".
    - Compute "contexts": a list of { stackId, areaId?, category? }.
      * stackId MUST be one of the known tech stack ids (or "generic" if none).
      * areaId MUST be one of that stack's area ids if applicable.
      * category is a high-level bucket like "core", "idioms", "decisionChecklist", etc.
    
    Return ONLY valid JSON: AgentRule[] with updated properties.
    

Use your provider’s structured-output / JSON-schema mode to enforce the shape.

* * *

### 6\. End-to-end API

Final public function tying it together:

    export interface ExtractOptions {
      sourcePath?: string;
      stacks?: TechStackDefinition[];
      llmNormalize?: LlmNormalizeOptions;
    }
    
    export async function extractAgentsFromMarkdown(
      markdown: string,
      options: ExtractOptions = {},
    ): Promise<Agent[]> {
      const stacks = options.stacks ?? TECH_STACKS;
    
      // 1. Heuristic parse
      let rules = parseAgentRules(markdown, options.sourcePath);
    
      // 2. Attach stack/area contexts from config
      rules = rules.map((r) => ({
        ...r,
        contexts: tagRuleContexts(r, { stacks }),
      }));
    
      // 3. Optional LLM normalization
      if (options.llmNormalize) {
        rules = await normalizeRulesWithLlm(rules, stacks, options.llmNormalize);
      }
    
      // 4. Group into agents (nested agent abstraction)
      return buildAgentsFromRules(rules);
    }
    

You now “mirror what these TanStack AGENTS files are doing” in a generic way:

*   Same structural shape: core rules, idioms, decision checklists, specialized modules, per-directory agents.
    
*   No hard-coded TanStack logic in the parser; only in the `TECH_STACKS` registry.
    
*   Adding a new stack is adding a new config entry, not changing the extraction code.

---

